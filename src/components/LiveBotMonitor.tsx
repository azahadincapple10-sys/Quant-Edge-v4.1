"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import {
  Activity, TrendingUp, TrendingDown, Zap, AlertCircle, 
  Check, Pause, Play, StopCircle, Wallet, DollarSign,
  Cpu, Wifi, Clock, Target
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EquityCurvePoint {
  timestamp: number
  equity: number
  cash: number
  drawdown: number
  dailyPL: number
}

interface Position {
  id: string
  symbol: string
  qty: number
  avgFillPrice: number
  side: 'long' | 'short'
  unrealizedPL: number
  unrealizedPLPercent: number
  entryTime: string
  currentPrice?: number
}

interface Account {
  equity: number
  cash: number
  buyingPower: number
  leverage: number
  dayPL: number
  dayPLPercent: number
  portfolioValue: number
  currency: string
  status: string
}

interface BotMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalProfit: number
  totalLoss: number
  profitFactor: number
  sharpeRatio: number
  maxDrawdown: number
  calmarRatio: number
}

interface LiveBotStatus {
  botId: string
  strategy: string
  exchange: 'alpaca' | 'binance'
  mode: 'PAPER' | 'LIVE'
  status: 'RUNNING' | 'PAUSED' | 'STOPPED'
  startTime: number
  account: Account
  positions: Position[]
  metrics: BotMetrics
  equityCurve: EquityCurvePoint[]
  recentTrades: any[]
  healthCheck: {
    dataFeed: 'OK' | 'ERROR'
    apiLatency: number
    lastUpdate: number
    uptime: string
  }
}

export function LiveBotMonitor({ botId }: { botId: string }) {
  const { toast } = useToast()
  const [botStatus, setBotStatus] = useState<LiveBotStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'positions' | 'signals' | 'health'>('overview')

  useEffect(() => {
    const fetchBotStatus = async () => {
      try {
        const response = await fetch(`/api/live/bots/${botId}`)
        if (response.ok) {
          const data = await response.json()
          setBotStatus(data.bot)
        }
      } catch (error) {
        console.error('Failed to fetch bot status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBotStatus()
    const interval = setInterval(fetchBotStatus, 5000)
    return () => clearInterval(interval)
  }, [botId])

  if (loading || !botStatus) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  const statusColor = {
    'RUNNING': 'bg-green-100 text-green-800',
    'PAUSED': 'bg-yellow-100 text-yellow-800',
    'STOPPED': 'bg-red-100 text-red-800'
  }

  const equityChartData = botStatus.equityCurve.map(point => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    equity: parseFloat((point.equity / 1000).toFixed(2)),
    drawdown: parseFloat(point.drawdown.toFixed(2))
  }))

  return (
    <div className="space-y-6">
      {/* Portfolio Block */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Live Portfolio</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {botStatus.exchange.toUpperCase()} • {botStatus.mode} • {botStatus.strategy}
              </p>
            </div>
            <Badge className={statusColor[botStatus.status as keyof typeof statusColor]}>
              {botStatus.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Equity</p>
              <p className="text-2xl font-bold">${botStatus.account.equity.toFixed(2)}</p>
              <p className={`text-xs font-semibold ${botStatus.account.dayPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {botStatus.account.dayPL >= 0 ? '+' : ''}{botStatus.account.dayPL.toFixed(2)} ({botStatus.account.dayPLPercent.toFixed(2)}%)
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Buying Power</p>
              <p className="text-2xl font-bold">${botStatus.account.buyingPower.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Available for trading</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Leverage</p>
              <p className="text-2xl font-bold">{botStatus.account.leverage.toFixed(2)}x</p>
              <p className="text-xs text-muted-foreground">Current leverage</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Cash</p>
              <p className="text-2xl font-bold">${botStatus.account.cash.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Uninvested</p>
            </div>
          </div>

          {/* Equity Curve Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityChartData}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip formatter={(value) => `$${value}k`} />
                <Area type="monotone" dataKey="equity" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEquity)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b">
        {(['overview', 'positions', 'signals', 'health'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 text-sm font-semibold ${
              selectedTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="space-y-4">
          {/* Market Regime */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Market Regime Detection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Detected</p>
                  <Badge className="bg-green-100 text-green-800 mt-2">BULLISH</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-xl font-bold mt-1">88%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trend</p>
                  <Badge className="bg-blue-100 text-blue-800 mt-2">STABLE</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Volatility</p>
                  <p className="text-xl font-bold mt-1">Low</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-2xl font-bold">{botStatus.metrics.totalTrades}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">{(botStatus.metrics.winRate * 100).toFixed(1)}%</p>
                    <p className="text-xs text-green-600">({botStatus.metrics.winningTrades}W)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Profit Factor</p>
                  <p className="text-2xl font-bold">{botStatus.metrics.profitFactor.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                  <p className="text-2xl font-bold">{botStatus.metrics.sharpeRatio.toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Max Drawdown</p>
                  <p className="text-2xl font-bold text-red-600">{botStatus.metrics.maxDrawdown.toFixed(2)}%</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Calmar Ratio</p>
                  <p className="text-2xl font-bold">{botStatus.metrics.calmarRatio.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedTab === 'positions' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Positions ({botStatus.positions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {botStatus.positions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active positions</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Ticker</th>
                      <th className="text-left py-2">Side</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">P&L</th>
                      <th className="text-right py-2">Entry Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {botStatus.positions.map((pos, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="py-2 font-semibold">{pos.symbol}</td>
                        <td className="py-2">
                          <Badge variant={pos.side === 'long' ? 'secondary' : 'destructive'}>
                            {pos.side.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="text-right py-2">${pos.currentPrice?.toFixed(2) || '-'}</td>
                        <td className="text-right py-2">{pos.qty}</td>
                        <td className={`text-right py-2 font-semibold ${pos.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {pos.unrealizedPL >= 0 ? '+' : ''}{pos.unrealizedPL.toFixed(2)} ({pos.unrealizedPLPercent.toFixed(2)}%)
                        </td>
                        <td className="text-right py-2 text-xs text-muted-foreground">
                          {new Date(pos.entryTime).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedTab === 'health' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-muted-foreground">Data Feed</p>
                </div>
                <Badge className="bg-green-100 text-green-800">{botStatus.healthCheck.dataFeed}</Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">API Latency</p>
                <p className="text-xl font-bold">{botStatus.healthCheck.apiLatency}ms</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-lg font-bold">{botStatus.healthCheck.uptime}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Mode</p>
                <Badge className={botStatus.mode === 'PAPER' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}>
                  {botStatus.mode} TRADING
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Control Buttons */}
      <div className="flex gap-2">
        {botStatus.status === 'RUNNING' && (
          <>
            <Button variant="outline" size="sm">
              <Pause className="w-4 h-4 mr-2" /> Pause
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 border-red-200">
              <StopCircle className="w-4 h-4 mr-2" /> Stop
            </Button>
          </>
        )}
        {botStatus.status === 'PAUSED' && (
          <Button variant="outline" size="sm">
            <Play className="w-4 h-4 mr-2" /> Resume
          </Button>
        )}
      </div>
    </div>
  )
}

export default LiveBotMonitor
