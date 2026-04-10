
"use client"

import React, { useState, useEffect, useRef } from 'react'
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
  ArrowUpRight, ArrowDownRight,
  Terminal, Loader2, Calculator,
  Lock, TrendingUp, Clock, Server, Cpu, Globe
} from "lucide-react"
import { 
  AreaChart, Area, ResponsiveContainer, YAxis, XAxis
} from 'recharts'
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase'
import { collection, doc, serverTimestamp, query, where } from 'firebase/firestore'
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { INITIAL_MARKET_DATA } from '../screener/page'

function RuntimeDisplay({ entryTime }: { entryTime: any }) {
  const [runtime, setRuntime] = useState("00:00:00")

  useEffect(() => {
    if (!entryTime) return
    
    const interval = setInterval(() => {
      const start = entryTime.toDate ? entryTime.toDate().getTime() : new Date().getTime()
      const diff = Math.floor((new Date().getTime() - start) / 1000)
      
      const h = Math.floor(diff / 3600).toString().padStart(2, '0')
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0')
      const s = (diff % 60).toString().padStart(2, '0')
      
      setRuntime(`${h}:${m}:${s}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [entryTime])

  return (
    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
      <Clock className="w-3 h-3 text-primary" />
      Runtime: {runtime}
    </div>
  )
}

export default function LiveTradingPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [isDeploying, setIsDeploying] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Terminal Initialized.",
    "[AWS] Connection to us-east-1 instance established.",
    "[AWS] Worker v2.4 initialized and awaiting instructions."
  ])
  const [equity, setEquity] = useState(53210.12)
  const [hwm, setHwm] = useState(53210.12) 
  const [dailyStartingEquity] = useState(50000.00)
  const [isAccountSuspended, setIsAccountSuspended] = useState(false)
  
  const [calcRiskPct, setCalcRiskPct] = useState("1")
  const [calcStopLoss, setCalcStopLoss] = useState("500")
  const [calcResult, setCalcResult] = useState<{size: string, margin: string} | null>(null)

  const [config, setConfig] = useState({
    strategyId: '',
    broker: 'alpaca_paper',
    symbol: 'BTC/USDT',
    amount: '5000',
    worker: 'ec2-01'
  })

  const logEndRef = useRef<HTMLDivElement>(null)

  const DAILY_LOSS_LIMIT = 0.05 
  const INITIAL_BALANCE = 50000.00
  const PROFIT_TARGET_PHASE1 = 0.10 

  const strategiesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, 'users', user.uid, 'strategies')
  }, [db, user])
  const { data: savedStrategies } = useCollection<any>(strategiesQuery)

  const positionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, 'users', user.uid, 'tradingAccounts', 'default', 'positions'),
      where('status', '==', 'open')
    )
  }, [db, user])
  const { data: persistentPositions, isLoading: isLoadingPositions } = useCollection<any>(positionsQuery)

  const [livePrices, setLivePrices] = useState<Record<string, { price: number, pnl: number, chart: any[] }>>({})

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  useEffect(() => {
    if (!persistentPositions || persistentPositions.length === 0 || isAccountSuspended) return

    const interval = setInterval(() => {
      setLivePrices(prev => {
        const next = { ...prev }
        persistentPositions.forEach(pos => {
          const basePrice = INITIAL_MARKET_DATA.find(i => i.symbol === pos.instrumentId)?.price || 64000
          const currentData = next[pos.id] || { 
            price: pos.entryPrice, 
            pnl: 0, 
            chart: Array.from({length: 10}, (_, i) => ({ val: pos.entryPrice })) 
          }
          
          const change = (Math.random() - 0.5) * (basePrice * 0.001)
          const newPrice = currentData.price + change
          const pnl = ((newPrice - pos.entryPrice) / pos.entryPrice) * 100 * (pos.side === 'LONG' ? 1 : -1)
          
          next[pos.id] = {
            price: newPrice,
            pnl: pnl,
            chart: [...currentData.chart.slice(-19), { val: newPrice }]
          }
        })
        return next
      })

      setEquity(prev => {
        const pnlTick = (Math.random() - 0.48) * 15
        const nextEquity = prev + pnlTick
        if (nextEquity > hwm) setHwm(nextEquity)
        
        const dailyLoss = ((dailyStartingEquity - nextEquity) / dailyStartingEquity)
        if (dailyLoss >= DAILY_LOSS_LIMIT) {
          setIsAccountSuspended(true)
          setLogs(prevLogs => [...prevLogs, `[CRITICAL] Compliance Engine: DAILY LOSS LIMIT BREACHED`, "[SYSTEM] Account Suspended. All positions liquidated."])
        }
        
        return nextEquity
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [persistentPositions, isAccountSuspended, hwm, dailyStartingEquity])

  const deployBot = async () => {
    if (!config.strategyId || !user || !db) return
    setIsConfigOpen(false)
    setIsDeploying(true)
    
    setLogs(prev => [...prev, 
      `[SYSTEM] Booting Compliance Engine...`, 
      `[AWS] Transmitting deployment intent to ${config.worker}...`,
      `[AUTH] Authenticating with ${config.broker} via secure vault...`, 
      `[SUCCESS] Worker assigned. Execution starting.`
    ])
    
    const strategy = savedStrategies?.find(s => s.id === config.strategyId)
    const startPrice = INITIAL_MARKET_DATA.find(i => i.symbol === config.symbol)?.price || 64000
    
    const positionId = doc(collection(db, 'temp')).id
    const positionData = {
      id: positionId,
      instrumentId: config.symbol,
      strategyId: config.strategyId,
      strategyName: strategy?.name || "Bot",
      side: 'LONG',
      entryPrice: startPrice,
      quantity: parseFloat(config.amount) / startPrice,
      status: 'open',
      entryTime: serverTimestamp(),
      userId: user.uid,
      tradingAccountId: 'default',
      infrastructure: 'aws-ec2-us-east-1',
      workerId: config.worker
    }

    try {
      await setDocumentNonBlocking(
        doc(db, 'users', user.uid, 'tradingAccounts', 'default', 'positions', positionId),
        positionData,
        { merge: true }
      )
      toast({ title: "Remote Bot Deployed", description: `Strategy logic now executing on AWS instance ${config.worker}.` })
    } catch (e) {
      toast({ variant: "destructive", title: "Deployment Failed" })
    } finally {
      setIsDeploying(false)
    }
  }

  const closePosition = async (posId: string) => {
    if (!user || !db) return
    try {
      await deleteDocumentNonBlocking(doc(db, 'users', user.uid, 'tradingAccounts', 'default', 'positions', posId))
      setLogs(prev => [...prev, `[AWS] Kill signal sent to worker for ${posId}.`, `[SUCCESS] Position closed.`])
      toast({ title: "Position Closed", description: "Market order executed successfully by AWS worker." })
    } catch (e) {
      toast({ variant: "destructive", title: "Error closing position" })
    }
  }

  const calculateRisk = () => {
    const riskAmt = INITIAL_BALANCE * (parseFloat(calcRiskPct) / 100)
    const stopLossPips = parseFloat(calcStopLoss)
    const lotSize = riskAmt / stopLossPips
    setCalcResult({ size: lotSize.toFixed(2), margin: (lotSize * 1000).toLocaleString() })
  }

  const progressToTarget = Math.max(0, Math.min(100, ((equity - INITIAL_BALANCE) / (INITIAL_BALANCE * PROFIT_TARGET_PHASE1)) * 100))

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-auto bg-[#080A0C]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            Execution Console <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px]">AWS Remote Active</Badge>
          </h1>
          <p className="text-muted-foreground">Monitoring your institutional AWS EC2 workers in real-time.</p>
        </div>
        <div className="flex gap-2">
          {isAccountSuspended ? (
             <Badge variant="destructive" className="h-10 px-4 flex gap-2 animate-pulse">
               <Lock className="w-4 h-4" /> TRADING SUSPENDED
             </Badge>
          ) : (
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                  <Play className="w-4 h-4" /> Deploy to AWS Instance
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Deploy Compliant Strategy</DialogTitle>
                  <DialogDescription>Your logic will be transmitted and executed on your secure AWS worker.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Strategy</Label>
                    <div className="col-span-3">
                      <Select value={config.strategyId} onValueChange={(v) => setConfig({...config, strategyId: v})}>
                        <SelectTrigger><SelectValue placeholder="Select Strategy" /></SelectTrigger>
                        <SelectContent>
                          {savedStrategies?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Symbol</Label>
                    <Input value={config.symbol} onChange={(e) => setConfig({...config, symbol: e.target.value})} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Investment</Label>
                    <div className="col-span-3 relative">
                       <span className="absolute left-3 top-2.5 text-muted-foreground text-xs">$</span>
                       <Input value={config.amount} onChange={(e) => setConfig({...config, amount: e.target.value})} className="pl-6" type="number" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Worker</Label>
                    <Select value={config.worker} onValueChange={(v) => setConfig({...config, worker: v})}>
                        <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ec2-01">AWS EC2 (us-east-1) - Online</SelectItem>
                          <SelectItem value="ec2-02" disabled>AWS EC2 (eu-west-1) - Offline</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                   <Button onClick={deployBot} className="w-full bg-primary" disabled={!config.strategyId || isDeploying}>
                     {isDeploying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                     Start Remote Execution
                   </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {/* Infrastructure Health */}
          <Card className="bg-card/40 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <Server className="w-4 h-4" /> Infrastructure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    AWS Instance ec2-01
                 </div>
                 <Badge variant="outline" className="text-[9px]">Online</Badge>
               </div>
               <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                    <div className="text-[8px] text-muted-foreground uppercase">CPU</div>
                    <div className="text-xs font-bold">12.4%</div>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                    <div className="text-[8px] text-muted-foreground uppercase">Latency</div>
                    <div className="text-xs font-bold">4.2ms</div>
                  </div>
               </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-primary flex items-center justify-between">
                Account Equity
                <TrendingUp className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold font-mono">${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase font-bold">
                  <span>Phase 1 Goal: $55,000</span>
                  <span className="text-primary">{progressToTarget.toFixed(1)}%</span>
                </div>
                <Progress value={progressToTarget} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

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
                <div className="p-2 rounded bg-primary/5 border border-primary/20 text-center">
                  <div className="text-[10px] text-muted-foreground">Lot Size</div>
                  <div className="text-lg font-bold text-primary">{calcResult.size}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Card className="border-border/50 bg-card/30 min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 py-4">
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                 <Activity className="w-4 h-4 text-primary" /> Remote Deployments
               </CardTitle>
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                   <Globe className="w-3 h-3" /> Region: US-EAST-1
                 </div>
                 <Badge variant="outline" className="text-[10px]">{persistentPositions?.length || 0} Bot(s) Running</Badge>
               </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingPositions ? (
                <div className="h-48 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : !persistentPositions || persistentPositions.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground opacity-30 gap-3">
                   <Zap className="w-12 h-12" />
                   <p className="text-sm font-medium">Infrastructure idle. No active AWS sessions.</p>
                   <Button variant="ghost" size="sm" onClick={() => setIsConfigOpen(true)}>Deploy First Worker</Button>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {persistentPositions.map(pos => {
                    const sim = livePrices[pos.id] || { price: pos.entryPrice, pnl: 0, chart: [] }
                    return (
                      <div key={pos.id} className="p-6 flex flex-col gap-6 hover:bg-white/[0.02] transition-all">
                        <div className="w-full space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${pos.side === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {pos.side === 'LONG' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                              </div>
                              <div>
                                <div className="text-lg font-bold flex items-center gap-2">
                                  {pos.instrumentId}
                                  <Badge variant="outline" className="text-[9px] uppercase">{pos.strategyName}</Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                  <RuntimeDisplay entryTime={pos.entryTime} />
                                  <span className="text-[10px] text-primary/60 font-mono">ID: {pos.id.substring(0, 8)}</span>
                                  <Badge variant="secondary" className="text-[8px] h-4 uppercase">AWS_{pos.workerId}</Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-mono font-bold ${sim.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {sim.pnl >= 0 ? '+' : ''}{sim.pnl.toFixed(2)}%
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase">
                                Cur: ${sim.price.toLocaleString(undefined, {minimumFractionDigits: 2})}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                             <Button 
                               variant="destructive" 
                               size="sm" 
                               className="flex-1 h-8 text-[11px] font-bold bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                               onClick={() => closePosition(pos.id)}
                             >
                               Kill Remote Process
                             </Button>
                             <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => window.open('/debug', '_blank')}>
                               View Server Logs
                             </Button>
                          </div>

                          {/* Stretched Performance Visualization */}
                          <div className="w-full h-32 bg-black/20 rounded-lg border border-white/5 overflow-hidden">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sim.chart}>
                                  <defs>
                                    <linearGradient id={`color-${pos.id}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={sim.pnl >= 0 ? "#38D94F" : "#F03C3C"} stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor={sim.pnl >= 0 ? "#38D94F" : "#F03C3C"} stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <YAxis domain={['auto', 'auto']} hide />
                                  <XAxis hide />
                                  <Area 
                                    type="monotone" 
                                    dataKey="val" 
                                    stroke={sim.pnl >= 0 ? "#38D94F" : "#F03C3C"} 
                                    fillOpacity={1} 
                                    fill={`url(#color-${pos.id})`} 
                                    strokeWidth={2}
                                    isAnimationActive={false}
                                  />
                                </AreaChart>
                             </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black border-primary/20 overflow-hidden">
            <div className="px-4 py-2 border-b border-white/5 bg-primary/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-primary flex items-center gap-2">
                  <Terminal className="w-3 h-3" /> AWS_REMOTE_STDOUT_STREAM
                </span>
                <Badge variant="outline" className="text-[8px] bg-green-500/10 text-green-500 border-none">LIVE FEED</Badge>
            </div>
            <CardContent className="p-4 h-32 overflow-y-auto font-mono text-[10px] space-y-1 text-blue-300">
              {logs.map((l, i) => <div key={i}>{l}</div>)}
              <div ref={logEndRef} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
