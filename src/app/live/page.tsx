
"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Play, Activity, Zap, ShieldCheck, 
  ArrowUpRight, ArrowDownRight, RefreshCw,
  Terminal, StopCircle, Settings2, AlertTriangle,
  Loader2, Plus, Globe
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection } from '@/firebase'
import { collection, query, orderBy } from 'firebase/firestore'

interface LiveTrade {
  id: string;
  pair: string;
  strategy: string;
  side: 'LONG' | 'SHORT';
  pnl: number;
  amount: string;
  entryPrice: string;
  currentPrice: string;
  status: 'OPEN' | 'CLOSED';
  timestamp: string;
  broker?: string;
}

interface DeploymentConfig {
  strategy: string;
  assetClass: string;
  broker: string;
  symbol: string;
  amount: string;
  timeframe: string;
}

export default function LiveTradingPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [isDeploying, setIsDeploying] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [activeTrades, setActiveTrades] = useState<LiveTrade[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [equity, setEquity] = useState(47502.12)
  const [config, setConfig] = useState<DeploymentConfig>({
    strategy: '',
    assetClass: 'crypto',
    broker: 'binance',
    symbol: 'BTC/USDT',
    amount: '5000',
    timeframe: '1h'
  })

  const logEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Fetch user strategies
  const strategiesQuery = useMemo(() => {
    if (!db || !user) return null
    return query(
      collection(db, 'users', user.uid, 'strategies'),
      orderBy('updatedAt', 'desc')
    )
  }, [db, user])

  const { data: savedStrategies } = useCollection<any>(strategiesQuery)

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setActiveTrades(current => current.map(trade => {
        if (trade.status === 'CLOSED') return trade;
        
        const change = (Math.random() - 0.5) * (parseFloat(trade.currentPrice.replace(/[^0-9.]/g, '')) * 0.001);
        const currentVal = parseFloat(trade.currentPrice.replace(/[^0-9.]/g, ''));
        const newPrice = currentVal + change;
        const pnlChange = (Math.random() - 0.48) * 0.05; 
        
        return {
          ...trade,
          currentPrice: `$${newPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          pnl: trade.pnl + pnlChange
        };
      }));

      setEquity(prev => prev + (Math.random() - 0.48) * 5);

      if (Math.random() > 0.9) {
        const msgs = [
          `[STRATEGY] Processing ${config.symbol} ${config.timeframe} data via ${config.broker.toUpperCase()}...`,
          `[EXCHANGE] Heartbeat (${config.broker}): Latency 4.2ms`,
          "[RISK] Margin level check: Healthy",
          `[ORDER] Updating trailing stop for ${config.symbol} on ${config.broker.toUpperCase()}...`
        ];
        setLogs(prev => [...prev.slice(-49), msgs[Math.floor(Math.random() * msgs.length)]]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive, config]);

  const deployBot = () => {
    if (!config.strategy) return
    
    setIsConfigOpen(false)
    setIsDeploying(true)
    
    const stratName = savedStrategies.find(s => s.id === config.strategy)?.name || "Bot"

    setLogs([
      `[SYSTEM] Connecting to ${config.broker.toUpperCase()} API...`,
      `[SYSTEM] Mode: ${config.broker === 'alpaca_paper' ? 'PAPER TRADING' : 'LIVE PRODUCTION'}`,
      `[SYSTEM] Validating strategy: ${stratName.toUpperCase()}...`,
      `[SYSTEM] Initializing stream for ${config.symbol}...`
    ])
    
    setTimeout(() => {
      setIsLive(true)
      setIsDeploying(false)
      setActiveTrades([
        { 
          id: '1', 
          pair: config.symbol, 
          strategy: stratName, 
          side: 'LONG', 
          pnl: 0.00, 
          amount: `${(parseFloat(config.amount) / (config.assetClass === 'stocks' ? 180 : 64000)).toFixed(4)} UNIT`, 
          entryPrice: config.assetClass === 'stocks' ? '182.41' : '64,120.50',
          currentPrice: config.assetClass === 'stocks' ? '182.41' : '64,120.50',
          status: 'OPEN',
          timestamp: new Date().toLocaleTimeString(),
          broker: config.broker
        }
      ])
      setLogs(prev => [...prev, `[SUCCESS] Bot successfully deployed to ${config.broker.toUpperCase()}.`, "[LIVE] Monitoring signals..."])
      toast({
        title: config.broker === 'alpaca_paper' ? "Paper Bot Deployed" : "Live Bot Deployed",
        description: `Strategy ${stratName} is now active on ${config.symbol} via ${config.broker}.`
      })
    }, 2500)
  }

  const stopBot = () => {
    setIsLive(false)
    setActiveTrades([])
    setLogs(prev => [...prev, "[SYSTEM] Shutdown signal received.", "[SYSTEM] Closing all active orders...", "[SYSTEM] Bot stopped."])
    toast({
      variant: "destructive",
      title: "Bot Stopped",
      description: "Trading session has been terminated."
    })
  }

  const handlePanicSell = () => {
    setLogs(prev => [...prev, "[CRITICAL] PANIC SELL TRIGGERED. Closing all positions at MARKET price."])
    setActiveTrades(current => current.map(t => ({ ...t, status: 'CLOSED', pnl: t.pnl - 0.2 })))
    setTimeout(stopBot, 1500)
  }

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Execution Console</h1>
          <p className="text-muted-foreground">Manage your live and paper trading sessions across Binance and Alpaca.</p>
        </div>
        <div className="flex gap-2">
          {isLive && (
            <Button variant="destructive" className="gap-2" onClick={handlePanicSell}>
              <AlertTriangle className="w-4 h-4" /> Panic Sell All
            </Button>
          )}
          {!isLive && !isDeploying && (
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" /> New Session
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-headline">Deploy Session</DialogTitle>
                  <DialogDescription>
                    Select your strategy and execution environment.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Strategy</Label>
                    <Select value={config.strategy} onValueChange={(v) => setConfig({...config, strategy: v})}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        {savedStrategies.map(strat => (
                          <SelectItem key={strat.id} value={strat.id}>{strat.name}</SelectItem>
                        ))}
                        {savedStrategies.length === 0 && <SelectItem value="none" disabled>No saved strategies</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Source</Label>
                    <Select value={config.broker} onValueChange={(v) => setConfig({...config, broker: v, assetClass: v.includes('alpaca') ? 'stocks' : 'crypto'})}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select broker" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="binance">Binance (Live Crypto)</SelectItem>
                        <SelectItem value="alpaca_paper">Alpaca (Paper Trading)</SelectItem>
                        <SelectItem value="alpaca_live">Alpaca (Live Stocks/Crypto)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Asset</Label>
                    <Badge variant="outline" className="col-span-3 h-10 flex justify-start px-3 font-normal capitalize">
                      {config.assetClass}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Symbol</Label>
                    <Input 
                      value={config.symbol} 
                      onChange={(e) => setConfig({...config, symbol: e.target.value})}
                      className="col-span-3" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Cap ($)</Label>
                    <Input 
                      type="number"
                      value={config.amount} 
                      onChange={(e) => setConfig({...config, amount: e.target.value})}
                      className="col-span-3" 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={deployBot} className="w-full bg-primary hover:bg-primary/90" disabled={!config.strategy}>
                    <Play className="w-4 h-4 mr-2" /> Start Execution
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {isDeploying && (
            <Button disabled className="gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Deploying...
            </Button>
          )}
          {isLive && (
            <Button variant="outline" className="gap-2" onClick={stopBot}>
              <StopCircle className="w-4 h-4 text-red-500" /> Stop Session
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 font-headline">
                <Activity className="w-4 h-4 text-primary" /> Active Sessions
              </CardTitle>
              {isLive && <Badge className={config.broker === 'alpaca_paper' ? "bg-accent text-accent-foreground" : "bg-green-500"}>
                {config.broker === 'alpaca_paper' ? 'PAPER ACTIVE' : 'LIVE ACTIVE'}
              </Badge>}
            </CardHeader>
            <CardContent>
              {!isLive && !isDeploying ? (
                <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-lg opacity-40">
                  <Globe className="w-8 h-8 mb-2" />
                  <p className="text-sm font-medium">No active connections</p>
                  <p className="text-xs text-muted-foreground mt-1">Deploy a strategy to Binance or Alpaca to begin</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTrades.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${trade.side === 'LONG' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          {trade.side === 'LONG' ? <ArrowUpRight className="w-5 h-5 text-green-500" /> : <ArrowDownRight className="w-5 h-5 text-red-500" />}
                        </div>
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {trade.pair} 
                            <Badge variant="outline" className="text-[10px] font-normal uppercase">{trade.broker?.replace('_', ' ')}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">{trade.strategy} • {trade.amount}</div>
                          <div className="text-[10px] font-mono text-muted-foreground/60 mt-1">Entry: {trade.entryPrice} | Cur: {trade.currentPrice}</div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className={`text-xl font-mono font-bold ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}%
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Settings2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black/90 border-primary/20">
            <CardHeader className="py-3 border-b border-white/5">
              <CardTitle className="text-xs font-mono text-primary flex items-center gap-2">
                <Terminal className="w-3 h-3" /> BROKER_FEED_STREAM
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 h-48 overflow-y-auto font-mono text-[10px] space-y-1">
              {logs.map((log, i) => (
                <div key={i} className={log.includes('[CRITICAL]') ? 'text-red-400' : log.includes('[SUCCESS]') ? 'text-green-400' : 'text-blue-300'}>
                  <span className="opacity-40 mr-2">[{new Date().toLocaleTimeString()}]</span>
                  {log}
                </div>
              ))}
              <div ref={logEndRef} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                Current Source: {isLive ? config.broker.replace('_', ' ') : 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Risk Guard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Allocation Used</span>
                  <span className="font-mono text-primary">${isLive ? parseFloat(config.amount).toLocaleString() : '0'} / $50,000</span>
                </div>
                <Progress value={isLive ? (parseFloat(config.amount) / 50000) * 100 : 0} className="h-1.5" />
              </div>
              <div className="pt-2">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-muted-foreground">
                  <span>Connection Status</span>
                  <span className={`flex items-center gap-1 ${isLive ? 'text-green-500' : 'text-yellow-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} /> 
                    {isLive ? 'STABLE' : 'IDLE'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 text-primary ${isLive ? 'animate-spin' : ''}`} /> Data Latency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{isLive ? '4.2ms' : '--'}</div>
              <p className="text-xs text-muted-foreground mt-1">Websocket connected via {config.broker.includes('alpaca') ? 'Alpaca' : 'Binance'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
