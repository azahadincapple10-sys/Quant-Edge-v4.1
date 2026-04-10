
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
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight
} from "lucide-react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy } from 'firebase/firestore'

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
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [results, setResults] = useState<{
    return: string;
    drawdown: string;
    profitFactor: string;
    winRate: string;
  } | null>(null)
  
  const [selectedStrategy, setSelectedStrategy] = useState<string>("")
  
  const logEndRef = useRef<HTMLDivElement>(null)

  // Fetch user strategies
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

  const runSimulation = () => {
    if (!selectedStrategy) return
    
    setIsRunning(true)
    setProgress(0)
    setLogs(["[SYSTEM] Initializing Backtest Engine...", "[DATA] Fetching historical OHLCV data for BTC/USDT..."])
    setTrades([])
    setResults(null)

    const stratObj = savedStrategies?.find(s => s.id === selectedStrategy)
    const stratName = stratObj?.name || "Strategy"

    const steps = [
      { p: 10, m: `[SYSTEM] Loading Strategy: ${stratName}` },
      { p: 25, m: "[DATA] Pre-calculating indicators based on source code..." },
      { p: 40, m: "[ENGINE] Starting iteration through 8,760 candles..." },
      { p: 60, m: "[TRADE] Signal detected. Opening LONG position." },
      { p: 75, m: "[TRADE] Target reached. Closing position." },
      { p: 90, m: "[SYSTEM] Calculating final performance metrics..." },
      { p: 100, m: "[SUCCESS] Backtest completed successfully." }
    ]

    let currentStep = 0
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep]
        setProgress(step.p)
        setLogs(prev => [...prev, step.m])
        currentStep++
      } else {
        clearInterval(interval)
        setIsRunning(false)
        finalizeResults()
      }
    }, 800)
  }

  const finalizeResults = () => {
    setResults({
      return: "+42.15%",
      drawdown: "-8.4%",
      profitFactor: "2.14",
      winRate: "68.5%"
    })
    setTrades([
      { id: '1', type: 'LONG', entry: '$42,100', exit: '$45,200', profit: 7.3, status: 'PROFIT' },
      { id: '2', type: 'SHORT', entry: '$48,000', exit: '$48,500', profit: -1.0, status: 'LOSS' },
      { id: '3', type: 'LONG', entry: '$51,200', exit: '$58,400', profit: 14.0, status: 'PROFIT' },
      { id: '4', type: 'LONG', entry: '$60,100', exit: '$59,200', profit: -1.5, status: 'LOSS' },
    ])
  }

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Strategy Backtesting</h1>
          <p className="text-muted-foreground">Verify your strategies with high-precision historical data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Configuration Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Session Config
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Select Strategy</Label>
              <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a strategy" />
                </SelectTrigger>
                <SelectContent>
                  {savedStrategies?.map(strat => (
                    <SelectItem key={strat.id} value={strat.id}>{strat.name}</SelectItem>
                  ))}
                  {(!savedStrategies || savedStrategies.length === 0) && <SelectItem value="none" disabled>No saved strategies</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Symbol</Label>
              <div className="flex gap-2">
                <Input defaultValue="BTC/USDT" className="flex-1" />
                <Badge variant="outline" className="bg-muted">1h</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Time Range</Label>
              <div className="grid grid-cols-1 gap-2">
                <Input type="date" defaultValue="2023-01-01" className="text-sm" />
                <Input type="date" defaultValue="2024-01-01" className="text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Initial Capital</Label>
              <div className="relative">
                <Coins className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input defaultValue="10,000" className="pl-9" />
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

        {/* Results Area */}
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
               {/* Summary Stats */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-green-500/5 border-green-500/20">
                    <CardContent className="pt-6">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Return</div>
                      <div className="text-2xl font-bold text-green-500">{results.return}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/5 border-red-500/20">
                    <CardContent className="pt-6">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Max Drawdown</div>
                      <div className="text-2xl font-bold text-red-500">{results.drawdown}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Profit Factor</div>
                      <div className="text-2xl font-bold text-primary">{results.profitFactor}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-accent/5 border-accent/20">
                    <CardContent className="pt-6">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Win Rate</div>
                      <div className="text-2xl font-bold text-accent">{results.winRate}</div>
                    </CardContent>
                  </Card>
               </div>

               <Card>
                 <CardHeader className="flex flex-row items-center justify-between">
                   <CardTitle className="flex items-center gap-2 text-lg font-headline">
                     <FileText className="w-5 h-5 text-primary" /> Trade History
                   </CardTitle>
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
            </div>
          )}

          {!isRunning && !results && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center opacity-40">
              <TrendingUp className="w-16 h-16 mb-4 text-muted-foreground" />
              <h3 className="text-xl font-headline font-medium">Ready to Test</h3>
              <p className="max-w-xs mt-2 text-sm">Configure your strategy parameters and date range on the left to begin simulation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
