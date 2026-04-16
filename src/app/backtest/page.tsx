"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  History, Coins, TrendingUp, 
  FileText, PlayCircle, Loader2,
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Sparkles, Plus, ArrowRight, BarChart3, Database
} from "lucide-react"
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts'
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase'
import { collection, query, doc, serverTimestamp } from 'firebase/firestore'
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface Trade {
  id: string;
  type: 'LONG' | 'SHORT';
  entry: string;
  exit: string;
  profit: number;
  status: 'PROFIT' | 'LOSS';
}

export default function BacktestPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [results, setResults] = useState<any>(null)
  const [equityData, setEquityData] = useState<{ time: string; equity: number }[]>([
    { time: 'Start', equity: 10000 },
    { time: 'End', equity: 10000 },
  ])

  const [selectedStrategy, setSelectedStrategy] = useState<string>("")
  const [dataSource, setDataSource] = useState<string>("binance")
  const [symbol, setSymbol] = useState('BTC-USDT')
  const [timeframe, setTimeframe] = useState('1h')
  const [startDate, setStartDate] = useState('2023-01-01')
  const [endDate, setEndDate] = useState('2024-01-01')
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentMode, setDeploymentMode] = useState<'PAPER' | 'LIVE'>('PAPER')
  const [deploymentExchange, setDeploymentExchange] = useState<'alpaca' | 'binance'>('alpaca')
  const logEndRef = useRef<HTMLDivElement>(null)

  const buildEquityData = (result: any) => {
    const startBalance = 10000
    let current = startBalance
    const timeline: { time: string; equity: number }[] = [
      { time: 'Start', equity: startBalance },
    ]

    const trades = result?.trades || []
    trades.forEach((trade: any, index: number) => {
      const profit = typeof trade.profit === 'number' ? trade.profit : Number(trade.profit) || 0
      current += profit
      const timeLabel = trade.exitTime
        ? new Date(trade.exitTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : `T${index + 1}`
      timeline.push({ time: timeLabel, equity: current })
    })

    if (timeline.length === 1 && typeof result?.totalReturn === 'number') {
      const endingValue = result.totalReturn > 1
        ? startBalance + (result.totalReturn > 10 ? result.totalReturn : startBalance * (result.totalReturn / 100))
        : startBalance + startBalance * (result.totalReturn || 0)
      timeline.push({ time: 'End', equity: endingValue })
    }

    return timeline
  }

  const formatCurrency = (value: any) => {
    if (value === undefined || value === null || value === '') return 'N/A'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (Number.isNaN(num)) return String(value)
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatPercent = (value: any) => {
    if (value === undefined || value === null || value === '') return 'N/A'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (Number.isNaN(num)) return String(value)
    if (Math.abs(num) <= 1) {
      return `${(num * 100).toFixed(2)}%`
    }
    return `${num.toFixed(2)}%`
  }

  // Fetch user profile for Alpaca keys
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, 'users', user.uid)
  }, [db, user])
  const { data: profile } = useDoc<any>(profileRef)

  // Fetch user strategies
  const strategiesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, 'users', user.uid, 'strategies')
  }, [db, user])

  const { data: savedStrategies, isLoading: isLoadingStrategies } = useCollection<any>(strategiesQuery)

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const seedDemoData = () => {
    if (!db || !user) return;
    const strategyId = "golden-cross-demo";
    const strategyData = {
      id: strategyId,
      name: "GoldenCross (EMA 8/21)",
      code: `class GoldenCross(Strategy):
    def should_long(self):
        # go long when the EMA 8 is above the EMA 21
        short_ema = ta.ema(self.candles, 8)
        long_ema = ta.ema(self.candles, 21)
        return short_ema > long_ema

    def go_long(self):
        entry_price = self.price - 10
        qty = utils.size_to_qty(self.balance*0.05, entry_price)
        self.buy = qty, entry_price
        self.take_profit = qty, entry_price*1.2
        self.stop_loss = qty, entry_price*0.9`,
      language: 'python',
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    setDocumentNonBlocking(doc(db, 'users', user.uid, 'strategies', strategyId), strategyData, { merge: true });
    toast({ title: "Strategy Seeded", description: "GoldenCross is now available for backtesting." });
  }

  const runSimulation = async () => {
    if (!selectedStrategy) {
      toast({ variant: "destructive", title: "Missing Strategy", description: "Please select a strategy to begin simulation." })
      return
    }

    setIsRunning(true)
    setProgress(0)
    setLogs([
      "[JESSE] Initializing Jesse Trading Engine...",
      "[JESSE] Loading strategy configuration...",
    ])
    setTrades([])
    setResults(null)

    try {
      // Get strategy details
      const stratObj = savedStrategies?.find(s => s.id === selectedStrategy)
      if (!stratObj) {
        throw new Error("Strategy not found")
      }

      setLogs(prev => [...prev, `[JESSE] Strategy loaded: ${stratObj.name}`])

      // Create Jesse strategy file if it doesn't exist
      if (stratObj.code) {
        const createResponse = await fetch('/api/jesse/strategies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create',
            name: selectedStrategy,
            code: stratObj.code
          }),
        })

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({ error: 'Failed to create strategy' }))
          throw new Error(errorData.error || 'Failed to create strategy')
        }

        setLogs(prev => [...prev, "[JESSE] Strategy code deployed to Jesse engine"])
      }

      setProgress(25)
      setLogs(prev => [...prev, "[JESSE] Preparing backtest parameters..."])

      // Run Jesse backtest via API
      const backtestResponse = await fetch('/api/jesse/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategyName: selectedStrategy,
          startDate,
          endDate,
          initialCapital: 10000,
          exchange: dataSource,
          symbol,
          timeframe
        }),
      })

      if (!backtestResponse.ok) {
        const errorData = await backtestResponse.json()
        throw new Error(errorData.error || "Backtest failed")
      }

      const backtestData = await backtestResponse.json()
      const result = backtestData.data

      setProgress(100)
      setLogs(prev => [...prev, "[JESSE] Backtest completed successfully"])
      const simulationResults = {
        pnl: result.metrics?.total ?? null,
        pnlPercent: result.totalReturn ?? null,
        winRate: result.metrics?.win_rate ?? result.winRate ?? null,
        sharpeRatio: result.sharpeRatio ?? result.metrics?.sharpe_ratio ?? null,
        smartSharpe: result.smartSharpe ?? 0,
        sortinoRatio: result.sortinoRatio ?? result.metrics?.sortino_ratio ?? null,
        smartSortino: result.smartSortino ?? 0,
        calmarRatio: result.calmarRatio ?? result.metrics?.calmar_ratio ?? null,
        omegaRatio: result.omegaRatio ?? result.metrics?.omega_ratio ?? null,
        serenityIndex: result.serenityIndex ?? 0,
        averageWinLoss: result.averageWinLoss ?? 0,
        averageWin: result.metrics?.average_win ?? null,
        averageLoss: result.metrics?.average_loss ?? null,
        totalLosingStreak: result.metrics?.total_losing_streak ?? null,
        largestLosingTrade: result.metrics?.largest_losing_trade ?? null,
        largestWinningTrade: result.metrics?.largest_winning_trade ?? null,
        totalWinningStreak: result.metrics?.total_winning_streak ?? null,
        currentStreak: result.metrics?.current_streak ?? null,
        expectancy: result.metrics?.net_profit_percentage ?? null,
        expectedNetProfit: result.metrics?.total ?? null,
        averageHoldingPeriod: result.metrics?.average_holding_period ?? null,
        grossProfit: result.metrics?.gross_profit ?? null,
        grossLoss: result.metrics?.gross_loss ?? null,
        maxDrawdown: result.metrics?.max_drawdown ?? result.maxDrawdown ?? null,
        totalTrades: result.totalTrades ?? null,
        winningTrades: result.metrics?.total_winning_trades ?? null,
        losingTrades: result.metrics?.total_losing_trades ?? null,
        startingBalance: 10000,
        finishingBalance: 10000 + (result.metrics?.total ?? 0),
        longsCount: result.metrics?.longs_count ?? null,
        longsPercentage: result.metrics?.longs_percentage ?? null,
        shortsCount: result.metrics?.shorts_count ?? null,
        shortsPercentage: result.metrics?.shorts_percentage ?? null,
        fee: result.metrics?.fee ?? null,
        totalOpenTrades: result.metrics?.total_open_trades ?? 0,
        openPL: result.metrics?.open_pl ?? 0,
      }

      setResults(simulationResults)
      setEquityData(buildEquityData(result))

      // Convert trades to display format
      const generatedTrades: Trade[] = result.trades.map((trade: any, index: number) => ({
        id: trade.id,
        type: trade.type,
        entry: `$${trade.entryPrice.toLocaleString()}`,
        exit: `$${trade.exitPrice.toLocaleString()}`,
        profit: trade.profit,
        status: trade.profit > 0 ? 'PROFIT' : 'LOSS'
      }))

      setTrades(generatedTrades)

      // Save backtest results to Firestore
      if (db && user) {
        const backtestData = {
          userId: user.uid,
          strategyId: selectedStrategy,
          strategyName: stratObj.name,
          results: simulationResults,
          trades: generatedTrades,
          timestamp: serverTimestamp(),
          jesseResult: result
        }

        await addDocumentNonBlocking(
          collection(db, 'users', user.uid, 'backtests'),
          backtestData
        )

        toast({
          title: "Backtest Complete",
          description: `Strategy ${stratObj.name} backtested successfully with ${result.totalTrades} trades.`
        })
      }

    } catch (error) {
      console.error('Backtest error:', error)
      setLogs(prev => [...prev, `[ERROR] Backtest failed: ${error instanceof Error ? error.message : 'Unknown error'}`])
      toast({
        variant: "destructive",
        title: "Backtest Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      })
    } finally {
      setIsRunning(false)
    }
  }

  const deployToLive = async () => {
    if (!results || !profile) {
      toast({ variant: "destructive", title: "Missing Data", description: "Please complete a backtest first" })
      return
    }

    setIsDeploying(true)
    try {
      const botId = `bot-${selectedStrategy}-${Date.now()}`

      // Get API keys from profile based on selected exchange
      let alpacaKeyId = ""
      let alpacaSecretKey = ""
      let binanceApiKey = ""
      let binanceApiSecret = ""

      if (deploymentExchange === "alpaca") {
        alpacaKeyId = profile.alpacaKeyId || ""
        alpacaSecretKey = profile.alpacaSecretKey || ""
        
        if (!alpacaKeyId || !alpacaSecretKey) {
          toast({ variant: "destructive", title: "Missing Alpaca Keys", description: "Please add your Alpaca API credentials in Settings" })
          return
        }
      } else {
        binanceApiKey = profile.binanceApiKey || ""
        binanceApiSecret = profile.binanceApiSecret || ""
        
        if (!binanceApiKey || !binanceApiSecret) {
          toast({ variant: "destructive", title: "Missing Binance Keys", description: "Please add your Binance API credentials in Settings" })
          return
        }
      }

      const deployResponse = await fetch('/api/live/deploy-from-backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId,
          strategy: selectedStrategy,
          exchange: deploymentExchange,
          mode: deploymentMode,
          alpacaKeyId,
          alpacaSecretKey,
          binanceApiKey,
          binanceApiSecret,
          backtestMetrics: results,
          backtestTrades: trades,
          initialCapital: results.startingBalance || 10000,
        })
      })

      if (!deployResponse.ok) {
        const error = await deployResponse.json()
        throw new Error(error.error || "Deployment failed")
      }

      const deploymentResult = await deployResponse.json()

      toast({
        title: "Bot Deployed!",
        description: `Live bot ${botId} is now running on ${deploymentExchange.toUpperCase()} ${deploymentMode}`,
      })

      // Redirect to live trading dashboard
      setTimeout(() => {
        window.location.href = '/live'
      }, 1500)

    } catch (error) {
      console.error('Deployment error:', error)
      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "Failed to deploy bot",
      })
    } finally {
      setIsDeploying(false)
    }
  }



  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-auto bg-background">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Strategy Backtesting</h1>
          <p className="text-muted-foreground">Verify your strategies with high-precision historical data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Session Config
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select value={dataSource} onValueChange={setDataSource}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="binance">Binance (Crypto)</SelectItem>
                  <SelectItem value="alpaca">Alpaca (Stocks/HFT)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Select the exchange provider for historical OHLCV data.</p>
            </div>

            <div className="space-y-2">
              <Label>Select Strategy</Label>
              <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={isLoadingStrategies ? "Loading..." : "Select a strategy"} />
                </SelectTrigger>
                <SelectContent>
                  {savedStrategies?.map((strat: any) => (
                    <SelectItem key={strat.id} value={strat.id}>{strat.name}</SelectItem>
                  ))}
                  {(!savedStrategies || savedStrategies.length === 0) && !isLoadingStrategies && (
                    <SelectItem value="none" disabled>No saved strategies</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {(!savedStrategies || savedStrategies.length === 0) && !isLoadingStrategies && (
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full text-[10px] gap-2 border-dashed" onClick={seedDemoData}>
                    <Sparkles className="w-3 h-3 text-accent" /> Seed GoldenCross Template
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Symbol</Label>
              <div className="flex gap-2">
                <Input defaultValue="BTC/USDT" className="flex-1 bg-background" />
                <Badge variant="outline" className="bg-muted">1h</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Time Range</Label>
              <div className="grid grid-cols-1 gap-2">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm bg-background" />
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm bg-background" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Symbol</Label>
              <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} className="bg-background" />
            </div>

            <div className="space-y-2">
              <Label>Timeframe</Label>
              <Input value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="bg-background" />
            </div>

            <div className="space-y-2">
              <Label>Initial Capital</Label>
              <div className="relative">
                <Coins className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input defaultValue="10,000" className="pl-9 bg-background" />
              </div>
            </div>

            <Button 
              className="w-full bg-primary hover:bg-primary/90 mt-4" 
              onClick={runSimulation}
              disabled={isRunning || !selectedStrategy}
            >
              {isRunning ? (
                <> <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running... </>
              ) : (
                <> <PlayCircle className="w-4 h-4 mr-2" /> Start Backtest </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          {isRunning && (
             <Card className="animate-in fade-in slide-in-from-top-4 duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Processing historical candles...</span>
                    <span className="text-sm text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 mb-4" />
                  <div className="bg-black/40 rounded border border-white/5 p-3 h-32 overflow-y-auto font-mono text-[10px] space-y-1">
                    {logs.map((log, i) => <div key={i} className="text-blue-400/80">{log}</div>)}
                    <div ref={logEndRef} />
                  </div>
                </CardContent>
             </Card>
          )}

          {results && !isRunning && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <Card className="overflow-hidden">
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <CardTitle className="text-lg">Equity Curve</CardTitle>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{startDate} ⇒ {endDate}</Badge>
                    <Badge variant="outline" className="text-[10px]">{symbol}</Badge>
                    <Badge variant="outline" className="text-[10px]">{timeframe}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="h-[260px] md:h-[340px] pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.38} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2e2e2e" />
                      <XAxis dataKey="time" stroke="#8b8b8b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#8b8b8b" fontSize={10} tickLine={false} axisLine={false} width={40} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #2e2e2e', borderRadius: 10 }}
                        itemStyle={{ color: '#fff', fontSize: 12 }}
                        formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Equity']}
                      />
                      <Area type="monotone" dataKey="equity" stroke="#2563eb" fill="url(#equityGradient)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">PNL</div>
                        <div className="font-semibold text-foreground">
                          {formatCurrency(results.pnl)} ({formatPercent(results.pnlPercent)})
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Win Rate</div>
                        <div className="font-semibold text-foreground">{formatPercent(results.winRate)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Sharpe Ratio</div>
                        <div className="font-semibold text-foreground">{results.sharpeRatio ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Smart Sharpe</div>
                        <div className="font-semibold text-foreground">{formatPercent(results.smartSharpe)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Sortino Ratio</div>
                        <div className="font-semibold text-foreground">{results.sortinoRatio ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Smart Sortino</div>
                        <div className="font-semibold text-foreground">{formatPercent(results.smartSortino)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Calmar Ratio</div>
                        <div className="font-semibold text-foreground">{results.calmarRatio ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Omega Ratio</div>
                        <div className="font-semibold text-foreground">{results.omegaRatio ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Serenity Index</div>
                        <div className="font-semibold text-foreground">{results.serenityIndex ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Average Win/Loss</div>
                        <div className="font-semibold text-foreground">{results.averageWinLoss ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Average Win</div>
                        <div className="font-semibold text-foreground">{formatCurrency(results.averageWin)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Average Loss</div>
                        <div className="font-semibold text-foreground">{formatCurrency(results.averageLoss)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Risk Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Total losing streak</div>
                        <div className="font-semibold text-foreground">{results.totalLosingStreak ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Largest losing trade</div>
                        <div className="font-semibold text-foreground">{formatCurrency(results.largestLosingTrade)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Largest winning trade</div>
                        <div className="font-semibold text-foreground">{formatCurrency(results.largestWinningTrade)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Total winning streak</div>
                        <div className="font-semibold text-foreground">{results.totalWinningStreak ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Current streak</div>
                        <div className="font-semibold text-foreground">{results.currentStreak ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Expectancy</div>
                        <div className="font-semibold text-foreground">{formatPercent(results.expectancy)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Expected net profit</div>
                        <div className="font-semibold text-foreground">{formatCurrency(results.expectedNetProfit)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Average holding period</div>
                        <div className="font-semibold text-foreground">{results.averageHoldingPeriod ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Gross profit</div>
                        <div className="font-semibold text-foreground">{formatCurrency(results.grossProfit)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Gross loss</div>
                        <div className="font-semibold text-foreground">{formatCurrency(results.grossLoss)}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[10px] uppercase tracking-widest mb-1">Max drawdown</div>
                        <div className="font-semibold text-foreground">{formatPercent(results.maxDrawdown)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Trade Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Total trades</div>
                        <div className="font-semibold text-foreground">{results.totalTrades ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Total winning trades</div>
                        <div className="font-semibold text-foreground">{results.winningTrades ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Total losing trades</div>
                        <div className="font-semibold text-foreground">{results.losingTrades ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Starting balance</div>
                        <div className="font-semibold text-foreground">{formatCurrency(results.startingBalance)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Finishing balance</div>
                        <div className="font-semibold text-foreground">{formatCurrency(results.finishingBalance)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Longs count</div>
                        <div className="font-semibold text-foreground">{results.longsCount ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Longs percentage</div>
                        <div className="font-semibold text-foreground">{formatPercent(results.longsPercentage)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Shorts count</div>
                        <div className="font-semibold text-foreground">{results.shortsCount ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Shorts percentage</div>
                        <div className="font-semibold text-foreground">{formatPercent(results.shortsPercentage)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Fee</div>
                        <div className="font-semibold text-foreground">{formatCurrency(results.fee)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Total open trades</div>
                        <div className="font-semibold text-foreground">{results.totalOpenTrades ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1">Open PL</div>
                        <div className="font-semibold text-foreground">{formatCurrency(results.openPL)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg font-headline">
                    <FileText className="w-5 h-5 text-primary" /> Current Session Results
                  </CardTitle>
                  <Link href="/history">
                    <Button variant="outline" size="sm" className="gap-2">View Audit Log <ArrowRight className="w-3 h-3" /></Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Side</TableHead>
                        <TableHead>Entry Price</TableHead>
                        <TableHead>Exit Price</TableHead>
                        <TableHead className="text-right">Profit/Loss</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trades.map((trade) => (
                        <TableRow key={trade.id}>
                          <TableCell>
                            <div className="flex items-center gap-2 font-bold">
                              {trade.type === 'LONG' ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
                              {trade.type}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{trade.entry}</TableCell>
                          <TableCell className="font-mono text-xs">{trade.exit}</TableCell>
                          <TableCell className={`text-right font-bold ${trade.status === 'PROFIT' ? 'text-green-500' : 'text-red-500'}`}>
                            {trade.profit > 0 ? '+' : ''}{trade.profit}%
                          </TableCell>
                          <TableCell className="text-center">
                            {trade.status === 'PROFIT' ? 
                              <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : 
                              <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-green-500/20 bg-green-50/5">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg font-headline">
                      <Sparkles className="w-5 h-5 text-green-500" /> Deploy to Live Trading
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Move this backtest to live trading with real or paper money
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-widest">Exchange</Label>
                      <Select value={deploymentExchange} onValueChange={(val) => setDeploymentExchange(val as 'alpaca' | 'binance')}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select exchange" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alpaca">Alpaca Markets</SelectItem>
                          <SelectItem value="binance">Binance Futures</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-widest">Mode</Label>
                      <Select value={deploymentMode} onValueChange={(val) => setDeploymentMode(val as 'PAPER' | 'LIVE')}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PAPER">Paper Trading</SelectItem>
                          <SelectItem value="LIVE">Live Trading</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50/10 border border-blue-200/20 text-sm text-muted-foreground">
                    <p><strong>Deployment Summary:</strong></p>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>✓ Starting Balance: {formatCurrency(results.startingBalance)}</li>
                      <li>✓ Total Trades: {results.totalTrades}</li>
                      <li>✓ Win Rate: {formatPercent(results.winRate)}</li>
                      <li>✓ Sharpe Ratio: {results.sharpeRatio ?? 'N/A'}</li>
                    </ul>
                  </div>

                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 gap-2" 
                    onClick={deployToLive}
                    disabled={isDeploying}
                  >
                    {isDeploying ? (
                      <> <Loader2 className="w-4 h-4 animate-spin" /> Deploying... </>
                    ) : (
                      <> <ArrowRight className="w-4 h-4" /> Deploy to {deploymentExchange.toUpperCase()} {deploymentMode} </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {!isRunning && !results && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center">
              <div className="opacity-40 flex flex-col items-center">
                <Database className="w-16 h-16 mb-4 text-muted-foreground" />
                <h3 className="text-xl font-headline font-medium">Ready to Test</h3>
                <p className="max-w-xs mt-2 text-sm">Select your data source and strategy to begin simulation.</p>
              </div>
              {(!savedStrategies || savedStrategies.length === 0) && !isLoadingStrategies && (
                <div className="mt-8 p-6 border rounded-xl bg-card/50 space-y-4 max-w-sm">
                   <p className="text-xs text-muted-foreground">You don't have any saved strategies yet. Seed the Institutional template to start testing now.</p>
                   <Button onClick={seedDemoData} className="w-full gap-2">
                     <Sparkles className="w-4 h-4 text-accent" /> Seed GoldenCross
                   </Button>
                   <Link href="/editor" className="block text-[10px] text-primary hover:underline">
                     Or go to Strategy Editor <ArrowRight className="inline w-2 h-2" />
                   </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}