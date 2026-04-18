"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Play, Activity, Zap, 
  ArrowUpRight, ArrowDownRight,
  Terminal, Loader2, AlertCircle, Clock
} from "lucide-react"
import { 
  AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid
} from 'recharts'
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase'
import { doc, serverTimestamp } from 'firebase/firestore'
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { INITIAL_MARKET_DATA } from '@/lib/market-data'

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

export default function BinanceSimTradingPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Binance Testnet Simulator Initialized.",
    "[API] Binance Testnet Connected (Paper Trading)",
    "[SERVICE] Simulation engine ready."
  ])

  const [binanceAccount, setBinanceAccount] = useState<any>(null)
  const [binancePositions, setBinancePositions] = useState<any[]>([])
  const [isLoadingBinance, setIsLoadingBinance] = useState(false)
  const [isLoadingBinancePositions, setIsLoadingBinancePositions] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [quantity, setQuantity] = useState('0.001')
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({})
  const [accountBalance, setAccountBalance] = useState<number>(100000)

  const logEndRef = useRef<HTMLDivElement>(null)

  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, 'users', user.uid)
  }, [db, user])
  const { data: profile } = useDoc<any>(profileRef)

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  // Initialize simulated account from user profile
  useEffect(() => {
    const initializeSimulation = async () => {
      if (!profile || !db || !user) {
        setLogs(prev => [...prev, `[SYSTEM] Loading user profile...`])
        return
      }

      setIsLoadingBinance(true)
      try {
        // Get account size from user settings (defaults to 100,000)
        const userAccountSize = parseFloat(profile.accountSize || '100000')
        setAccountBalance(userAccountSize)

        // Fetch real market data from Binance public API
        const response = await fetch('/api/binance/ticker')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setLogs(prev => [...prev, `[SUCCESS] Connected to Binance Public API (Live Market Data)`])
          }
        }
        
        // Initialize simulated account with user's demo account size
        setBinanceAccount({
          status: 'Simulation Active',
          balances: {
            USDT: userAccountSize,
            BTC: 0.5
          },
          totalAssetOfBtc: '1.5'
        })
        setLogs(prev => [...prev, `[SYSTEM] Simulation account initialized: $${userAccountSize.toLocaleString()} USDT + 0.5 BTC`])
      } catch (error: any) {
        setLogs(prev => [...prev, `[WARNING] Could not fetch live data: ${error.message} - Using simulation mode`])
        // Still initialize account in simulation even if data fetch fails
        const userAccountSize = parseFloat(profile?.accountSize || '100000')
        setAccountBalance(userAccountSize)
        setBinanceAccount({
          status: 'Simulation Active',
          balances: {
            USDT: userAccountSize,
            BTC: 0.5
          },
          totalAssetOfBtc: '1.5'
        })
      }
      setIsLoadingBinance(false)
    }
    initializeSimulation()
  }, [profile, db, user])

  // Fetch current prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/binance/ticker')
        if (response.ok) {
          const result = await response.json()
          if (result.success && Array.isArray(result.data)) {
            const prices: Record<string, number> = {}
            result.data.forEach((ticker: any) => {
              prices[ticker.symbol] = parseFloat(ticker.price)
            })
            setCurrentPrices(prices)
          }
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error)
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 5000)
    return () => clearInterval(interval)
  }, [])

  const placeOrder = async (side: 'BUY' | 'SELL') => {
    if (!profile || !user || !db) return

    setIsPlacingOrder(true)
    const qty = parseFloat(quantity)
    
    if (!symbol || qty <= 0) {
      setLogs(prev => [...prev, `[ERROR] Invalid symbol or quantity`])
      toast({ variant: 'destructive', title: 'Invalid Order', description: 'Please enter valid symbol and quantity' })
      setIsPlacingOrder(false)
      return
    }

    setLogs(prev => [...prev, `[SDK] Placing ${side} order for ${qty} ${symbol} on Binance Simulation...`])

    try {
      const currentPrice = currentPrices[symbol] || 0
      if (currentPrice === 0) {
        setLogs(prev => [...prev, `[ERROR] Could not fetch current price for ${symbol}`])
        toast({ variant: 'destructive', title: 'Price Fetch Failed', description: `Unable to get current price for ${symbol}` })
        return
      }

      // Validate account exists
      if (!binanceAccount || binanceAccount.balances === undefined) {
        setLogs(prev => [...prev, `[ERROR] Account not initialized. Please refresh the page.`])
        toast({ variant: 'destructive', title: 'Account Error', description: 'Account not properly initialized' })
        return
      }

      // Simulate order placement
      const orderId = Math.floor(Math.random() * 1000000)
      const orderValue = qty * currentPrice
      
      // Update simulated balance
      let updatedBalance = accountBalance
      if (side === 'BUY') {
        if (accountBalance < orderValue) {
          setLogs(prev => [...prev, `[ERROR] Insufficient USDT balance. Required: $${orderValue.toFixed(2)}, Available: $${accountBalance.toFixed(2)}`])
          toast({ variant: 'destructive', title: 'Insufficient Balance', description: `Need $${orderValue.toFixed(2)} but only have $${accountBalance.toFixed(2)}` })
          setIsPlacingOrder(false)
          return
        }
        updatedBalance = accountBalance - orderValue
      } else {
        // SELL - assume selling the quantity at current price
        updatedBalance = accountBalance + orderValue
      }
      
      // Update local account state
      setAccountBalance(updatedBalance)
      setBinanceAccount({
        ...binanceAccount,
        balances: {
          ...binanceAccount.balances,
          USDT: updatedBalance
        }
      })

      // Persist balance update to Firestore
      if (db && user) {
        try {
          await setDocumentNonBlocking(doc(db, 'users', user.uid), {
            binanceSimBalance: updatedBalance,
            updatedAt: serverTimestamp(),
          }, { merge: true })
        } catch (saveError) {
          setLogs(prev => [...prev, `[WARNING] Could not save balance to profile`])
        }
      }

      setLogs(prev => [...prev, `[SUCCESS] Order placed: ${orderId}. ${qty} ${symbol} ${side} at $${currentPrice.toFixed(2)}`])
      toast({ title: 'Order Placed', description: `${qty} ${symbol} ${side === 'BUY' ? 'bought' : 'sold'} (Testnet).` })
      
      // Register trade as a bot for tracking (simulation mode)
      try {
        const registerRes = await fetch('/api/live/register-trade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderId.toString(),
            symbol: symbol,
            quantity: qty,
            side: side.toLowerCase(),
            exchange: 'binance',
            mode: 'PAPER',
            // No API keys needed - pure simulation
          }),
        })
        
        if (registerRes.ok) {
          const data = await registerRes.json()
          setLogs(prev => [...prev, `[SUCCESS] Trade registered for tracking: ${data.bot?.botId}`])
        } else {
          const error = await registerRes.json()
          setLogs(prev => [...prev, `[WARNING] Trade placed but tracking failed: ${error.error}`])
        }
      } catch (regError: any) {
        setLogs(prev => [...prev, `[WARNING] Could not register trade for tracking: ${regError.message}`])
      }
      
      // Add to positions
      const newPosition = {
        symbol,
        qty,
        entryPrice: currentPrice,
        side,
        unrealizedProfit: 0,
        unrealizedProfitPercent: 0
      }
      setBinancePositions([...binancePositions, newPosition])
    } catch (error: any) {
      setLogs(prev => [...prev, `[ERROR] Order error: ${error.message || 'Unknown error'}`])
      toast({ variant: 'destructive', title: 'Order Error', description: error.message || 'Failed to place order' })
    } finally {
      setIsPlacingOrder(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Binance Simulation Trading</h1>
          <p className="text-sm text-muted-foreground">Practice strategies with real Binance market data - 100% simulation, no real trades</p>
        </div>
      </div>

      <Alert variant="default" className="border-blue-500/20 bg-blue-500/5">
        <AlertCircle className="h-4 w-4 border-blue-500" />
        <AlertDescription>
          🎯 <strong>Simulation Mode:</strong> All trades use real Binance market data but execute only in simulation. No real account or API keys required.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Testnet Account</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBinance ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : binanceAccount ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge>{binanceAccount.status || 'Active'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">USDT Balance</span>
                  <span className="font-semibold">${binanceAccount.balances?.USDT || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">BTC Balance</span>
                  <span className="font-semibold">{binanceAccount.balances?.BTC || 0}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-4 p-2 bg-muted rounded">
                  💡 This is a <strong>Testnet simulation</strong> with virtual funds.
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No account data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Place Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Symbol</label>
              <input
                type="text"
                placeholder="e.g., BTCUSDT"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-border rounded-md text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Quantity</label>
              <input
                type="number"
                placeholder="e.g., 0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                step="0.000001"
                className="w-full px-3 py-2 border border-border rounded-md text-sm mt-1"
              />
            </div>
            {currentPrices[symbol] && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                Current Price: ${currentPrices[symbol].toFixed(2)}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => placeOrder('BUY')}
                disabled={isPlacingOrder}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isPlacingOrder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Buy
              </Button>
              <Button
                onClick={() => placeOrder('SELL')}
                disabled={isPlacingOrder}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isPlacingOrder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Sell
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Positions ({binancePositions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {binancePositions.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {binancePositions.slice(0, 5).map((pos: any, idx: number) => {
                  const currentPrice = currentPrices[pos.symbol] || pos.entryPrice
                  const unrealizedPnL = (currentPrice - pos.entryPrice) * pos.qty
                  const unrealizedPnLPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
                  
                  return (
                    <div key={idx} className="flex justify-between items-center text-sm p-2 border border-border rounded">
                      <div>
                        <p className="font-semibold">{pos.symbol}</p>
                        <p className="text-xs text-muted-foreground">{pos.qty} @ ${pos.entryPrice.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${currentPrice.toFixed(2)}</p>
                        <p className={`text-xs ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnLPercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No open positions</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Terminal Logs</CardTitle>
        </CardHeader>
        <CardContent className="bg-muted/50 rounded-md p-4 font-mono text-xs max-h-96 overflow-y-auto space-y-1">
          {logs.map((log, idx) => {
            const isError = log.includes('[ERROR]')
            const isSuccess = log.includes('[SUCCESS]')
            const isInfo = log.includes('[SDK]') || log.includes('[SYSTEM]')
            
            return (
              <div 
                key={idx} 
                className={`${
                  isError ? 'text-red-600' : 
                  isSuccess ? 'text-green-600' : 
                  isInfo ? 'text-blue-600' : 
                  'text-foreground'
                }`}
              >
                {log}
              </div>
            )
          })}
          <div ref={logEndRef} />
        </CardContent>
      </Card>
    </div>
  )
}
