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
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase'
import { collection, doc, serverTimestamp, query, where } from 'firebase/firestore'
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { INITIAL_MARKET_DATA } from '@/lib/market-data'
import { testAlpacaConnection, placeAlpacaOrder, closeAlpacaPosition, getAlpacaAccountDetails, getAlpacaPositions } from '@/app/actions/alpaca-actions'

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

export default function AlpacaPaperTradingPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Alpaca Paper Trading Terminal Initialized.",
    "[API] Alpaca Paper Trading Mode Connected.",
    "[SERVICE] Paper trading engine ready."
  ])

  const [alpacaAccount, setAlpacaAccount] = useState<any>(null)
  const [alpacaPositions, setAlpacaPositions] = useState<any[]>([])
  const [isLoadingAlpaca, setIsLoadingAlpaca] = useState(false)
  const [isLoadingAlpacaPositions, setIsLoadingAlpacaPositions] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [symbol, setSymbol] = useState('SPY')
  const [quantity, setQuantity] = useState('1')

  const logEndRef = useRef<HTMLDivElement>(null)

  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, 'users', user.uid)
  }, [db, user])
  const { data: profile } = useDoc<any>(profileRef)

  const profileAlpacaKey = profile?.alpacaKey || profile?.alpacaKeyId || ''
  const profileAlpacaSecret = profile?.alpacaSecret || profile?.alpacaSecretKey || ''

  const hasValidAlpacaCredentials = Boolean(
    profileAlpacaKey &&
    profileAlpacaSecret &&
    !profileAlpacaKey.includes('*') &&
    !profileAlpacaSecret.includes('*')
  )

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  // Fetch Alpaca account details on mount
  useEffect(() => {
    const fetchAlpaca = async () => {
      if (hasValidAlpacaCredentials) {
        setIsLoadingAlpaca(true)
        const res = await getAlpacaAccountDetails({
          keyId: profileAlpacaKey,
          secretKey: profileAlpacaSecret,
          paper: true
        })
        if (res.success) {
          setAlpacaAccount(res)
          setLogs(prev => [...prev, `[SUCCESS] Alpaca account connected - Buying Power: $${res.buyingPower}`])
        } else {
          setAlpacaAccount(null)
          setLogs(prev => [...prev, `[ERROR] Failed to connect Alpaca account: ${res.error}`])
        }
        setIsLoadingAlpaca(false)

        setIsLoadingAlpacaPositions(true)
        const positionsRes = await getAlpacaPositions({
          keyId: profileAlpacaKey,
          secretKey: profileAlpacaSecret,
          paper: true
        })
        if (positionsRes.success) {
          setAlpacaPositions(positionsRes.positions)
          setLogs(prev => [...prev, `[SUCCESS] Loaded ${positionsRes.positions?.length || 0} open positions`])
        } else {
          setAlpacaPositions([])
        }
        setIsLoadingAlpacaPositions(false)
      } else {
        setAlpacaAccount(null)
        setAlpacaPositions([])
        setLogs(prev => [...prev, `[ERROR] Alpaca API credentials not found. Please add your credentials in Settings.`])
      }
    }
    fetchAlpaca()
  }, [profileAlpacaKey, profileAlpacaSecret, hasValidAlpacaCredentials])

  const placeOrder = async (side: 'buy' | 'sell') => {
    if (!profile || !user || !db) return
    if (!hasValidAlpacaCredentials) {
      setLogs(prev => [...prev, `[ERROR] Alpaca credentials not configured. Go to Settings to add your API keys.`])
      toast({ variant: 'destructive', title: 'Alpaca Credentials Required', description: 'Please configure Alpaca API keys in Settings.' })
      return
    }

    setIsPlacingOrder(true)
    const qty = parseInt(quantity)
    
    if (!symbol || qty <= 0) {
      setLogs(prev => [...prev, `[ERROR] Invalid symbol or quantity`])
      toast({ variant: 'destructive', title: 'Invalid Order', description: 'Please enter valid symbol and quantity' })
      setIsPlacingOrder(false)
      return
    }

    setLogs(prev => [...prev, `[SDK] Placing ${side.toUpperCase()} order for ${qty} shares of ${symbol}...`])

    try {
      const conn = await testAlpacaConnection({ keyId: profileAlpacaKey, secretKey: profileAlpacaSecret, paper: true })
      if (!conn.success) {
        setLogs(prev => [...prev, `[ERROR] Alpaca connection failed: ${conn.error}`])
        toast({ variant: 'destructive', title: 'Alpaca Connection Failed', description: conn.error || 'Unable to connect' })
        return
      }

      const orderRes = await placeAlpacaOrder({
        config: { keyId: profileAlpacaKey, secretKey: profileAlpacaSecret, paper: true },
        symbol: symbol.toUpperCase(),
        qty: qty,
        side: side,
        type: 'market'
      })

      if (!orderRes.success) {
        setLogs(prev => [...prev, `[ERROR] Order failed: ${orderRes.error}`])
        toast({ variant: 'destructive', title: 'Order Failed', description: orderRes.error || 'Order could not be placed' })
        return
      }

      setLogs(prev => [...prev, `[SUCCESS] Order placed: ${orderRes.orderId}. Status: ${orderRes.status}`])
      toast({ title: 'Order Placed', description: `${qty} shares of ${symbol} ${side === 'buy' ? 'bought' : 'sold'}.` })
      
      // Register trade as a bot for tracking
      try {
        const registerRes = await fetch('/api/live/register-trade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderRes.orderId,
            symbol: symbol.toUpperCase(),
            quantity: qty,
            side: side,
            exchange: 'alpaca',
            mode: 'PAPER',
            alpacaKeyId: profileAlpacaKey,
            alpacaSecretKey: profileAlpacaSecret,
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
      
      // Reload positions
      setIsLoadingAlpacaPositions(true)
      const positionsRes = await getAlpacaPositions({ keyId: profileAlpacaKey, secretKey: profileAlpacaSecret, paper: true })
      if (positionsRes.success) {
        setAlpacaPositions(positionsRes.positions)
      }
      setIsLoadingAlpacaPositions(false)
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
          <h1 className="text-3xl font-bold">Alpaca Paper Trading</h1>
          <p className="text-sm text-muted-foreground">Risk-free practice trading with real market data</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/settings')}>
          Configure API Keys
        </Button>
      </div>

      {!hasValidAlpacaCredentials && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Alpaca API credentials not found. <Button variant="link" onClick={() => router.push('/settings')} className="h-auto p-0">Add your API keys in Settings</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAlpaca ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : alpacaAccount ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge>{alpacaAccount.status || 'Active'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Buying Power</span>
                  <span className="font-semibold">${parseFloat(alpacaAccount.buyingPower || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Portfolio Value</span>
                  <span className="font-semibold">${parseFloat(alpacaAccount.portfolio_value || 0).toLocaleString()}</span>
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
              <input
                type="text"
                placeholder="Symbol (e.g., SPY)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => placeOrder('buy')}
                disabled={isPlacingOrder || !hasValidAlpacaCredentials}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isPlacingOrder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Buy
              </Button>
              <Button
                onClick={() => placeOrder('sell')}
                disabled={isPlacingOrder || !hasValidAlpacaCredentials}
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
            <CardTitle>Open Positions ({alpacaPositions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAlpacaPositions ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : alpacaPositions.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alpacaPositions.slice(0, 5).map((pos: any) => (
                  <div key={pos.symbol} className="flex justify-between items-center text-sm p-2 border border-border rounded">
                    <div>
                      <p className="font-semibold">{pos.symbol}</p>
                      <p className="text-xs text-muted-foreground">{pos.qty} shares</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${parseFloat(pos.current_price).toFixed(2)}</p>
                      <p className={`text-xs ${pos.unrealized_pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pos.unrealized_pl >= 0 ? '+' : ''}{pos.unrealized_pl_pct?.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))}
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
