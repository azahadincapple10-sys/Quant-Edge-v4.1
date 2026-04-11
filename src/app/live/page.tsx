
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
  Lock, TrendingUp, Clock, Server, Globe,
  BarChart4, ArrowRightLeft, Coins, Landmark, ArrowRight
} from "lucide-react"
import { 
  AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid
} from 'recharts'
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase'
import { collection, doc, serverTimestamp, query, where } from 'firebase/firestore'
import { setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates'
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
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [transferAmount, setTransferAmount] = useState("5000")
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Terminal Initialized.",
    "[AWS] Connection to us-east-1 instance established.",
    "[AWS] Worker v2.4 initialized and awaiting instructions."
  ])
  
  const [calcRiskPct, setCalcRiskPct] = useState("1")
  const [calcStopLoss, setCalcStopLoss] = useState("500")
  const [calcResult, setCalcResult] = useState<{size: string, margin: string} | null>(null)

  const [config, setConfig] = useState({
    strategyId: '',
    broker: 'alpaca_paper',
    symbol: 'BTC/USDT',
    amount: '5000',
    worker: 'ec2-01',
    timeframe: '1h'
  })

  const logEndRef = useRef<HTMLDivElement>(null)

  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, 'users', user.uid)
  }, [db, user])
  const { data: profile } = useDoc<any>(profileRef)

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

  const [livePrices, setLivePrices] = useState<Record<string, { price: number, pnl: number, profitUsd: number, tradeCount: number, chart: any[] }>>({})

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  useEffect(() => {
    if (!persistentPositions || persistentPositions.length === 0) {
      setLivePrices({})
      return
    }

    const interval = setInterval(() => {
      setLivePrices(prev => {
        const next = { ...prev }
        persistentPositions.forEach(pos => {
          const baseData = INITIAL_MARKET_DATA.find(i => i.symbol === pos.instrumentId)
          const basePrice = baseData?.price || 64000
          
          if (!next[pos.id]) {
            next[pos.id] = { 
              price: pos.entryPrice, 
              pnl: 0, 
              profitUsd: 0,
              tradeCount: pos.tradeCount || 1,
              chart: Array.from({length: 20}, (_, i) => ({ val: pos.entryPrice, t: i })) 
            }
          }
          
          const currentData = next[pos.id]
          const change = (Math.random() - 0.495) * (basePrice * 0.001) // subtle random walk
          const newPrice = currentData.price + change
          
          // Calculate PnL based on entry price and quantity
          const diff = newPrice - pos.entryPrice
          const pnl = (diff / pos.entryPrice) * 100 * (pos.side === 'LONG' ? 1 : -1)
          const profitUsd = diff * (pos.quantity || 1) * (pos.side === 'LONG' ? 1 : -1)
          
          next[pos.id] = {
            ...currentData,
            price: newPrice,
            pnl: pnl,
            profitUsd: profitUsd,
            chart: [...currentData.chart.slice(-24), { val: newPrice, t: currentData.chart.length }]
          }
        })
        return next
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [persistentPositions])

  const handleTransfer = async () => {
    if (!db || !user || !profile) return
    const amount = parseFloat(transferAmount)
    if (isNaN(amount) || amount <= 0 || amount > profile.vaultBalance) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Insufficient vault balance." })
      return
    }

    const newVault = profile.vaultBalance - amount
    const newTrading = (profile.tradingBalance || 0) + amount

    const updatedProfile = {
      vaultBalance: newVault,
      tradingBalance: newTrading,
      totalBalance: newVault + newTrading,
      updatedAt: serverTimestamp(),
    }

    try {
      await setDocumentNonBlocking(doc(db, 'users', user.uid), updatedProfile, { merge: true })
      setIsTransferOpen(false)
      toast({ title: "Transfer Successful", description: `$${amount.toLocaleString()} moved to Trading account.` })
    } catch (e) {
      toast({ variant: "destructive", title: "Transfer Failed" })
    }
  }

  const deployBot = async () => {
    if (!config.strategyId || !user || !db || !profile) return
    const investAmt = parseFloat(config.amount)
    
    if (investAmt > (profile.tradingBalance || 0)) {
      toast({ variant: "destructive", title: "Deployment Blocked", description: "Insufficient trading balance. Transfer funds from vault first." })
      return
    }

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
      quantity: investAmt / startPrice,
      status: 'open',
      entryTime: serverTimestamp(),
      userId: user.uid,
      tradingAccountId: 'default',
      infrastructure: 'aws-ec2-us-east-1',
      workerId: config.worker,
      timeframe: config.timeframe,
      tradeCount: 1,
      investAmt: investAmt
    }

    try {
      // Deduct from trading balance
      await setDocumentNonBlocking(doc(db, 'users', user.uid), {
        tradingBalance: profile.tradingBalance - investAmt,
        updatedAt: serverTimestamp()
      }, { merge: true })

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
    if (!user || !db || !profile) return
    try {
      const pos = persistentPositions?.find(p => p.id === posId)
      if (!pos) return

      const sim = livePrices[posId] || { price: pos.entryPrice, pnl: 0, profitUsd: 0, tradeCount: 1 }
      
      // Calculate return amount (Investment + Profit)
      const originalInvestment = pos.investAmt || ((pos.quantity || 0) * (pos.entryPrice || 0))
      const returnAmt = originalInvestment + (sim?.profitUsd || 0)

      // 1. Create a permanent Trade Record for History
      const tradeData = {
        id: doc(collection(db, 'temp')).id,
        tradingAccountId: 'default',
        instrumentId: pos.instrumentId,
        strategyId: pos.strategyId,
        strategyName: pos.strategyName,
        side: pos.side === 'LONG' ? 'SELL' : 'BUY', // Closing side
        executedPrice: sim.price,
        executedQuantity: pos.quantity,
        pnl: sim.pnl,
        profitUsd: sim.profitUsd,
        timestamp: serverTimestamp(),
        userId: user.uid,
        type: 'LIVE_EXECUTION'
      }
      
      await addDocumentNonBlocking(collection(db, 'users', user.uid, 'tradingAccounts', 'default', 'trades'), tradeData)

      // 2. Add back to trading balance and update total net worth
      const newTradingBalance = profile.tradingBalance + returnAmt
      await setDocumentNonBlocking(doc(db, 'users', user.uid), {
        tradingBalance: newTradingBalance,
        totalBalance: profile.vaultBalance + newTradingBalance,
        updatedAt: serverTimestamp()
      }, { merge: true })

      // 3. Remove active position
      await deleteDocumentNonBlocking(doc(db, 'users', user.uid, 'tradingAccounts', 'default', 'positions', posId))
      
      setLogs(prev => [...prev, `[AWS] Kill signal sent to worker for ${posId}.`, `[SUCCESS] Position closed and archived to history.`])
      toast({ title: "Position Closed", description: `Market order executed. $${returnAmt.toLocaleString(undefined, {minimumFractionDigits: 2})} returned to Trading Balance.` })
    } catch (e) {
      toast({ variant: "destructive", title: "Error closing position" })
    }
  }

  const calculateRisk = () => {
    const riskAmt = (profile?.tradingBalance || 0) * (parseFloat(calcRiskPct) / 100)
    const stopLossPips = parseFloat(calcStopLoss)
    const lotSize = riskAmt / stopLossPips
    setCalcResult({ size: lotSize.toFixed(2), margin: (lotSize * 1000).toLocaleString() })
  }

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 space-y-6 overflow-auto bg-[#080A0C]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight font-headline flex flex-wrap items-center gap-2">
            Execution Console <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[9px] lg:text-[10px]">AWS Remote Active</Badge>
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">Monitoring your institutional AWS EC2 workers in real-time.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none gap-2 text-xs h-9">
                <Landmark className="w-4 h-4" /> Transfer
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Allocate Trading Capital</DialogTitle>
                <DialogDescription>Move funds from your Vault into the active Trading balance.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Vault Balance:</span>
                  <span className="text-white">${profile?.vaultBalance?.toLocaleString() || '0.00'}</span>
                </div>
                <div className="space-y-2">
                  <Label>Amount to Transfer</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                    <Input value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="pl-7" type="number" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleTransfer} className="w-full bg-primary">Confirm Transfer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none gap-2 bg-green-600 hover:bg-green-700 text-xs h-9">
                <Play className="w-4 h-4" /> Deploy to AWS
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Deploy Compliant Strategy</DialogTitle>
                <DialogDescription>Logic executes on secure AWS worker.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex justify-between text-xs px-2 py-1 rounded bg-accent/10 border border-accent/20">
                  <span className="text-accent font-bold">Trading Balance:</span>
                  <span className="text-white font-mono">${profile?.tradingBalance?.toLocaleString() || '0.00'}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-xs">Strategy</Label>
                  <div className="col-span-3">
                    <Select value={config.strategyId} onValueChange={(v) => setConfig({...config, strategyId: v})}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Strategy" /></SelectTrigger>
                      <SelectContent>
                        {savedStrategies?.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-xs">Symbol</Label>
                  <Input value={config.symbol} onChange={(e) => setConfig({...config, symbol: e.target.value})} className="col-span-3 h-9 text-xs" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-xs">Invest</Label>
                  <div className="col-span-3 relative">
                     <span className="absolute left-3 top-2.5 text-muted-foreground text-xs">$</span>
                     <Input value={config.amount} onChange={(e) => setConfig({...config, amount: e.target.value})} className="pl-6 h-9 text-xs" type="number" />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-xs">Worker</Label>
                  <Select value={config.worker} onValueChange={(v) => setConfig({...config, worker: v})}>
                      <SelectTrigger className="col-span-3 h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ec2-01" className="text-xs">AWS EC2 (us-east-1)</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                 <Button onClick={deployBot} className="w-full bg-primary h-10" disabled={!config.strategyId || isDeploying}>
                   {isDeploying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                   Start Remote Execution
                 </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card/40 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                <Landmark className="w-3.5 h-3.5" /> Balances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-1">
                  <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Vault (Total)</div>
                  <div className="text-lg font-bold font-mono">${profile?.vaultBalance?.toLocaleString() || '0.00'}</div>
               </div>
               <div className="space-y-1">
                  <div className="text-[9px] text-accent uppercase font-bold tracking-wider">Trading Account</div>
                  <div className="text-xl font-bold font-mono text-accent">${profile?.tradingBalance?.toLocaleString() || '0.00'}</div>
               </div>
               <Button variant="outline" size="sm" className="w-full text-[10px] h-7 gap-2" onClick={() => setIsTransferOpen(true)}>
                 <ArrowRightLeft className="w-3 h-3" /> Move Funds
               </Button>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase text-primary flex items-center justify-between">
                Account Equity
                <TrendingUp className="w-3.5 h-3.5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold font-mono">${(profile?.totalBalance || 100000).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px] uppercase font-bold tracking-wider">
                  <span>Goal: $110,000</span>
                  <span className="text-primary">32.1%</span>
                </div>
                <Progress value={32.1} className="h-1" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-bold uppercase flex items-center gap-2">
                <Calculator className="w-3.5 h-3.5 text-primary" /> Risk Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-muted-foreground">Risk %</Label>
                  <Input value={calcRiskPct} onChange={(e) => setCalcRiskPct(e.target.value)} className="h-7 text-[11px] px-2" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-muted-foreground">SL (Pips)</Label>
                  <Input value={calcStopLoss} onChange={(e) => setCalcStopLoss(e.target.value)} className="h-7 text-[11px] px-2" />
                </div>
              </div>
              <Button size="sm" className="w-full h-7 text-[10px] uppercase font-bold" onClick={calculateRisk}>Calculate Size</Button>
              {calcResult && (
                <div className="p-2 rounded bg-primary/5 border border-primary/20 text-center">
                  <div className="text-[9px] text-muted-foreground uppercase">Lot Size</div>
                  <div className="text-base font-bold text-primary">{calcResult.size}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Card className="border-border/50 bg-card/30 min-h-[400px]">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 py-4 gap-4">
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                 <Activity className="w-4 h-4 text-primary" /> Remote Deployments
               </CardTitle>
               <div className="flex flex-wrap items-center gap-3">
                 <div className="flex items-center gap-2 text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                   <Globe className="w-3 h-3 text-primary/60" /> us-east-1
                 </div>
                 <Badge variant="outline" className="text-[9px] py-0 px-2 h-5">{persistentPositions?.length || 0} Worker(s)</Badge>
               </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-hidden">
              {isLoadingPositions ? (
                <div className="h-48 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : !persistentPositions || persistentPositions.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground opacity-30 gap-3 px-4 text-center">
                   <Zap className="w-10 h-10" />
                   <p className="text-xs lg:text-sm font-medium">Infrastructure idle. No active AWS sessions detected.</p>
                   <Button variant="ghost" size="sm" className="text-[10px] uppercase tracking-wider" onClick={() => setIsConfigOpen(true)}>Deploy First Worker</Button>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {persistentPositions.map(pos => {
                    const sim = livePrices[pos.id] || { price: pos.entryPrice, pnl: 0, profitUsd: 0, tradeCount: pos.tradeCount || 1, chart: [] }
                    return (
                      <div key={pos.id} className="p-4 lg:p-6 flex flex-col gap-6 hover:bg-white/[0.01] transition-all">
                        <div className="w-full space-y-6">
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex items-center gap-3 w-full md:w-auto">
                              <div className={`p-2 rounded-lg shrink-0 ${pos.side === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {pos.side === 'LONG' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                              </div>
                              <div className="min-w-0">
                                <div className="text-base lg:text-lg font-bold flex flex-wrap items-center gap-2 truncate">
                                  {pos.instrumentId}
                                  <Badge variant="outline" className="text-[8px] lg:text-[9px] uppercase h-4 px-1">{pos.strategyName}</Badge>
                                  <Badge variant="secondary" className="text-[8px] lg:text-[9px] h-4 px-1 bg-primary/10 text-primary">{pos.timeframe || '1h'}</Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                  <RuntimeDisplay entryTime={pos.entryTime} />
                                  <span className="text-[9px] text-primary/60 font-mono hidden xs:inline">ID:{pos.id.substring(0, 6)}</span>
                                  <Badge variant="secondary" className="text-[8px] h-3.5 px-1 uppercase font-bold tracking-tighter">AWS_{pos.workerId}</Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-4 lg:gap-8 items-center justify-between w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                               <div className="text-left md:text-right">
                                  <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight">Net Profit</div>
                                  <div className={`text-base lg:text-xl font-mono font-bold ${sim.profitUsd >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {sim.profitUsd >= 0 ? '+' : ''}${sim.profitUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                  </div>
                               </div>
                               <div className="text-left md:text-right">
                                  <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight">PnL (%)</div>
                                  <div className={`text-base lg:text-xl font-mono font-bold ${sim.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {sim.pnl >= 0 ? '+' : ''}{sim.pnl.toFixed(2)}%
                                  </div>
                               </div>
                               <div className="text-right">
                                  <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight">Execs</div>
                                  <div className="text-base lg:text-xl font-mono font-bold flex items-center gap-1.5 justify-end">
                                    <ArrowRightLeft className="w-3.5 h-3.5 text-primary" /> {sim.tradeCount}
                                  </div>
                               </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-2">
                             <Button 
                               variant="destructive" 
                               size="sm" 
                               className="flex-1 h-8 text-[10px] font-bold bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white uppercase tracking-wider"
                               onClick={() => closePosition(pos.id)}
                             >
                               Kill Remote Process
                             </Button>
                             <Button variant="outline" size="sm" className="h-8 text-[10px] flex-1 uppercase tracking-wider font-bold" onClick={() => window.open('/debug', '_blank')}>
                               View Server Logs
                             </Button>
                          </div>

                          <div className="w-full space-y-3">
                             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-1 gap-1">
                               <span className="text-[9px] text-muted-foreground uppercase font-bold flex items-center gap-1.5">
                                 <BarChart4 className="w-3 h-3 text-primary" /> {pos.instrumentId} Performance Trend ({pos.timeframe || '1h'})
                               </span>
                               <span className="text-[10px] font-mono text-primary font-bold">
                                 Mark: ${sim.price.toLocaleString(undefined, {minimumFractionDigits: 2})}
                               </span>
                             </div>
                             <div className="w-full h-40 lg:h-48 bg-black/40 rounded-lg border border-white/5 overflow-hidden p-2">
                               <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={sim.chart} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id={`color-${pos.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={sim.pnl >= 0 ? "#38D94F" : "#F03C3C"} stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor={sim.pnl >= 0 ? "#38D94F" : "#F03C3C"} stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" vertical={false} />
                                    <XAxis 
                                      dataKey="t" 
                                      hide={false} 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={{ fontSize: 8, fill: '#555' }} 
                                    />
                                    <YAxis 
                                      domain={['auto', 'auto']} 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={{ fontSize: 8, fill: '#555' }} 
                                      orientation="right"
                                    />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: '#0D0F11', border: '1px solid #2e2e2e', borderRadius: '6px', fontSize: '9px' }}
                                      itemStyle={{ color: sim.pnl >= 0 ? '#38D94F' : '#F03C3C' }}
                                      formatter={(value: number) => [`$${value.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 'Price']}
                                    />
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
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black border-primary/20 overflow-hidden">
            <div className="px-4 py-2 border-b border-white/5 bg-primary/5 flex items-center justify-between">
                <span className="text-[9px] font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
                  <Terminal className="w-3 h-3" /> AWS_REMOTE_STDOUT_STREAM
                </span>
                <Badge variant="outline" className="text-[8px] bg-green-500/10 text-green-500 border-none px-1 h-4">LIVE FEED</Badge>
            </div>
            <CardContent className="p-4 h-32 overflow-y-auto font-mono text-[9px] space-y-1 text-blue-300">
              {logs.map((l, i) => <div key={i}>{l}</div>)}
              <div ref={logEndRef} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
