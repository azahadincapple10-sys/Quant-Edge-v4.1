
use this as the bot trades details when clicked on the dropdown for more
__________________________________________________________________________
|Bot                                                                        | 
|PORTFOLIO (Live Account or Paper)                                        |
|________________________________________________________________________|
| Equity: $100,245.50  | Day P&L: +$450.12 (+0.45%)                      |
| Buying Power: $85,430| Current Leverage: 1.25x                         |
|______________________|_________________________________________________|
| MARKET REGIME & BRAIN                                                  |
|________________________________________________________________________|
| Detected: BULL       | Confidence: 88%       | Status: STABLE          |
| Target Alloc: 95%    | Current Alloc: 92%    | Rebalance: PENDING      |
|______________________|_________________________________________________|
| ACTIVE POSITIONS                                                       |
|________________________________________________________________________|
| TIME  | TICKER | SIDE | PRICE    | QTY | UNREALIZED P&L | STOP LOSS    |
| 09:35 | SPY    | BUY  | 125.50   | 150 | +$990.00 (5%)  | 118.00       |
| 10:15 | SPY    | BUY  | 510.20   | 50  | -$45.00 (-0.1%)| 505.00       |
|________________________________________________________________________|
| RECENT SIGNALS (Last 5)                                                |
|________________________________________________________________________|
| 14:20 | SPY    | HOLD | Strategy confirmed: LOW_VOL_BULL               |
| 13:05 | SPY    | EXIT | Strategy trigger: VOLATILITY_SPIKE             |
|________________________________________________________________________|
| RISK & SAFETY STATUS                                                   |
|________________________________________________________________________|
| all metrics card should be here                                        |
| Drawdown: 0.12%      | Max Daily: 2.0%       | Breakers: ACTIVE [✅]   |
| Correlation: 0.32    | Lock File: NONE       | Exposure: WITHIN LIMITS |
|________________________________________________________________________|
| SYSTEM HEALTH                                                          |
|________________________________________________________________________|
| Data: [✅] FEED OK  | API: 23ms (ALPAC)    | Mode: PAPER TRADING       |
| Quantedge Engine: SYNCED   | Logs: STREAMING | Uptime: 14h 22m         |
|________________________________________________________________________|


Key Data Breakdown for your logic:
for Alpaca paper trading (
    Portfolio Block: Pulls from alpaca.get_account(). It compares your current equity against the last_equity to calculate the Daily P&L.

    Positions Block: Iterates through alpaca.list_positions(). The "Time" reflects when the bot last validated the trade.)
for BInannce trading SIM (
    Portfolio Block: Pulls App Portfolio Balance. It compares your current equity against the last_equity to calculate the Daily P&L.

    Positions Block: Iterates through App Portfolio Balance. The "Time" reflects when the bot last validated the trade
)
System Block: * Data: Shows a "green tick" if the websocket heartbeat is active.

API: Measures the latency (ping) between your bot and the Alpaca servers.

Strategy: Confirms whether the code is in Paper or Live mode to prevent accidental real-money trades.