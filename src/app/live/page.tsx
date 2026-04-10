
"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Play, Activity, Zap, ShieldCheck, 
  ArrowUpRight, ArrowDownRight, RefreshCw,
  Terminal, StopCircle, AlertTriangle,
  Loader2, Trophy, ShieldAlert,
  Lock, Calculator, Info
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase'
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
  const [dailyStartingEquity] = useState(50000.00)
  const [tradingDays] = useState(1)
  const [isAccountSuspended, setIsAccountSuspended] = useState(false)
  
  // Risk Calculator State
  const [calcRiskPct, setCalcRiskPct] = useState("1")
  const [calcStopLoss, setCalcStopLoss] = useState("500")
  const [calcResult, setCalcResult] = useState<{size: string, margin: string} | null>(null)

  const [config, setConfig] = useState({
    strategy: '',
    broker: 'alpaca_paper',
    symbol: 'BTC/USDT',
    amount: '5000',
  })

  const logEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Prop Firm Thresholds
  const DAILY_LOSS_LIMIT = 0.05 // 5%
  const MAX_DRAWDOWN_LIMIT = 0.10 // 10%
  const PROFIT_TARGET_PHASE1 = 0.10 // 10%
  const INITIAL_BALANCE = 50000.00

  const strategiesQuery = useMemoFirebase(() => {
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
        const change = (Math.random() - 0.5) * 50;
        const currentVal = parseFloat(trade.currentPrice.replace(/[^0-9.]/g, ''));
        const newPrice = currentVal + change;
        const pnlChange = (Math.random() - 0.48) * 0.1; 
        
        return {
          ...trade,
          currentPrice: `$${newPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          pnl: trade.pnl + pnlChange
        };
      }));

      // 2. Update Equity & HWM
      setEquity(prev => {
        const pnlTick = (Math.random() - 0.48) * 25;
        const nextEquity = prev + pnlTick;

        // Trailing Drawdown Logic
        if (nextEquity > hwm) {
          setHwm(nextEquity);
        }

        // Compliance Checks
        const dailyLoss = ((dailyStartingEquity - nextEquity) / dailyStartingEquity);
        const totalDrawdown = ((hwm - nextEquity) / hwm);

        if (dailyLoss >= DAILY_LOSS_LIMIT) {
          suspendAccount("DAILY LOSS LIMIT BREACHED");
          return nextEquity;
        }

        if (totalDrawdown >= MAX_DRAWDOWN_LIMIT) {
          suspendAccount("MAXIMUM DRAWDOWN BREACHED");
          return nextEquity;
        }

        return nextEquity;
      });

      // 3. Simulated News Alerts & Guardrails
      if (Math.random() > 0.95) {
        setLogs(prev => [...prev.slice(-40), "[GUARDRAIL] High-Impact News approaching (NFP). Trading disabled for 5m."]);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isLive, isAccountSuspended, hwm, dailyStartingEquity]);

  const suspendAccount = (reason: string) => {
    setIsAccountSuspended(true);
    setIsLive(false);
    setLogs(prev => [...prev, `[CRITICAL] Compliance Engine: ${reason}`, "[SYSTEM] Account Suspended. All positions liquidated."]);
    toast({
      variant: "destructive",
      title: "Hard Stop Triggered",
      description: reason
    });
  }

  const deployBot = () => {
    if (!config.strategy || isAccountSuspended) return
    setIsConfigOpen(false)
    setIsDeploying(true)
    
    setLogs([
      `[SYSTEM] Booting Compliance Engine...`,
      `[AUTH] Authenticating with Alpaca API...`,
      `[RISK] Validating Phase 1 Consistency Rules...`,
      `[SUCCESS] Connection Established. Logic Deployed.`
    ])
    
    setTimeout(() => {
      setIsLive(true)
      setIsDeploying(false)
      const stratName = savedStrategies?.find(s => s.id === config.strategy)?.name || "Bot"
      const startPrice = INITIAL_MARKET_DATA.find(i => i.symbol === config.symbol)?.price || 64000
      
      setActiveTrades([
        { 
          id: '1', pair: config.symbol, strategy: stratName, side: 'LONG', pnl: 0.00, 
          amount: `${(parseFloat(config.amount) / startPrice).toFixed(4)}`, 
          entryPrice: startPrice.toLocaleString(), currentPrice: startPrice.toLocaleString(),
          status: 'OPEN', timestamp: new Date().toLocaleTimeString()
        }
      ])
    }, 2000)
  }

  const calculateRisk = () => {
    const riskAmt = INITIAL_BALANCE * (parseFloat(calcRiskPct) / 100);
    const stopLossPips = parseFloat(calcStopLoss);
    const lotSize = riskAmt / stopLossPips;
    setCalcResult({
      size: lotSize.toFixed(2),
      margin: (lotSize * 1000).toLocaleString()
    });
  }

  const progressToTarget = Math.max(0, Math.min(100, ((equity - INITIAL_BALANCE) / (INITIAL_BALANCE * PROFIT_TARGET_PHASE1)) * 100));
  const maxDayProfit = 0.65; // Simulated 65% of target in one day
  const isUnbalanced = maxDayProfit > 0.5;

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-auto bg-[#080A0C]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            Execution Console <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px]">Prop Mode Active</Badge>
          </h1>
          <p className="text-muted-foreground">Monitoring drawdown, consistency, and operational safety in real-time.</p>
        </div>
        <div className="flex gap-2">
          {isAccountSuspended ? (
             <Badge variant="destructive" className="h-10 px-4 flex gap-2 animate-pulse">
               <Lock className="w-4 h-4" /> TRADING SUSPENDED
             </Badge>
          ) : !isLive ? (
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                  <Play className="w-4 h-4" /> Start Challenge Session
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Deploy Compliant Strategy</DialogTitle>
                  <DialogDescription>Your risk limits will be enforced by the terminal.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Strategy</Label>
                    <Select value={config.strategy} onValueChange={(v) => setConfig({...config, strategy: v})}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {savedStrategies?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Symbol</Label>
                    <Input value={config.symbol} onChange={(e) => setConfig({...config, symbol: e.target.value})} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Initial Risk</Label>
                    <Input value={config.amount} onChange={(e) => setConfig({...config, amount: e.target.value})} className="col-span-3" type="number" />
                  </div>
                </div>
                <DialogFooter>
                   <Button onClick={deployBot} className="w-full bg-primary" disabled={!config.strategy}>
                     Launch Session
                   </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Button variant="outline" className="text-red-500 border-red-500/20" onClick={() => setIsLive(false)}>
              <StopCircle className="w-4 h-4 mr-2" /> Stop and Flatten
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Health & Metrics */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-primary flex items-center justify-between">
                Evaluation: Phase 1
                <Trophy className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold font-mono">${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase font-bold">
                  <span>Target: $55,000</span>
                  <span className="text-primary">{progressToTarget.toFixed(1)}%</span>
                </div>
                <Progress value={progressToTarget} className="h-1.5" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground uppercase">Trading Days</div>
                  <div className="text-sm font-bold">{tradingDays} / 5</div>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="text-center">
                  <div className="text-[9px] text-muted-foreground uppercase">Consistency</div>
                  <Badge variant={isUnbalanced ? "destructive" : "outline"} className="text-[9px] h-4">
                    {isUnbalanced ? "UNBALANCED" : "STABLE"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-500" /> Drawdown Monitor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] uppercase font-bold">
                    <span>Daily Loss (5%)</span>
                    <span className={((dailyStartingEquity - equity) / dailyStartingEquity) > 0.04 ? 'text-red-500' : 'text-green-500'}>
                      {(((dailyStartingEquity - equity) / dailyStartingEquity) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Progress value={(((dailyStartingEquity - equity) / dailyStartingEquity) / 0.05) * 100} className="h-1 bg-white/5" />
               </div>
               <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] uppercase font-bold">
                    <span>Total Drawdown (10%)</span>
                    <span className={((hwm - equity) / hwm) > 0.08 ? 'text-red-500' : 'text-green-500'}>
                      {(((hwm - equity) / hwm) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Progress value={(((hwm - equity) / hwm) / 0.10) * 100} className="h-1 bg-white/5" />
               </div>
               <div className="pt-2 text-[10px] text-muted-foreground flex items-center gap-2">
                 <Info className="w-3 h-3" /> HWM Trailing is Active
               </div>
            </CardContent>
          </Card>

          {/* Position Sizer Tool */}
          <Card className="bg-black/40 border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" /> Risk Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Risk %</Label>
                  <Input value={calcRiskPct} onChange={(e) => setCalcRiskPct(e.target.value)} className="h-7 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">SL (Pips)</Label>
                  <Input value={calcStopLoss} onChange={(e) => setCalcStopLoss(e.target.value)} className="h-7 text-xs" />
                </div>
              </div>
              <Button size="sm" className="w-full h-7 text-xs" onClick={calculateRisk}>Calculate Size</Button>
              {calcResult && (
                <div className="p-2 rounded bg-primary/5 border border-primary/20 text-center animate-in fade-in zoom-in-95">
                  <div className="text-[10px] text-muted-foreground">Lot Size</div>
                  <div className="text-lg font-bold text-primary">{calcResult.size}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center/Right: Activity and Rules */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="trades">
            <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-12 p-0">
               <TabsTrigger value="trades" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                 <Activity className="w-4 h-4 mr-2" /> Live Session
               </TabsTrigger>
               <TabsTrigger value="rules" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                 <ShieldCheck className="w-4 h-4 mr-2" /> Active Guardrails
               </TabsTrigger>
            </TabsList>
            
            <TabsContent value="trades" className="pt-6 space-y-6">
               <Card className="border-border/50 bg-card/30">
                 <CardContent className="p-0">
                   {activeTrades.length === 0 ? (
                     <div className="h-48 flex flex-col items-center justify-center text-muted-foreground opacity-30">
                        <Zap className="w-12 h-12 mb-2" />
                        <p className="text-sm">Ready to deploy compliant strategy.</p>
                     </div>
                   ) : (
                     <div className="divide-y divide-white/5">
                       {activeTrades.map(trade => (
                         <div key={trade.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                           <div className="flex items-center gap-4">
                             <div className={`p-2 rounded-full ${trade.side === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                               {trade.side === 'LONG' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                             </div>
                             <div>
                               <div className="font-bold">{trade.pair} <span className="text-xs font-normal opacity-50">/ {trade.strategy}</span></div>
                               <div className="text-[10px] font-mono uppercase text-muted-foreground mt-0.5">
                                 Size: {trade.amount} | Entry: {trade.entryPrice}
                               </div>
                             </div>
                           </div>
                           <div className="text-right">
                             <div className={`text-xl font-mono font-bold ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                               {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}%
                             </div>
                             <div className="text-[10px] text-muted-foreground uppercase">{trade.timestamp}</div>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </CardContent>
               </Card>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-black border-primary/20 overflow-hidden">
                    <div className="px-4 py-2 border-b border-white/5 bg-primary/5 flex items-center justify-between">
                       <span className="text-[10px] font-bold text-primary flex items-center gap-2">
                         <Terminal className="w-3 h-3" /> AUDIT_LOG_STREAM
                       </span>
                       <RefreshCw className={`w-3 h-3 text-primary/40 ${isLive ? 'animate-spin' : ''}`} />
                    </div>
                    <CardContent className="p-4 h-40 overflow-y-auto font-mono text-[10px] space-y-1">
                      {logs.map((l, i) => (
                        <div key={i} className={l.includes('[CRITICAL]') ? 'text-red-400' : l.includes('[GUARDRAIL]') ? 'text-yellow-400' : 'text-blue-300'}>
                          <span className="opacity-30 mr-2">{new Date().toLocaleTimeString()}</span> {l}
                        </div>
                      ))}
                      <div ref={logEndRef} />
                    </CardContent>
                  </Card>

                  <Card className="bg-card/30 border-white/5">
                     <CardHeader className="py-3">
                        <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" /> Banned Behavior Detect
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-3">
                        {[
                          { rule: "Martingale Detection", status: "Secure", color: "text-green-500" },
                          { rule: "HFT Tick Scalping", status: "Secure", color: "text-green-500" },
                          { rule: "Weekend Holding", status: "Flat Req.", color: "text-orange-500" }
                        ].map((r, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] p-2 rounded bg-background/50 border border-white/5">
                            <span className="text-muted-foreground">{r.rule}</span>
                            <span className={`font-bold uppercase ${r.color}`}>{r.status}</span>
                          </div>
                        ))}
                     </CardContent>
                  </Card>
               </div>
            </TabsContent>

            <TabsContent value="rules" className="pt-6">
               <Card>
                 <CardHeader>
                   <CardTitle className="text-sm">Compliance Protocol (Hard Rules)</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
                          <div className="text-sm font-bold flex items-center gap-2">
                             <ShieldCheck className="w-4 h-4 text-primary" /> Daily Loss Filter
                          </div>
                          <p className="text-xs text-muted-foreground">Terminates execution if daily equity drop exceeds 5% of starting daily balance ($2,500).</p>
                       </div>
                       <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
                          <div className="text-sm font-bold flex items-center gap-2">
                             <ShieldCheck className="w-4 h-4 text-primary" /> Trailing Drawdown
                          </div>
                          <p className="text-xs text-muted-foreground">Overall loss cannot exceed 10% from the High Water Mark ($5,000 drawdown floor).</p>
                       </div>
                       <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
                          <div className="text-sm font-bold flex items-center gap-2">
                             <ShieldCheck className="w-4 h-4 text-primary" /> Margin Guard
                          </div>
                          <p className="text-xs text-muted-foreground">Alerts user if used margin exceeds 70% of available leverage (Account Over-exposure).</p>
                       </div>
                       <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
                          <div className="text-sm font-bold flex items-center gap-2">
                             <ShieldCheck className="w-4 h-4 text-primary" /> Weekend Closure
                          </div>
                          <p className="text-xs text-muted-foreground">Positions must be closed 30m before market close on Friday (Institutional Holding Rule).</p>
                       </div>
                    </div>
                 </CardContent>
               </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
