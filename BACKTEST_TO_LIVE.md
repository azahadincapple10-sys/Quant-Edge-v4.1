# Backtest to Live Trading: Integration Guide

## Overview

The Quant-Edge system enables seamless deployment of backtested strategies to live trading. This document explains how the backtest results are transformed into live trading bots with equity curve continuity.

## The Backtest-to-Live Flow

```
1. Run Backtest
   └─> Generate trades + metrics

2. Extract Results
   └─> Convert to EquityCurvePoint[]

3. Deploy Bot
   └─> POST /api/live/deploy-from-backtest

4. Initialize Monitoring
   └─> LiveBotMonitor starts with backtest data

5. Real-time Updates
   └─> New equity curve points appended to backtest history
   └─> Creates performance continuity chart
```

## Key Concept: Equity Curve Continuity

The equity curve shows the strategy's performance journey:

```
Backtest Phase             Live Trading Phase
──────────────            ──────────────────
     │
    10000 ──────────...─────────────┬─── 10500
     │                              │
    9500                           │
     │                              │
    9000                           │
     │                              │
    Timestamp              Deployment Point
                              (Now)

The curve should be continuous at deployment,
showing the natural progression from backtest
to live execution.
```

## Data Structures

### EquityCurvePoint

Represents a single measurement of account equity:

```typescript
interface EquityCurvePoint {
  timestamp: number        // Unix milliseconds
  equity: number          // Total account value
  cash: number            // Uninvested cash
  drawdown: number        // Current drawdown percentage
  dailyPL: number         // Daily profit/loss
}
```

### Backtest Trade

Trade data from backtest execution:

```typescript
interface BacktestTrade {
  entryTime: string       // ISO 8601 timestamp
  exitTime?: string       // ISO 8601 timestamp (or null if open)
  entryPrice: number      // Entry price
  exitPrice?: number      // Exit price
  quantity: number        // Trade quantity
  profit: number          // Trade P&L in dollars
  side: 'long' | 'short'  // Trade direction
  duration: number        // Milliseconds held
  commission: number      // Trading fees
}
```

### Deployment Payload

Complete data for deploying a backtest:

```typescript
{
  botId: string,                    // Unique identifier
  strategy: string,                 // Strategy name
  exchange: 'alpaca' | 'binance',  // Target exchange
  mode: 'PAPER' | 'LIVE',          // Trading mode
  
  // Exchange credentials
  alpacaKeyId?: string,
  alpacaSecretKey?: string,
  binanceApiKey?: string,
  binanceApiSecret?: string,
  
  // Backtest data
  backtestMetrics: {
    totalTrades: number,
    winRate: number,          // 0.0 to 1.0
    sharpeRatio: number,
    maxDrawdown: number,      // Percentage
    returns: number,          // Percentage
    profitFactor: number,
    calmarRatio: number
  },
  
  backtestTrades: BacktestTrade[],  // All trades
  
  initialCapital: number    // Starting amount
}
```

## Equity Curve Reconstruction Algorithm

The system reconstructs the equity curve from backtest trades:

```typescript
function generateEquityCurveFromBacktest(
  trades: BacktestTrade[],
  initialCapital: number,
  strategy: string
): EquityCurvePoint[] {
  
  // Start with initial capital
  let currentEquity = initialCapital
  let peakEquity = initialCapital
  const equityCurve: EquityCurvePoint[] = []
  
  // Sort trades chronologically
  const sorted = trades.sort((a, b) => 
    new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime()
  )
  
  // Process each trade
  sorted.forEach(trade => {
    // Add trade profit to equity
    currentEquity += trade.profit
    
    // Track peak for drawdown calculation
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity
    }
    
    // Calculate drawdown
    const drawdown = ((peakEquity - currentEquity) / peakEquity) * 100
    
    // Record point
    equityCurve.push({
      timestamp: new Date(trade.exitTime || trade.entryTime).getTime(),
      equity: currentEquity,
      cash: currentEquity,  // Simplified: assume all in equity
      drawdown: drawdown,
      dailyPL: trade.profit
    })
  })
  
  return equityCurve
}
```

## Integration with LiveBotMonitor

Once deployed, the `LiveBotMonitor` class initializes with the backtest equity curve:

```typescript
// Constructor initialization
constructor(
  botId: string,
  trading: TradingService,
  strategy: string,
  mode: 'PAPER' | 'LIVE' = 'PAPER',
  equityCurveData?: EquityCurvePoint[]  // ← Backtest data
) {
  this.botId = botId
  this.trading = trading
  this.strategy = strategy
  this.mode = mode
  this.startTime = Date.now()
  
  // Initialize with historical equity curve
  if (equityCurveData && equityCurveData.length > 0) {
    this.equityCurveHistory = [...equityCurveData]
    
    // Set peak and last equity for continuity
    const lastPoint = equityCurveData[equityCurveData.length - 1]
    this.lastEquity = lastPoint.equity
    this.peakEquity = Math.max(...equityCurveData.map(p => p.equity))
  }
}
```

## Real-time Update Flow

After deployment, the bot begins live trading and appends new equity points:

```typescript
// Every 5 seconds
async updateMetrics() {
  try {
    const account = await this.trading.getAccount()
    const positions = await this.trading.getPositions()
    const orders = await this.trading.getOrders()
    
    // Add new equity point
    const drawdown = this.peakEquity > 0 ? 
      ((this.peakEquity - account.equity) / this.peakEquity) * 100 : 0
    
    this.equityCurveHistory.push({
      timestamp: Date.now(),
      equity: account.equity,
      cash: account.cash,
      drawdown: drawdown,
      dailyPL: account.dayPL
    })
    
    // Keep last 1000 points
    if (this.equityCurveHistory.length > 1000) {
      this.equityCurveHistory = this.equityCurveHistory.slice(-1000)
    }
  } catch (error) {
    console.error(`Error updating metrics for bot ${this.botId}:`, error)
  }
}
```

## Example: Complete Deployment

### Step 1: Run Backtest and Get Results

```python
# Jesse backtest (python)
jesse.backtest(
  start_date='2024-01-01',
  end_date='2024-12-31',
  strategy='rsi_strategy'
)

# Returns metrics like:
{
  'total_trades': 45,
  'win_rate': 0.58,
  'sharpe_ratio': 1.85,
  'max_drawdown': 12.5,
  'return': 28.3,
  'trades': [
    {
      'entry_price': 150.25,
      'exit_price': 152.50,
      'quantity': 100,
      'entry_time': '2024-01-15 10:30:00',
      'exit_time': '2024-01-15 14:45:00',
      'profit': 225.00,
      'side': 'long'
    },
    // ... more trades
  ]
}
```

### Step 2: Transform to Deployment Format

```typescript
const backtestResult = {
  strategy: 'rsi_strategy',
  totalTrades: 45,
  winRate: 0.58,
  sharpeRatio: 1.85,
  maxDrawdown: 12.5,
  returns: 28.3,
  trades: [
    {
      entryTime: '2024-01-15T10:30:00Z',
      exitTime: '2024-01-15T14:45:00Z',
      entryPrice: 150.25,
      exitPrice: 152.50,
      quantity: 100,
      profit: 225.00,
      side: 'long',
      duration: 15 * 60 * 1000,
      commission: 0
    },
    // ... transform all trades
  ]
}
```

### Step 3: Deploy Bot

```typescript
const response = await fetch('/api/live/deploy-from-backtest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    botId: 'bot-rsi-2024-01-16',
    strategy: 'rsi_strategy',
    exchange: 'alpaca',
    mode: 'PAPER',
    alpacaKeyId: process.env.ALPACA_KEY_ID,
    alpacaSecretKey: process.env.ALPACA_SECRET_KEY,
    backtestMetrics: {
      totalTrades: 45,
      winRate: 0.58,
      sharpeRatio: 1.85,
      maxDrawdown: 12.5,
      returns: 28.3,
      profitFactor: 2.1,
      calmarRatio: 2.26
    },
    backtestTrades: backtestResult.trades,
    initialCapital: 10000
  })
})

const { bot } = await response.json()
console.log('Bot deployed:', bot.botId)
```

### Step 4: Monitor Equity Curve

The LiveBotMonitor component now shows the merged curve:

```
Backtest equity curve (past):  ████░░░░░░░░ (historical data)
Live equity updates (now):     ░░░░░░░░░░░░░░░░░░ (appended continuously)

Total view: Complete performance from backtest inception
            through live trading execution
```

## Benefits of Backtest-to-Live

1. **Performance Continuity**: See if live results match backtest predictions
2. **Confidence Building**: Validate strategy before scaling capital
3. **Metrics Consistency**: Use same performance metrics for comparison
4. **Equity Preservation**: Start live trading from backtest ending point
5. **Risk Assessment**: Compare live vs backtest drawdowns in real-time

## Important Considerations

### Slippage & Commissions

Backtests often use:
- Simple exit price (limit order filled)
- Zero or minimal commissions

Live trading may experience:
- Actual slippage on market orders
- Real trading commissions
- Bid-ask spread impact

**Result**: Live equity curve may diverge below backtest prediction.

### Market Conditions

Backtests:
- Use historical price data (known outcome)
- Perfect execution assumptions
- No market impact

Live trading:
- Real market conditions (unknown)
- Order execution delays
- Price movement during execution

**Result**: Strategy performance may differ from backtest.

### Time-Zone Handling

Ensure all timestamps use consistent UTC:
- Backtest: All times in UTC
- Live trading: API responses in UTC
- Frontend: Convert to user timezone for display

### Equity Curve Gaps

If live updates are delayed:
- Last backtest point: 12:00:00 UTC, $10,285
- First live point: 12:05:30 UTC, $10,290 (5+ min gap)

The system handles this gracefully with proper timestamp tracking.

## Monitoring Dashboard Integration

The `LiveBotMonitor` component displays both periods:

```
Portfolio Block:
├─ Equity: $10,285 (includes backtest + live gains)
├─ Day P&L: $285 (since bot start)
└─ Buying Power: $25,000

Equity Curve Chart:
├─ X-axis: Time (continuous from backtest start)
├─ Y-axis: Equity value
├─ Backtest region: Faded background
├─ Live region: Bright colored curve
└─ Deployment point: Vertical marker line

Performance Metrics:
├─ Based on combined history
├─ Sharpe ratio: Calculated across all data
├─ Max drawdown: From backtest peak
└─ Win rate: From backtest trades + live orders
```

## Troubleshooting Backtested Bots

**Q: Live equity is lower than backtest ending point**
- Check for trading commissions
- Verify initial capital was correctly set
- Look for slippage on orders

**Q: Equity curve shows gap at deployment**
- Verify backtest end timestamp
- Check first live update timestamp
- Confirm timestamps are in UTC

**Q: Metrics don't match backtest**
- Live trading includes only new trades
- Historical metrics are static from backtest
- Drawdown calculated from deployment point

**Q: Bot status shows "STOPPED" after deploy**
- Check API credentials
- Verify exchange connection
- Review server logs for errors

---

For deployment code examples, see [LIVE_TRADING_GUIDE.md](./LIVE_TRADING_GUIDE.md)

For backtest execution, see [Backend Integration Guide](./docs/backend.json)
