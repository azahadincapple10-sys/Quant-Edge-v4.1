import { NextRequest, NextResponse } from 'next/server';
import { TradingService, TradeConfig } from '@/services/trading-service';
import { botManager } from '@/services/live-bot-monitor';

/**
 * POST /api/live/register-trade - Register a manual trade as a bot for tracking
 * This allows users placing direct trades to see them tracked in the Active Bots panel
 */
export async function POST(request: NextRequest) {
  try {
    const {
      orderId,
      symbol,
      quantity,
      side,
      exchange,
      mode,
      alpacaKeyId,
      alpacaSecretKey,
      binanceApiKey,
      binanceApiSecret,
    } = await request.json();

    // Validate required fields
    if (!orderId || !symbol || !exchange || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, symbol, exchange, mode' },
        { status: 400 }
      );
    }

    // Create a bot ID from the order + symbol + timestamp
    const botId = `trade-${exchange}-${symbol}-${orderId}`;

    // Check if bot already exists
    if (botManager.getBot(botId)) {
      return NextResponse.json(
        { error: `Trade ${botId} already being tracked` },
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

    // Register bot for this trade
    // Strategy is "Manual: SYMBOL SIDE"
    const strategy = `Manual: ${symbol} ${side?.toUpperCase() || 'TRADE'}`;
    const bot = botManager.registerBot(
      botId,
      trading,
      strategy,
      mode as 'PAPER' | 'LIVE'
    );

    // Start the bot to begin tracking
    await bot.start();

    const status = await bot.getStatus();

    return NextResponse.json({
      success: true,
      message: `Trade registered for tracking: ${botId}`,
      bot: status,
    });
  } catch (error: any) {
    console.error('Error registering trade:', error);
    return NextResponse.json(
      { error: 'Failed to register trade', details: error.message },
      { status: 500 }
    );
  }
}
