import { NextRequest, NextResponse } from 'next/server';
import { TradingService } from '@/services/trading-service';
import { BotManager, EquityCurvePoint } from '@/services/live-bot-monitor';

const botManager = new BotManager();

/**
 * POST /api/live/deploy-from-backtest
 * Deploy a backtest as a live trading bot with equity curve visualization
 */
export async function POST(request: NextRequest) {
  try {
    const {
      botId,
      strategy,
      exchange,
      mode,
      alpacaKeyId,
      alpacaSecretKey,
      binanceApiKey,
      binanceApiSecret,
      backtestMetrics,
      backtestTrades,
      initialCapital,
    } = await request.json();

    // Validate inputs
    if (!botId || !strategy || !exchange || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields: botId, strategy, exchange, mode' },
        { status: 400 }
      );
    }

    // Check if bot already exists
    if (botManager.getBot(botId)) {
      return NextResponse.json(
        { error: `Bot ${botId} already exists. Stop it first.` },
        { status: 409 }
      );
    }

    // Generate equity curve from backtest trades
    const equityCurveData = generateEquityCurveFromBacktest(
      backtestTrades,
      initialCapital,
      strategy
    );

    // Create trading config
    const tradeConfig = {
      exchange: exchange as 'alpaca' | 'binance',
      alpacaKeyId,
      alpacaSecretKey,
      alpacaPaper: mode === 'PAPER',
      binanceApiKey,
      binanceApiSecret,
    };

    // Create trading service
    const trading = new TradingService(tradeConfig);

    // Test connection before deploying
    try {
      const account = await trading.getAccount();
      if (!account) {
        return NextResponse.json(
          { error: 'Unable to connect to trading exchange' },
          { status: 503 }
        );
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: `Connection test failed: ${error.message}` },
        { status: 503 }
      );
    }

    // Register and start bot
    const bot = botManager.registerBot(
      botId,
      trading,
      strategy,
      mode as 'PAPER' | 'LIVE',
      equityCurveData
    );

    await bot.start();

    const status = await bot.getStatus();

    return NextResponse.json({
      success: true,
      message: `Live bot deployed successfully from ${strategy} backtest`,
      bot: {
        ...status,
        backtestMetrics: {
          ...backtestMetrics,
          equityCurveGraph: equityCurveData.slice(0, 50), // Return subset for dashboard
        },
      },
      deployment: {
        timestamp: new Date().toISOString(),
        mode,
        exchange,
        initialEquity: initialCapital,
      },
    });
  } catch (error: any) {
    console.error('Backtest deployment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to deploy backtest as live bot',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Generate equity curve from backtest trades
 */
function generateEquityCurveFromBacktest(
  trades: any[],
  initialCapital: number,
  strategy: string
): EquityCurvePoint[] {
  if (!trades || trades.length === 0) {
    // Return empty curve if no trades
    return [{
      timestamp: Date.now(),
      equity: initialCapital,
      cash: initialCapital,
      drawdown: 0,
      dailyPL: 0,
    }];
  }

  const equityCurve: EquityCurvePoint[] = [];
  let currentEquity = initialCapital;
  let peakEquity = initialCapital;
  let previousEquity = initialCapital;

  // Sort trades by entry time
  const sortedTrades = [...trades].sort((a, b) => {
    const timeA = new Date(a.entryTime || a.timestamp || 0).getTime();
    const timeB = new Date(b.entryTime || b.timestamp || 0).getTime();
    return timeA - timeB;
  });

  // Calculate equity curve from trades
  sortedTrades.forEach((trade, index) => {
    const tradeProfit = trade.profit || 0;
    currentEquity = previousEquity + tradeProfit;
    
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }

    const drawdown = peakEquity > 0 
      ? ((peakEquity - currentEquity) / peakEquity) * 100 
      : 0;

    const timestamp = new Date(trade.entryTime || trade.timestamp || Date.now()).getTime();

    equityCurve.push({
      timestamp,
      equity: Math.max(currentEquity, 0),
      cash: currentEquity - (previousEquity - currentEquity),
      drawdown,
      dailyPL: currentEquity - previousEquity,
    });

    previousEquity = currentEquity;
  });

  // Add current point to the curve
  if (equityCurve.length > 0) {
    equityCurve.push({
      timestamp: Date.now(),
      equity: currentEquity,
      cash: currentEquity,
      drawdown: peakEquity > 0 
        ? ((peakEquity - currentEquity) / peakEquity) * 100 
        : 0,
      dailyPL: currentEquity - (equityCurve[equityCurve.length - 1]?.equity || initialCapital),
    });
  }

  return equityCurve;
}

/**
 * GET /api/live/deploy-from-backtest
 * Get list of available strategies to deploy
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Use POST to deploy a backtest as a live bot',
      requiredFields: {
        botId: 'Unique bot identifier',
        strategy: 'Strategy name from backtest',
        exchange: 'alpaca or binance',
        mode: 'PAPER or LIVE',
        backtestMetrics: 'Metrics from backtest result',
        backtestTrades: 'Array of trades from backtest',
        initialCapital: 'Starting capital for live trading',
      },
      exchanges: {
        alpaca: {
          description: 'Alpaca Markets (stocks, options, crypto)',
          modes: ['PAPER', 'LIVE'],
          requiredAuth: ['alpacaKeyId', 'alpacaSecretKey'],
        },
        binance: {
          description: 'Binance (crypto)',
          modes: ['PAPER'],
          requiredAuth: ['binanceApiKey', 'binanceApiSecret'],
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
