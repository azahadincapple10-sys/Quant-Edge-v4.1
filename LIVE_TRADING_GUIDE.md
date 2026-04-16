# Live Trading System Documentation

## Overview

The Quant-Edge Live Trading System provides real-time monitoring and execution of trading strategies across multiple exchanges (Alpaca and Binance). It includes:

- **Real-time Bot Monitoring**: Live equity curves, performance metrics, and position tracking
- **Multi-Exchange Support**: Alpaca (stocks/options/crypto) and Binance (crypto) integration
- **Paper & Live Trading**: Support for both paper trading (to test) and live trading
- **Backtest-to-Live Deployment**: Seamlessly deploy backtest results as live trading bots
- **Comprehensive Dashboard**: React components for bot monitoring with real-time updates

## Architecture

### Components

#### 1. **LiveBotMonitor Service** (`src/services/live-bot-monitor.ts`)

The core service that monitors a single bot's performance:

```typescript
class LiveBotMonitor {
  // Tracks equity curves, trades, metrics, and health
  // Updates every 5 seconds via automatic polling
  // Provides real-time metrics (Sharpe, Drawdown, Win Rate, etc.)
}

class BotManager {
  // Manages multiple bot instances
  // Singleton pattern for global access
  // registerBot(), getBot(), getAllBots(), removeBot()
}
```

**Key Features:**
- Automatic equity curve tracking from backtest data
- Real-time metrics calculation (Sharpe, Sortino, Calmar ratios)
- Health check monitoring (API latency, data feed status)
- Trade history and position tracking

#### 2. **TradingService** (`src/services/trading-service.ts`)

Abstracts trading across exchanges:

```typescript
class TradingService {
  // Unified interface for Alpaca and Binance
  async getAccount(): Promise<Account>
  async getPositions(): Promise<Position[]>
  async placeOrder(params): Promise<Trade>
  async closePosition(symbol): Promise<Trade>
  async getOrders(): Promise<Trade[]>
}
```

**Supported Exchanges:**
- **Alpaca**: Paper and live trading for stocks, options, crypto
- **Binance**: Simulated paper trading for crypto

#### 3. **API Routes** (`src/app/api/live/*`)

RESTful API for bot management:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/live/bots` | GET | List all active bots |
| `/api/live/bots` | POST | Deploy a new bot |
| `/api/live/bots/[botId]` | GET | Get bot status and metrics |
| `/api/live/bots/[botId]` | PUT | Control bot (pause/resume/stop) |
| `/api/live/deploy-from-backtest` | POST | Deploy backtest as live bot |

#### 4. **React Components**

**LiveBotMonitor** (`src/components/LiveBotMonitor.tsx`)
- Real-time bot dashboard with tabs for Overview, Positions, Health
- Equity curve visualization using Recharts
- Portfolio metrics and active positions display
- System health indicators

**ActiveBotsPanel** (`src/components/ActiveBotsPanel.tsx`)
- Widget showing all active trading bots
- Quick performance metrics
- Links to detailed bot dashboards

### Data Flow

```
Backtest Results
    ↓
Deploy API (POST /api/live/deploy-from-backtest)
    ↓
BotManager.registerBot()
    ↓
LiveBotMonitor.start()
    ↓
Updates every 5 seconds:
  - Fetch account balance
  - Fetch open positions
  - Fetch recent orders
  - Update equity curve
  - Calculate metrics
    ↓
API Response (GET /api/live/bots/[botId])
    ↓
React Component Updates
    ↓
Dashboard Display
```

## Usage Guide

### 1. Deploy a Bot from Backtest

```typescript
// POST /api/live/deploy-from-backtest
const response = await fetch('/api/live/deploy-from-backtest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    botId: 'bot-123',
    strategy: 'rsi_strategy',
    exchange: 'alpaca',           // or 'binance'
    mode: 'PAPER',                // or 'LIVE'
    alpacaKeyId: 'your-key-id',
    alpacaSecretKey: 'your-secret',
    backtestMetrics: {
      totalTrades: 45,
      winRate: 0.58,
      sharpeRatio: 1.85,
      maxDrawdown: 12.5,
      returns: 28.3,
      profitFactor: 2.1,
      calmarRatio: 2.26
    },
    backtestTrades: [
      {
        entryTime: '2024-01-01T10:00:00Z',
        exitTime: '2024-01-01T14:30:00Z',
        profit: 150.50,
        side: 'long'
      },
      // ... more trades
    ],
    initialCapital: 10000
  })
});
```

### 2. Monitor Active Bot

```typescript
// GET /api/live/bots/[botId]
const response = await fetch('/api/live/bots/bot-123');
const { bot } = await response.json();

// Returns:
{
  botId: 'bot-123',
  strategy: 'rsi_strategy',
  exchange: 'alpaca',
  mode: 'PAPER',
  status: 'RUNNING',
  startTime: 1234567890,
  account: {
    equity: 10285.50,
    cash: 5000.00,
    buyingPower: 25000.00,
    leverage: 1.0,
    dayPL: 285.50,
    dayPLPercent: 2.85
  },
  positions: [
    {
      symbol: 'AAPL',
      qty: 100,
      side: 'long',
      unrealizedPL: 120.50,
      unrealizedPLPercent: 2.5,
      entryTime: '2024-01-15T10:30:00Z'
    }
  ],
  metrics: {
    totalTrades: 3,
    winningTrades: 2,
    losingTrades: 1,
    winRate: 0.667,
    totalProfit: 450.00,
    totalLoss: 50.00,
    profitFactor: 9.0,
    sharpeRatio: 1.85,
    maxDrawdown: 5.2,
    calmarRatio: 2.26
  },
  equityCurve: [
    { timestamp: 1234567890000, equity: 10000, cash: 10000, drawdown: 0, dailyPL: 0 },
    { timestamp: 1234567900000, equity: 10150, cash: 9850, drawdown: 0, dailyPL: 150 },
    // ... more points
  ],
  recentTrades: [
    {
      id: 'order-123',
      symbol: 'AAPL',
      qty: 100,
      side: 'buy',
      type: 'market',
      price: 150.35,
      status: 'FILLED',
      filledQty: 100,
      timestamp: '2024-01-15T10:30:00Z'
    }
  ],
  healthCheck: {
    dataFeed: 'OK',
    apiLatency: 42,
    lastUpdate: 1234567900000,
    uptime: '2h 15m 30s'
  }
}
```

### 3. Control Bot (Pause/Resume/Stop)

```typescript
// PUT /api/live/bots/[botId]
const response = await fetch('/api/live/bots/bot-123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'pause'  // or 'resume', 'stop'
  })
});
```

### 4. React Hook: useBotDeployment

```typescript
import { useBotDeployment } from '@/hooks/use-bot-deployment'

function DeployComponent() {
  const { isDeploying, error, success, deployFromBacktest } = useBotDeployment()

  const handleDeploy = async () => {
    try {
      const backtest = {
        strategy: 'rsi_strategy',
        returns: 28.3,
        winRate: 0.58,
        sharpeRatio: 1.85,
        maxDrawdown: 12.5,
        totalTrades: 45,
        trades: [ /* ... */ ],
        metrics: { /* ... */ }
      }

      const bot = await deployFromBacktest(
        backtest,
        {
          botId: 'bot-123',
          exchange: 'alpaca',
          mode: 'PAPER',
          alpacaKeyId: 'your-key',
          alpacaSecretKey: 'your-secret'
        },
        10000  // initialCapital
      )

      console.log('Bot deployed:', bot)
    } catch (err) {
      console.error('Deployment failed:', err)
    }
  }

  return (
    <button onClick={handleDeploy} disabled={isDeploying}>
      {isDeploying ? 'Deploying...' : 'Deploy'}
    </button>
  )
}
```

### 5. LiveBotMonitor Component

```typescript
import LiveBotMonitor from '@/components/LiveBotMonitor'

function BotDashboard() {
  return <LiveBotMonitor botId="bot-123" />
}
```

Features:
- Real-time equity curve chart (AreaChart)
- Portfolio metrics (equity, buying power, leverage, cash)
- Active positions table with P&L
- Performance metrics (trades, win rate, Sharpe, etc.)
- Health status (data feed, API latency, uptime, mode)
- Tabbed interface for overview, positions, signals, health

## Integration with scheme.md

The `LiveBotMonitor` component implements the dashboard layout specified in `scheme.md`:

- **Portfolio Block**: Displays equity, day P&L, buying power, leverage, cash
- **Positions Block**: Shows active trades with entry time, price, quantity, P&L
- **Market Regime**: Detected signal with confidence level
- **Risk/Safety**: Drawdown, max daily loss, circuit breaker status
- **System Health**: Data feed status, API latency, mode indicator, uptime

## File Structure

```
src/
├── services/
│   ├── live-bot-monitor.ts       # Core monitoring service
│   ├── trading-service.ts         # Multi-exchange abstraction
│   └── jesse-service.ts           # Backtest simulator
├── components/
│   ├── LiveBotMonitor.tsx         # Bot dashboard component
│   └── ActiveBotsPanel.tsx        # Active bots widget
├── hooks/
│   └── use-bot-deployment.ts      # Deployment hook
├── app/
│   ├── api/
│   │   └── live/
│   │       ├── bots/
│   │       │   ├── route.ts               # List, deploy bots
│   │       │   └── [botId]/route.ts       # Get, control bot
│   │       └── deploy-from-backtest/route.ts  # Deploy from backtest
│   └── live/
│       ├── page.tsx                # Main live trading page
│       └── bots/[botId]/page.tsx   # Bot detail page
```

## Configuration

### Environment Variables

```bash
# Alpaca API
ALPACA_KEY_ID=your-key-id
ALPACA_SECRET_KEY=your-secret-key
ALPACA_PAPER=true  # Use paper trading

# Binance API (optional for simulation)
BINANCE_API_KEY=your-key
BINANCE_API_SECRET=your-secret
```

### Mode Selection

**PAPER Mode:**
- Safe testing before live trading
- No real money at risk
- Full feature support
- Recommended for validation

**LIVE Mode:**
- Real money trading
- Available for Alpaca only
- Requires explicit configuration
- WARNING: Use with caution

## Monitoring & Debugging

### API Latency

The system monitors API response times and displays them in the health check:
- Green (< 50ms): Optimal
- Yellow (50-100ms): Acceptable
- Red (> 100ms): Potential issues

### Data Feed Status

Indicates if the exchange connection is healthy:
- `OK`: Data flowing normally
- `ERROR`: Connection issues

### Uptime

Tracks how long the bot has been running:
- Format: `Xh Ym Zs`
- Updates every 10 seconds

## Best Practices

1. **Always test with PAPER mode first** before deploying with LIVE mode
2. **Monitor equity curves** to detect strategy drift
3. **Check API latency** regularly for connection issues
4. **Set stop loss orders** for risk management
5. **Review logs** in the debug panel for execution details
6. **Use small initial capital** when testing new strategies
7. **Disable trading** during market gaps or critical news events

## Performance Metrics Explained

| Metric | Meaning | Good Value |
|--------|---------|-----------|
| **Win Rate** | % of profitable trades | > 50% |
| **Profit Factor** | (Wins / Losses) ratio | > 1.5 |
| **Sharpe Ratio** | Return per unit of risk | > 1.0 |
| **Calmar Ratio** | Return / Max Drawdown | > 1.0 |
| **Max Drawdown** | Worst peak-to-trough | < 20% |

## Troubleshooting

### Bot not updating metrics
- Check API latency in health panel
- Verify exchange connection
- Review recent trades for execution issues

### Equity curve not showing
- Ensure backtest trades were provided with timestamps
- Check bot status is RUNNING
- Verify at least one update cycle has completed (5 seconds)

### API errors
- Verify API credentials are correct
- Check exchange is not in maintenance
- Review error details in server logs

## Future Enhancements

- [ ] WebSocket real-time updates
- [ ] Trading signals visualization
- [ ] Risk management circuit breakers
- [ ] Multi-strategy portfolio management
- [ ] Performance analytics dashboard
- [ ] Alert system (Discord, email)
- [ ] Trade logging to Firebase
- [ ] Machine learning strategy optimization

---

For more information, see the main [README.md](../README.md) and strategy documentation.
