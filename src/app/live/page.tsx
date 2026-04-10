
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
  Loader2, Plus, Globe, Trophy, ShieldAlert,
  ArrowRight, Landmark, Lock
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection } from '@/firebase'
import { collection, query, orderBy } from 'firebase/firestore'
import { INITIAL_MARKET_DATA } from '../screener/page'

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
  profitPct?: number;
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
  const [equity, setEquity] = useState(50000.00)
  const [hwm, setHwm] = useState(50000.00) // High Water Mark
  const [dailyStartingEquity, setDailyStartingEquity] = useState(50000.00)
  const [isAccountSuspended, setIsAccountSuspended] = useState(false)
  
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

  // Risk Limits (Simulated from settings)
  const MAX_DAILY_LOSS_PCT = 5
  const MAX_TOTAL_DRAWDOWN_PCT = 10
  const PROFIT_TARGET_PCT = 10
  const INITIAL_BALANCE = 50000.00

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

  // Real-time Equity and Risk Engine
  useEffect(() => {
    if (!isLive || isAccountSuspended) return;

    const interval = setInterval(() => {
      // 1. Update active trades
      setActiveTrades(current => current.map(trade => {
        if (trade.status === 'CLOSED') return trade;
        
        const change = (Math.random() - 0.5) * (parseFloat(trade.currentPrice.replace(/[^0-9.]/g, '')) * 0.001);
        const currentVal = parseFloat(trade.currentPrice.replace(/[^0-9.]/g, ''));
        const newPrice = currentVal + change;
        const pnlChange = (Math.random() - 0.49) * 0.05; // Slightly biased towards tiny gain for simulation
        
        return {
          ...trade,
          currentPrice: `$${newPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          pnl: trade.pnl + pnlChange
        };
      }));

      // 2. Update Equity
      setEquity(prev => {
        const newEquity = prev + (Math.random() - 0.49) * 10;
        
        // Update High Water Mark
        if (newEquity > hwm) {
          setHwm(newEquity);
        }

        // Check for Drawdown Violations
        const totalDrawdown = ((hwm - newEquity) / hwm) * 100;
        const dailyLoss = ((dailyStartingEquity - newEquity) / dailyStartingEquity) * 100;

        if (totalDrawdown >= MAX_TOTAL_DRAWDOWN_PCT) {
          suspendAccount("MAX TOTAL DRAWDOWN BREACHED");
          return newEquity;
        }

        if (dailyLoss >= MAX_DAILY_LOSS_PCT) {
          suspendAccount("MAX DAILY LOSS BREACHED");
          return newEquity;
        }

        return newEquity;
      });

      // 3. Random Logs
      if (Math.random() > 0.8) {
        const msgs = [
          `[STRATEGY] Calculating PnL...`,
          `[RISK] Daily Drawdown: ${(((dailyStartingEquity - equity) / dailyStartingEquity) * 100).toFixed(2)}%`,
          `[RISK] HWM Check: $${hwm.toLocaleString()}`,
          `[ORDER] Trailing stop updated for safety.`,
          `[SYSTEM] Consistency check passed.`
        ];
        setLogs(prev => [...prev.slice(-49), msgs[Math.floor(Math.random() * msgs.length)]]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive, isAccountSuspended, equity, hwm, dailyStartingEquity]);

  const suspendAccount = (reason: string) => {
    setIsAccountSuspended(true);
    setIsLive(false);
    setLogs(prev => [...prev, `[CRITICAL] ACCOUNT SUSPENDED: ${reason}`, "[SYSTEM] All orders cancelled. Trading frozen."]);
    toast({
      variant: "destructive",
      title: "Compliance Breach",
      description: reason
    });
  }

  const deployBot = () => {
    if (!config.strategy || isAccountSuspended) return
    
    setIsConfigOpen(false)
    setIsDeploying(true)
    
    const stratName = savedStrategies.find(s => s.id === config.strategy)?.name || "Bot"
    const marketItem = INITIAL_MARKET_DATA.find(i => i.symbol === config.symbol)

    setLogs([
      `[SYSTEM] Validating Prop Firm Compliance...`,
      `[RISK] Max Daily Loss Limit: ${MAX_DAILY_LOSS_PCT}%`,
      `[RISK] Max Drawdown Limit: ${MAX_TOTAL_DRAWDOWN_PCT}%`,
      `[SYSTEM] Connecting to ${config.broker.toUpperCase()}...`,
      `[SUCCESS] Compliance check passed. Deploying logic.`
    ])
    
    setTimeout(() => {
      setIsLive(true)
      setIsDeploying(false)
      const startPrice = marketItem?.price || 64000
      setActiveTrades([
        { 
          id: '1', 
          pair: config.symbol, 
          strategy: stratName, 
          side: 'LONG', 
          pnl: 0.00, 
          amount: `${(parseFloat(config.amount) / startPrice).toFixed(4)} UNIT`, 
          entryPrice: startPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }),
          currentPrice: startPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }),
          status: 'OPEN',
          timestamp: new Date().toLocaleTimeString(),
          broker: config.broker
        }
      ])
      setLogs(prev => [...prev, `[SUCCESS] Bot active. Monitoring drawdown in real-time.`])
    }, 2500)
  }

  const stopBot = () => {
    setIsLive(false)
    setActiveTrades([])
    setLogs(prev => [...prev, "[SYSTEM] Bot stopped by user."])
  }

  // Calculated Progress
  const profitTargetValue = INITIAL_BALANCE * (1 + PROFIT_TARGET_PCT / 100);
  const currentProfit = equity - INITIAL_BALANCE;
  const progressToTarget = Math.max(0, Math.min(100, (currentProfit / (INITIAL_BALANCE * (PROFIT_TARGET_PCT / 100))) * 100));
  
  // Consistency Check (Simplified: Largest single trade profit shouldn't exceed 50% of target)
  const maxSingleTradeProfit = Math.max(...activeTrades.map(t => t.pnl), 0);
  const consistencyScore = 100 - Math.min(100, (maxSingleTradeProfit / (PROFIT_TARGET_PCT / 2)) * 100);

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-auto bg-[#080A0C]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            Institutional Console <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/20 text-primary">PROP FIRM READY</Badge>
          </h1>
          <p className="text-muted-foreground">High-precision execution with real-time drawdown protection.</p>
        </div>
        <div className="flex gap-2">
          {isAccountSuspended && (
            <Badge variant="destructive" className="h-10 px-4 flex gap-2 animate-pulse">
              <Lock className="w-4 h-4" /> TRADING FROZEN - CONTACT ADMIN
            </Badge>
          )}
          {!isLive && !isDeploying && !isAccountSuspended && (
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" /> Start Session
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Deploy Strategy</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4 text-sm font-medium">
                    <Label className="text-right">Strategy</Label>
                    <Select value={config.strategy} onValueChange={(v) => setConfig({...config, strategy: v})}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {savedStrategies.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 text-sm font-medium">
                    <Label className="text-right">Exchange</Label>
                    <Select value={config.broker} onValueChange={(v) => setConfig({...config, broker: v})}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder="Broker" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="binance_paper">Binance (Paper)</SelectItem>
                        <SelectItem value="alpaca_paper">Alpaca (Paper)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 text-sm font-medium">
                    <Label className="text-right">Risk Amt</Label>
                    <Input value={config.amount} onChange={(e) => setConfig({...config, amount: e.target.value})} className="col-span-3" type="number" />
                  </div>
                </div>
                <DialogFooter>
                   <Button onClick={deployBot} className="w-full bg-primary" disabled={!config.strategy}>
                     Deploy Bot
                   </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {isLive && (
             <Button variant="outline" className="gap-2 text-red-500 border-red-500/20" onClick={stopBot}>
               <StopCircle className="w-4 h-4" /> Stop Strategy
             </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Stats and Risk */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-primary flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Profit Target (10%)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-end">
                 <div className="text-2xl font-bold font-mono">${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                 <div className="text-[10px] text-muted-foreground">Target: $55,000</div>
              </div>
              <Progress value={progressToTarget} className="h-2" />
              <div className="grid grid-cols-2 gap-4 pt-2">
                 <div className="p-2 rounded bg-background border border-border">
                    <div className="text-[9px] uppercase text-muted-foreground">To Goal</div>
                    <div className="text-xs font-bold text-green-500">${Math.max(0, 55000 - equity).toLocaleString()}</div>
                 </div>
                 <div className="p-2 rounded bg-background border border-border">
                    <div className="text-[9px] uppercase text-muted-foreground">PnL (%)</div>
                    <div className="text-xs font-bold text-primary">+{((equity - 50000)/500).toFixed(2)}%</div>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Compliance Guard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] uppercase font-bold">
                    <span>Daily Drawdown</span>
                    <span className={((dailyStartingEquity - equity) / dailyStartingEquity) * 100 > 4 ? 'text-red-500' : 'text-green-500'}>
                      {(((dailyStartingEquity - equity) / dailyStartingEquity) * 100).toFixed(2)}% / 5%
                    </span>
                  </div>
                  <Progress value={(((dailyStartingEquity - equity) / dailyStartingEquity) * 100 / 5) * 100} className="h-1 bg-white/5" />
               </div>
               <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] uppercase font-bold">
                    <span>Total Drawdown</span>
                    <span className={((hwm - equity) / hwm) * 100 > 8 ? 'text-red-500' : 'text-green-500'}>
                      {(((hwm - equity) / hwm) * 100).toFixed(2)}% / 10%
                    </span>
                  </div>
                  <Progress value={(((hwm - equity) / hwm) * 100 / 10) * 100} className="h-1 bg-white/5" />
               </div>
               <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] uppercase font-bold">
                    <span>Consistency Score</span>
                    <span className="text-blue-400">{consistencyScore.toFixed(0)}%</span>
                  </div>
                  <Progress value={consistencyScore} className="h-1 bg-white/5" />
               </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/5">
             <CardHeader className="pb-2">
               <CardTitle className="text-[10px] font-bold uppercase">Account Metrics</CardTitle>
             </CardHeader>
             <CardContent className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                   <span className="text-muted-foreground">High Water Mark</span>
                   <span className="font-mono">${hwm.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-muted-foreground">Current Drawdown</span>
                   <span className="font-mono text-red-400">-${(hwm - equity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-muted-foreground">Max Daily Loss Limit</span>
                   <span className="font-mono">$2,500.00</span>
                </div>
             </CardContent>
          </Card>
        </div>

        {/* Center/Right Column: Live Sessions and Logs */}
        <div className="lg:col-span-3 space-y-6">
           <Card className="border-border/50 bg-card/50">
             <CardHeader className="py-4 border-b border-white/5 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-headline flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" /> Active Strategies
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase">{config.broker.replace('_', ' ')} FEED ACTIVE</Badge>
             </CardHeader>
             <CardContent className="p-0">
                {activeTrades.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center opacity-30">
                    <Zap className="w-12 h-12 mb-2" />
                    <p className="text-sm">No strategies currently deployed.</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {activeTrades.map(trade => (
                      <div key={trade.id} className="flex items-center justify-between p-4 rounded-xl border bg-background/50 group">
                         <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${trade.side === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                               {trade.side === 'LONG' ? <ArrowUpRight /> : <ArrowDownRight />}
                            </div>
                            <div>
                               <div className="font-bold flex items-center gap-2">
                                  {trade.pair} <span className="text-xs text-muted-foreground font-normal">({trade.strategy})</span>
                               </div>
                               <div className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">
                                  AMT: {trade.amount} | ENTRY: ${trade.entryPrice}
                               </div>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className={`text-xl font-mono font-bold ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                               {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}%
                            </div>
                            <Badge variant="outline" className="text-[9px] mt-2 border-white/10">RISK LIMIT: SECURE</Badge>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
             </CardContent>
           </Card>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-black border-primary/20">
                 <CardHeader className="py-2 border-b border-white/5 flex flex-row items-center justify-between">
                    <CardTitle className="text-[10px] font-mono text-primary flex items-center gap-2">
                       <Terminal className="w-3 h-3" /> COMPLIANCE_LOG
                    </CardTitle>
                    <RefreshCw className={`w-3 h-3 text-primary/40 ${isLive ? 'animate-spin' : ''}`} />
                 </CardHeader>
                 <CardContent className="p-4 h-48 overflow-y-auto font-mono text-[10px] space-y-1">
                    {logs.map((l, i) => (
                      <div key={i} className={l.includes('[CRITICAL]') ? 'text-red-400' : l.includes('[RISK]') ? 'text-yellow-400' : 'text-blue-300'}>
                         <span className="opacity-30 mr-2">{new Date().toLocaleTimeString()}</span> {l}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                 </CardContent>
              </Card>

              <Card className="bg-card/30 border-white/5">
                 <CardHeader className="py-3">
                    <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                       <ShieldAlert className="w-4 h-4 text-orange-500" /> Circuit Breakers
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs p-2 rounded bg-background border border-white/5">
                       <span className="text-muted-foreground">Latency Threshold</span>
                       <span className="text-green-500 font-bold font-mono">50ms</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 rounded bg-background border border-white/5">
                       <span className="text-muted-foreground">Market Vol Stop</span>
                       <span className="text-green-500 font-bold font-mono">ACTIVE</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 rounded bg-background border border-white/5">
                       <span className="text-muted-foreground">Max Account Exposure</span>
                       <span className="text-blue-400 font-bold font-mono">$10,000</span>
                    </div>
                 </CardContent>
              </Card>
           </div>
        </div>
      </div>
    </div>
  )
}
