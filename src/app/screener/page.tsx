
"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, TrendingDown, Filter, Download, 
  ChevronRight, ArrowUpDown, Search, Star, Loader2,
  Globe, Zap, Activity, BrainCircuit, BarChart3,
  ShieldCheck, Flame, Layers
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export interface MarketItem {
  symbol: string;
  price: number;
  change: number;
  volume: string;
  rsi: number;
  status: string;
  market: 'crypto' | 'forex' | 'stocks' | 'commodities';
  isFavorite?: boolean;
  // Advanced Metrics
  rvol: number; // Relative Volume
  volatility: number;
  sentiment: number; // -1 to 1
  pattern?: string;
  // Asset Specific
  peRatio?: number; // Stocks
  fundingRate?: string; // Crypto
  pipValue?: string; // Forex
}

export const INITIAL_MARKET_DATA: MarketItem[] = [
  // CRYPTO
  { symbol: 'BTC/USDT', price: 64231.50, change: 4.2, volume: '2.4B', rsi: 65, status: 'Bullish', market: 'crypto', rvol: 1.2, volatility: 0.8, sentiment: 0.85, pattern: 'Cup & Handle', fundingRate: '0.01%' },
  { symbol: 'ETH/USDT', price: 3421.20, change: 2.1, volume: '1.1B', rsi: 58, status: 'Neutral', market: 'crypto', rvol: 0.9, volatility: 1.2, sentiment: 0.4, fundingRate: '0.008%' },
  { symbol: 'SOL/USDT', price: 142.55, change: -1.8, volume: '800M', rsi: 42, status: 'Bearish', market: 'crypto', rvol: 1.5, volatility: 2.1, sentiment: -0.2, pattern: 'Double Top', fundingRate: '0.015%' },
  
  // STOCKS
  { symbol: 'NVDA', price: 875.22, change: 6.8, volume: '45M', rsi: 78, status: 'Overbought', market: 'stocks', rvol: 2.4, volatility: 1.5, sentiment: 0.95, pattern: 'Breakout', peRatio: 72.4 },
  { symbol: 'AAPL', price: 182.41, change: 1.2, volume: '54M', rsi: 62, status: 'Bullish', market: 'stocks', rvol: 0.8, volatility: 0.4, sentiment: 0.6, peRatio: 28.1 },
  { symbol: 'TSLA', price: 175.05, change: -3.5, volume: '82M', rsi: 29, status: 'Oversold', market: 'stocks', rvol: 1.9, volatility: 2.5, sentiment: -0.8, pattern: 'Falling Wedge', peRatio: 41.2 },
  
  // FOREX
  { symbol: 'EUR/USD', price: 1.0845, change: 0.15, volume: '4.2T', rsi: 51, status: 'Neutral', market: 'forex', rvol: 0.7, volatility: 0.2, sentiment: 0.1, pipValue: '10.00' },
  { symbol: 'GBP/JPY', price: 191.22, change: -0.42, volume: '1.8T', rsi: 38, status: 'Bearish', market: 'forex', rvol: 1.1, volatility: 0.9, sentiment: -0.3, pipValue: '6.50' },
  
  // COMMODITIES
  { symbol: 'GOLD (XAU)', price: 2342.10, change: 0.85, volume: '420B', rsi: 68, status: 'Bullish', market: 'commodities', rvol: 1.3, volatility: 0.5, sentiment: 0.7, pattern: 'Ascending Triangle' },
  { symbol: 'CRUDE OIL', price: 82.45, change: -1.2, volume: '180B', rsi: 44, status: 'Neutral', market: 'commodities', rvol: 0.9, volatility: 1.8, sentiment: -0.1 }
]

export default function ScreenerPage() {
  const [data, setData] = useState<MarketItem[]>(INITIAL_MARKET_DATA)
  const [searchTerm, setSearchTerm] = useState("")
  const [marketFilter, setMarketFilter] = useState("all")
  const [timeframe, setTimeframe] = useState("1h")
  const [sortConfig, setSortConfig] = useState<{ key: keyof MarketItem; direction: 'asc' | 'desc' } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Simulate High-Speed Data Updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData(current => current.map(item => {
        const volatilityFactor = item.market === 'crypto' ? 0.003 : 0.0008
        const priceChange = item.price * (Math.random() - 0.5) * volatilityFactor
        const newPrice = item.price + priceChange
        const newRsi = Math.min(Math.max(item.rsi + (Math.random() - 0.5) * 3, 0), 100)
        
        let status = 'Neutral'
        if (newRsi > 70) status = 'Overbought'
        else if (newRsi < 30) status = 'Oversold'
        else if (item.change > 2) status = 'Bullish'
        else if (item.change < -2) status = 'Bearish'

        return {
          ...item,
          price: newPrice,
          rsi: Math.round(newRsi),
          status
        }
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleSort = (key: keyof MarketItem) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const filteredAndSortedData = useMemo(() => {
    let result = data.filter(item => {
      const matchesSearch = item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesMarket = marketFilter === 'all' || item.market === marketFilter
      return matchesSearch && matchesMarket
    })

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        if (aValue === undefined || bValue === undefined) return 0
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [data, searchTerm, marketFilter, sortConfig])

  const handleExport = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: "Export Success",
        description: `CSV file generated.`
      })
    }, 1200)
  }

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 space-y-6 overflow-auto bg-[#0A0C0E]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            Institutional Screener <Badge variant="outline" className="hidden xs:flex bg-primary/10 border-primary/20 text-primary text-[10px] uppercase">ULTRA-LOW LATENCY</Badge>
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">Unified market intelligence for Stocks, Forex, Crypto, and Commodities.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none gap-2 border-white/10 bg-white/5 text-[11px]" onClick={handleExport} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-[11px]">
             Save Preset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Market Intelligence Sidebar */}
        <div className="lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-[10px] font-bold uppercase text-primary flex items-center gap-2">
                <BrainCircuit className="w-3.5 h-3.5" /> AI Sentiment Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4">
               {[
                 { label: 'Market Sentiment', value: 'Greed', score: 72, color: 'bg-green-500' },
                 { label: 'Vol Correlation', value: 'High', score: 85, color: 'bg-primary' },
                 { label: 'Retail Interest', value: 'Extreme', score: 91, color: 'bg-orange-500' }
               ].map((stat) => (
                 <div key={stat.label} className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-bold uppercase text-muted-foreground">
                      <span>{stat.label}</span>
                      <span className="text-white">{stat.value}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${stat.color}`} style={{ width: `${stat.score}%` }} />
                    </div>
                 </div>
               ))}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
             <CardHeader className="pb-2 px-4 pt-4">
               <CardTitle className="text-[10px] font-bold uppercase flex items-center gap-2">
                 <Flame className="w-3 h-3 text-orange-500" /> Hot Patterns Detect
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-2 px-4 pb-4">
                {[
                  { symbol: 'NVDA', pattern: 'Triangle', conf: 82 },
                  { symbol: 'GOLD', pattern: 'Golden Cross', conf: 94 }
                ].map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-background/50 border border-white/5">
                    <div className="text-[10px]">
                      <span className="font-bold text-white block">{p.symbol}</span>
                      <span className="text-muted-foreground text-[9px]">{p.pattern}</span>
                    </div>
                    <Badge variant="outline" className="text-[8px] h-4 bg-primary/10 border-primary/20">{p.conf}%</Badge>
                  </div>
                ))}
             </CardContent>
          </Card>
        </div>

        {/* Main Screener Table */}
        <Card className="lg:col-span-3 border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col">
          <CardHeader className="p-0 border-b border-border shrink-0">
            <Tabs value={marketFilter} onValueChange={setMarketFilter} className="w-full">
              <div className="px-4 py-4 lg:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <TabsList className="bg-background/50 h-8 p-1 w-full sm:w-auto flex overflow-x-auto justify-start">
                  <TabsTrigger value="all" className="text-[10px] px-2 flex-1 sm:flex-none">All</TabsTrigger>
                  <TabsTrigger value="stocks" className="text-[10px] px-2 flex-1 sm:flex-none">Stocks</TabsTrigger>
                  <TabsTrigger value="crypto" className="text-[10px] px-2 flex-1 sm:flex-none">Crypto</TabsTrigger>
                  <TabsTrigger value="forex" className="text-[10px] px-2 flex-1 sm:flex-none">Forex</TabsTrigger>
                  <TabsTrigger value="commodities" className="text-[10px] px-2 flex-1 sm:flex-none">Cmdty</TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                    <Input 
                      placeholder="Ticker..." 
                      className="pl-8 h-8 text-[11px] bg-background/50 border-white/5" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="w-[70px] h-8 text-[10px] bg-background/50 border-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15m" className="text-xs">15m</SelectItem>
                      <SelectItem value="1h" className="text-xs">1h</SelectItem>
                      <SelectItem value="4h" className="text-xs">4h</SelectItem>
                      <SelectItem value="1D" className="text-xs">1D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="cursor-pointer group text-[10px] uppercase font-bold" onClick={() => handleSort('symbol')}>
                      Symbol <ArrowUpDown className="inline w-2 h-2 ml-1 opacity-0 group-hover:opacity-100" />
                    </TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">Price</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">Change</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">RSI (14)</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">RVOL</TableHead>
                    <TableHead className="text-center text-[10px] uppercase font-bold">Pattern</TableHead>
                    <TableHead className="text-center text-[10px] uppercase font-bold">Sent.</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedData.map((row) => (
                    <TableRow key={row.symbol} className="border-border/40 hover:bg-white/[0.02] transition-colors group">
                      <TableCell className="text-center">
                        <Star className={`w-3 h-3 cursor-pointer hover:text-yellow-500 transition-colors ${row.isFavorite ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-[13px]">{row.symbol}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {row.market === 'stocks' && <span className="text-[8px] text-blue-400">P/E:{row.peRatio}</span>}
                            {row.market === 'crypto' && <span className="text-[8px] text-orange-400">FR:{row.fundingRate}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-[11px] font-medium">
                        {row.market === 'forex' ? row.price.toFixed(4) : row.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-[11px] font-bold ${row.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {row.change >= 0 ? '+' : ''}{row.change.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[9px] font-mono font-bold ${row.rsi > 70 ? 'text-red-400' : row.rsi < 30 ? 'text-green-400' : 'text-muted-foreground'}`}>{row.rsi}</span>
                          <div className="w-10 h-0.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full ${row.rsi > 70 ? 'bg-red-500' : row.rsi < 30 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${row.rsi}%` }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-mono text-[11px] ${row.rvol > 1.5 ? 'text-orange-400 font-bold' : 'text-muted-foreground'}`}>
                        {row.rvol}x
                      </TableCell>
                      <TableCell className="text-center">
                         {row.pattern ? (
                           <Badge variant="outline" className="text-[8px] h-4 bg-white/5 border-white/10 text-white font-medium uppercase truncate max-w-[80px]">
                             {row.pattern}
                           </Badge>
                         ) : <span className="text-muted-foreground opacity-20 text-[10px]">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                         <div className="flex items-center justify-center gap-1.5">
                            <div className={`w-1 h-1 rounded-full ${row.sentiment > 0.5 ? 'bg-green-500' : row.sentiment < -0.5 ? 'bg-red-500' : 'bg-yellow-500'}`} />
                            <span className="text-[9px] font-mono">{row.sentiment > 0 ? '+' : ''}{row.sentiment.toFixed(2)}</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-right">
                         <Badge variant="outline" className={
                           row.status === 'Bullish' ? "border-green-500/50 text-green-500 text-[8px] px-1 h-4" :
                           row.status === 'Bearish' ? "border-red-500/50 text-red-500 text-[8px] px-1 h-4" :
                           "text-muted-foreground border-border/50 text-[8px] px-1 h-4"
                         }>
                           {row.status}
                         </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Institutional Tools Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         {[
           { icon: ShieldCheck, color: 'text-primary', title: 'Prop Firm Match', desc: 'FTMO Compatible Logic' },
           { icon: Globe, color: 'text-accent', title: 'Global Sessions', desc: 'London Open Volatility' },
           { icon: Activity, color: 'text-orange-500', title: 'Unusual Volume', desc: 'SOL, NVDA Spiking' }
         ].map((tool, i) => (
           <Card key={i} className="bg-black/40 border-white/5">
             <CardContent className="p-3 flex items-center gap-3">
               <div className={`p-1.5 rounded bg-muted/20 shrink-0`}>
                 <tool.icon className={`w-4 h-4 ${tool.color}`} />
               </div>
               <div className="min-w-0">
                 <div className="text-[9px] font-bold uppercase text-muted-foreground truncate">{tool.title}</div>
                 <div className="text-[11px] text-white font-medium truncate">{tool.desc}</div>
               </div>
             </CardContent>
           </Card>
         ))}
      </div>
    </div>
  )
}
