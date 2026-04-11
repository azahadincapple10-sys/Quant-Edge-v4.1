
"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, Wallet, Target, Zap, 
  Activity, ShieldCheck, Trophy, ArrowRight,
  ShieldAlert, Clock, CalendarDays, Database, Sparkles, Coins, Landmark
} from "lucide-react"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import Link from 'next/link'
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase'
import { doc, serverTimestamp, collection, query, where } from 'firebase/firestore'
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { useToast } from '@/hooks/use-toast'
import { INITIAL_MARKET_DATA } from '../screener/page'

const performanceData = [
  { time: '09:00', value: 45200 },
  { time: '10:00', value: 45800 },
  { time: '11:00', value: 45600 },
  { time: '12:00', value: 46200 },
  { time: '13:00', value: 47100 },
  { time: '14:00', value: 46800 },
  { time: '15:00', value: 47500 },
]

const topMovers = [
  { symbol: 'BTC/USDT', price: '64,231.50', change: '+4.2%', up: true },
  { symbol: 'ETH/USDT', price: '3,421.20', change: '+2.1%', up: true },
  { symbol: 'NVDA', price: '875.22', change: '+6.8%', up: true },
  { symbol: 'TSLA', price: '175.05', change: '-3.5%', up: false },
  { symbol: 'GOLD', price: '2,342.10', change: '+0.8%', up: true },
]

export default function DashboardPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()

  // 1. Fetch User Profile
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, 'users', user.uid)
  }, [db, user])
  const { data: profile, isLoading } = useDoc<any>(profileRef)

  // 2. Fetch Active Positions for Live Equity
  const positionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, 'users', user.uid, 'tradingAccounts', 'default', 'positions'), where('status', '==', 'open'))
  }, [db, user])
  const { data: positions } = useCollection<any>(positionsQuery)

  // 3. Fetch Trades for Trading Days calculation
  const tradesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, 'users', user.uid, 'tradingAccounts', 'default', 'trades')
  }, [db, user])
  const { data: trades } = useCollection<any>(tradesQuery)

  const [unrealizedPnl, setUnrealizedPnl] = useState(0)

  // Initialize new user with $100,000 if profile doesn't exist
  useEffect(() => {
    if (user && db && !isLoading && !profile) {
      const initialProfile = {
        id: user.uid,
        email: user.email,
        username: user.email?.split('@')[0] || 'Strategist',
        totalBalance: 100000,
        vaultBalance: 100000,
        tradingBalance: 0,
        currency: 'USD',
        timezone: 'UTC',
        propFirmMode: true,
        accountSize: "100000",
        challengePhase: "phase1",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      setDocumentNonBlocking(doc(db, 'users', user.uid), initialProfile, { merge: true })
    }
  }, [user, db, profile, isLoading])

  // Live PnL Simulation for Dashboard
  useEffect(() => {
    if (!positions || positions.length === 0) {
      setUnrealizedPnl(0)
      return
    }

    const interval = setInterval(() => {
      let total = 0
      positions.forEach(pos => {
        const baseData = INITIAL_MARKET_DATA.find(i => i.symbol === pos.instrumentId)
        const basePrice = baseData?.price || pos.entryPrice
        const currentPrice = basePrice + (Math.random() - 0.5) * (basePrice * 0.005)
        const diff = currentPrice - pos.entryPrice
        total += diff * (pos.quantity || 1) * (pos.side === 'LONG' ? 1 : -1)
      })
      setUnrealizedPnl(total)
    }, 3000)

    return () => clearInterval(interval)
  }, [positions])

  const balances = useMemo(() => ({
    vault: profile?.vaultBalance || 0,
    trading: profile?.tradingBalance || 0,
    liveEquity: (profile?.totalBalance || 100000) + unrealizedPnl,
    invested: positions?.reduce((acc: number, pos: any) => acc + (pos.investAmt || 0), 0) || 0
  }), [profile, unrealizedPnl, positions])

  // Calculate unique trading days
  const tradingDays = useMemo(() => {
    if (!trades || trades.length === 0) return 0
    const uniqueDays = new Set(trades.map((t: any) => {
      const date = t.timestamp?.toDate ? t.timestamp.toDate() : new Date()
      return date.toDateString()
    }))
    return uniqueDays.size
  }, [trades])

  const progress = useMemo(() => {
    if (!profile) return 0;
    const target = parseFloat(profile.accountSize || "100000")
    const current = balances.liveEquity
    const profit = current - target
    if (profit <= 0) return 0
    const goalPct = profile.challengePhase === 'phase1' ? 0.10 : 0.05
    const progressVal = (profit / (target * goalPct)) * 100
    return Math.min(Math.max(progressVal, 0), 100)
  }, [profile, balances.liveEquity])

  const seedDemoData = () => {
    if (!db || !user) return;
    const strategyId = "golden-cross-demo";
    const strategyData = {
      id: strategyId,
      name: "GoldenCross (EMA 8/21)",
      code: `class GoldenCross(Strategy):\n    def should_long(self):\n        short_ema = ta.ema(self.candles, 8)\n        long_ema = ta.ema(self.candles, 21)\n        return short_ema > long_ema`,
      language: 'python',
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    setDocumentNonBlocking(doc(db, 'users', user.uid, 'strategies', strategyId), strategyData, { merge: true });
    toast({ title: "Strategy Seeded", description: "GoldenCross has been added to your Strategy Library." });
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto p-6 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Terminal Dashboard</h1>
          <p className="text-muted-foreground">Institutional Trading Mode. Compliance: <span className="text-green-500 font-bold uppercase text-xs">Verified</span></p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={seedDemoData} className="gap-2 border-primary/40 bg-primary/5 hover:bg-primary/20 text-primary-foreground font-bold">
            <Sparkles className="w-4 h-4 text-accent" /> Seed Institutional Strategy
          </Button>
          <Badge variant="outline" className="px-3 py-1 bg-primary/10 border-primary/20 text-primary">PROP FIRM ACTIVE</Badge>
          <Badge variant="secondary" className="px-3 py-1 uppercase font-bold text-[10px]">{profile?.challengePhase || 'Phase 1'}</Badge>
        </div>
      </div>

      {/* Account Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/10 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-primary">Live Equity (Inc. PnL)</CardTitle>
            <Coins className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">${balances.liveEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">
              {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)} Floating PnL
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Vault Balance (Idle)</CardTitle>
            <Landmark className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">${balances.vault.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Funds in Cold Storage</p>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-accent">Trading Balance</CardTitle>
            <Zap className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-accent">${balances.trading.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Liquid Execution Funds</p>
          </CardContent>
        </Card>
      </div>

      {/* Institutional Prop Firm Progress Card */}
      <Card className="bg-primary/5 border-primary/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4">
           <Trophy className="w-16 h-16 text-primary opacity-5" />
        </div>
        <CardContent className="pt-6">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-3 space-y-1">
                 <h2 className="text-lg font-bold flex items-center gap-2">
                   <ShieldCheck className="w-5 h-5 text-primary" /> Challenge: {profile?.challengePhase === 'funded' ? 'HWM Mode' : profile?.challengePhase === 'phase2' ? 'Phase 2' : 'Phase 1'}
                 </h2>
                 <p className="text-xs text-muted-foreground">Allocation: ${parseFloat(profile?.accountSize || "100000").toLocaleString()}</p>
                 <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-[9px] h-4">MIN 5 DAYS</Badge>
                    <Badge variant="outline" className="text-[9px] h-4">CONSISTENCY REQ.</Badge>
                 </div>
              </div>
              
              <div className="lg:col-span-6 space-y-3">
                 <div className="flex justify-between text-xs font-bold uppercase">
                    <span className="flex items-center gap-1.5"><Target className="w-3 h-3 text-primary" /> Progress to Goal</span>
                    <span className="text-primary">{progress.toFixed(1)}%</span>
                 </div>
                 <Progress value={progress} className="h-2.5" />
                 <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Current Equity: ${balances.liveEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    <span>Target: ${(parseFloat(profile?.accountSize || "100000") * (1 + (profile?.challengePhase === 'phase1' ? 0.10 : profile?.challengePhase === 'phase2' ? 0.05 : 0))).toLocaleString()}</span>
                 </div>
              </div>

              <div className="lg:col-span-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs px-3 py-2 rounded bg-background border border-border">
                   <div className="flex items-center gap-2 text-muted-foreground">
                     <CalendarDays className="w-3" /> Trading Days
                   </div>
                   <span className="font-bold">{tradingDays} / 5</span>
                </div>
                <Link href="/live" className="w-full">
                  <Button variant="secondary" className="w-full h-9 gap-2 text-xs font-bold hover:bg-primary/20 transition-colors">
                     Open Execution Console <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
           </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Equity Curve (HWM Trailing)</CardTitle>
            <Badge variant="outline" className="text-[10px]">Real-time Feed</Badge>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#235299" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#235299" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2e2e2e" />
                <XAxis dataKey="time" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={['dataMin - 100', 'dataMax + 100']} hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1E22', border: '1px solid #2e2e2e', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="value" stroke="#235299" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compliance Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
               <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
               <div className="text-xs">
                 <div className="font-bold text-orange-500 uppercase mb-1">Consistency Warning</div>
                 {tradingDays < 5 ? `You need ${5 - tradingDays} more active trading days to satisfy consistency rules.` : 'Trading day requirement met.'}
               </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Market Movers</h4>
              {topMovers.map((mover) => (
                <div key={mover.symbol} className="flex items-center justify-between group cursor-pointer hover:bg-muted/30 p-1.5 rounded transition-colors">
                  <div>
                    <div className="text-sm font-bold">{mover.symbol}</div>
                    <div className="text-[10px] text-muted-foreground">${mover.price}</div>
                  </div>
                  <Badge variant={mover.up ? "default" : "destructive"} className={mover.up ? "bg-green-500/10 text-green-500 border-none h-6" : "bg-red-500/10 text-red-500 border-none h-6"}>
                    {mover.change}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
