
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
        description: `CSV file with ${filteredAndSortedData.length} multi-asset rows generated.`
      })
    }, 1200)
  }

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-auto bg-[#0A0C0E]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            Institutional Screener <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-[10px]">ULTRA-LOW LATENCY</Badge>
          </h1>
          <p className="text-muted-foreground">Unified global market intelligence for Stocks, Forex, Crypto, and Commodities.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 border-white/10 bg-white/5" onClick={handleExport} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export Data
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
             Save Custom Preset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Market Intelligence Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase text-primary flex items-center gap-2">
                <BrainCircuit className="w-4 h-4" /> AI Sentiment Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {[
                 { label: 'Market Sentiment', value: 'Greed', score: 72, color: 'bg-green-500' },
                 { label: 'Vol Correlation', value: 'High', score: 85, color: 'bg-primary' },
                 { label: 'Retail Interest', value: 'Extremely High', score: 91, color: 'bg-orange-500' }
               ].map((stat) => (
                 <div key={stat.label} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
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
             <CardHeader className="pb-2">
               <CardTitle className="text-[10px] font-bold uppercase flex items-center gap-2">
                 <Flame className="w-3 h-3 text-orange-500" /> Hot Patterns Detect
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-2">
                {[
                  { symbol: 'NVDA', pattern: 'Ascending Triangle (4h)', conf: 82 },
                  { symbol: 'TSLA', pattern: 'RSI Divergence (1h)', conf: 68 },
                  { symbol: 'GOLD', pattern: 'Golden Cross (1D)', conf: 94 }
                ].map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-background/50 border border-white/5">
                    <div className="text-[10px]">
                      <span className="font-bold text-white block">{p.symbol}</span>
                      <span className="text-muted-foreground">{p.pattern}</span>
                    </div>
                    <Badge variant="outline" className="text-[8px] h-4 bg-primary/10 border-primary/20">{p.conf}% Conf</Badge>
                  </div>
                ))}
             </CardContent>
          </Card>
        </div>

        {/* Main Screener Table */}
        <Card className="lg:col-span-3 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="p-0 border-b border-border">
            <Tabs value={marketFilter} onValueChange={setMarketFilter} className="w-full">
              <div className="px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <TabsList className="bg-background/50 h-9 p-1">
                  <TabsTrigger value="all" className="text-xs">All Markets</TabsTrigger>
                  <TabsTrigger value="stocks" className="text-xs">Stocks</TabsTrigger>
                  <TabsTrigger value="crypto" className="text-xs">Crypto</TabsTrigger>
                  <TabsTrigger value="forex" className="text-xs">Forex</TabsTrigger>
                  <TabsTrigger value="commodities" className="text-xs">Commodities</TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Search global tickers..." 
                      className="pl-8 h-8 text-xs bg-background/50 border-white/5" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="w-[80px] h-8 text-xs bg-background/50 border-white/5">
                      <SelectValue placeholder="TF" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1m</SelectItem>
                      <SelectItem value="15m">15m</SelectItem>
                      <SelectItem value="1h">1h</SelectItem>
                      <SelectItem value="4h">4h</SelectItem>
                      <SelectItem value="1D">1D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
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
                  <TableHead className="text-center text-[10px] uppercase font-bold">AI Pattern</TableHead>
                  <TableHead className="text-center text-[10px] uppercase font-bold">Sentiment</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.map((row) => (
                  <TableRow key={row.symbol} className="border-border/40 hover:bg-white/[0.02] transition-colors group">
                    <TableCell className="text-center">
                      <Star className={`w-3.5 h-3.5 cursor-pointer hover:text-yellow-500 transition-colors ${row.isFavorite ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm">{row.symbol}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {row.market === 'stocks' && <Badge variant="outline" className="text-[8px] h-3 px-1 border-blue-500/20 text-blue-400">P/E: {row.peRatio}</Badge>}
                          {row.market === 'crypto' && <Badge variant="outline" className="text-[8px] h-3 px-1 border-orange-500/20 text-orange-400">FR: {row.fundingRate}</Badge>}
                          {row.market === 'forex' && <Badge variant="outline" className="text-[8px] h-3 px-1 border-purple-500/20 text-purple-400">Pip: ${row.pipValue}</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium">
                      {row.market === 'forex' ? row.price.toFixed(4) : row.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-xs font-bold ${row.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {row.change >= 0 ? '+' : ''}{row.change.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-mono font-bold ${row.rsi > 70 ? 'text-red-400' : row.rsi < 30 ? 'text-green-400' : 'text-muted-foreground'}`}>{row.rsi}</span>
                        <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${row.rsi > 70 ? 'bg-red-500' : row.rsi < 30 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${row.rsi}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-mono text-xs ${row.rvol > 1.5 ? 'text-orange-400 font-bold' : 'text-muted-foreground'}`}>
                      {row.rvol}x
                    </TableCell>
                    <TableCell className="text-center">
                       {row.pattern ? (
                         <Badge variant="outline" className="text-[9px] h-5 bg-white/5 border-white/10 text-white font-medium uppercase tracking-tighter">
                           {row.pattern}
                         </Badge>
                       ) : <span className="text-muted-foreground opacity-20">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                       <div className="flex items-center justify-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${row.sentiment > 0.5 ? 'bg-green-500' : row.sentiment < -0.5 ? 'bg-red-500' : 'bg-yellow-500'}`} />
                          <span className="text-[10px] font-mono">{row.sentiment > 0 ? '+' : ''}{row.sentiment.toFixed(2)}</span>
                       </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <Badge variant="outline" className={
                         row.status === 'Bullish' ? "border-green-500/50 text-green-500 bg-green-500/5" :
                         row.status === 'Bearish' ? "border-red-500/50 text-red-500 bg-red-500/5" :
                         row.status === 'Overbought' ? "bg-red-500 text-white border-none" :
                         row.status === 'Oversold' ? "bg-green-500 text-white border-none" :
                         "text-muted-foreground border-border/50"
                       }>
                         {row.status}
                       </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Institutional Tools Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="bg-black/40 border-white/5">
           <CardContent className="p-4 flex items-center gap-4">
             <div className="p-2 rounded bg-primary/10">
               <ShieldCheck className="w-5 h-5 text-primary" />
             </div>
             <div>
               <div className="text-xs font-bold uppercase text-muted-foreground">Prop Firm Match</div>
               <div className="text-sm text-white font-medium">FTMO/MyFundedFX Logic Compatible</div>
             </div>
           </CardContent>
         </Card>
         <Card className="bg-black/40 border-white/5">
           <CardContent className="p-4 flex items-center gap-4">
             <div className="p-2 rounded bg-accent/10">
               <Globe className="w-5 h-5 text-accent" />
             </div>
             <div>
               <div className="text-xs font-bold uppercase text-muted-foreground">Global Sessions</div>
               <div className="text-sm text-white font-medium">London Open • High Volatility Expected</div>
             </div>
           </CardContent>
         </Card>
         <Card className="bg-black/40 border-white/5">
           <CardContent className="p-4 flex items-center gap-4">
             <div className="p-2 rounded bg-orange-500/10">
               <Activity className="w-5 h-5 text-orange-500" />
             </div>
             <div>
               <div className="text-xs font-bold uppercase text-muted-foreground">Unusual Volume</div>
               <div className="text-sm text-white font-medium">NVDA, SOL, GOLD showing 2x Average</div>
             </div>
           </CardContent>
         </Card>
      </div>
    </div>
  )
}
