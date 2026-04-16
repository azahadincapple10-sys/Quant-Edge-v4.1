import { NextRequest, NextResponse } from 'next/server';
import { TradingService, TradeConfig } from '@/services/trading-service';
import { BotManager, LiveBotMonitor, EquityCurvePoint } from '@/services/live-bot-monitor';

/**
 * Global bot manager instance
 */
const botManager = new BotManager();

/**
 * GET /api/live/bots - List all running bots
 */
export async function GET(request: NextRequest) {
  try {
    const bots = Array.from(botManager.getAllBots().entries());
    
    const botStatuses = await Promise.all(
      bots.map(async ([botId, bot]) => {
        return {
          botId,
          ...await bot.getStatus(),
        };
      })
    );

    return NextResponse.json({
      success: true,
      bots: botStatuses,
      count: bots.length,
    });
  } catch (error: any) {
    console.error('Error listing bots:', error);
    return NextResponse.json(
      { error: 'Failed to list bots', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/live/bots - Deploy a new live bot from backtest
 */
export async function POST(request: NextRequest) {
  try {
    const {
      action,
      botId,
      strategy,
      exchange,
      mode,
      alpacaKeyId,
      alpacaSecretKey,
      binanceApiKey,
      binanceApiSecret,
      equityCurveData,
      metrics,
    } = await request.json();

    if (action === 'deploy') {
      // Validate required fields
      if (!botId || !strategy || !exchange || !mode) {
        return NextResponse.json(
          { error: 'Missing required fields: botId, strategy, exchange, mode' },
          { status: 400 }
        );
      }

      // Check if bot already exists
      if (botManager.getBot(botId)) {
        return NextResponse.json(
          { error: `Bot ${botId} already exists` },
          { status: 409 }
        );
      }

      // Create trading service
      const tradeConfig: TradeConfig = {
        exchange: exchange as 'alpaca' | 'binance',
        alpacaKeyId,
        alpacaSecretKey,
        alpacaPaper: mode === 'PAPER',
        binanceApiKey,
        binanceApiSecret,
      };

      const trading = new TradingService(tradeConfig);

      // Register bot with optional equity curve data from backtest
      const bot = botManager.registerBot(
        botId,
        trading,
        strategy,
        mode as 'PAPER' | 'LIVE',
        equityCurveData as EquityCurvePoint[] | undefined
      );

      // Start the bot
      await bot.start();

      const status = await bot.getStatus();

      return NextResponse.json({
        success: true,
        message: `Bot ${botId} deployed successfully`,
        bot: status,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error deploying bot:', error);
    return NextResponse.json(
      { error: 'Failed to deploy bot', details: error.message },
      { status: 500 }
    );
  }
}
