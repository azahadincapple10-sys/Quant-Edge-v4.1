"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { Activity, TrendingUp, TrendingDown, Zap, Loader2 } from 'lucide-react'

interface BotStatus {
  botId: string
  strategy: string
  exchange: 'alpaca' | 'binance'
  mode: 'PAPER' | 'LIVE'
  status: 'RUNNING' | 'PAUSED' | 'STOPPED'
  startTime: number
  account: {
    equity: number
    dayPL: number
    dayPLPercent: number
  }
  metrics: {
    totalTrades: number
    winRate: number
    sharpeRatio: number
    maxDrawdown: number
  }
}

export function ActiveBotsPanel() {
  const [bots, setBots] = useState<BotStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBots = async () => {
      try {
        const response = await fetch('/api/live/bots')
        if (response.ok) {
          const data = await response.json()
          setBots(data.bots || [])
        }
      } catch (error) {
        console.error('Failed to fetch bots:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBots()
    const interval = setInterval(fetchBots, 10000) // Update every 10 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/30">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Active Trading Bots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (bots.length === 0) {
    return (
      <Card className="border-border/50 bg-card/30">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Active Trading Bots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Zap className="w-8 h-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No active trading bots</p>
            <p className="text-xs text-muted-foreground/70">Deploy a strategy to get started</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/30">
      <CardHeader>
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Active Trading Bots ({bots.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bots.map(bot => (
            <Link key={bot.botId} href={`/live/bots/${bot.botId}`}>
              <div className="p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{bot.botId}</h3>
                      <Badge variant="outline" className="text-[9px]">
                        {bot.strategy.substring(0, 8)}...
                      </Badge>
                      <Badge 
                        className={`text-[9px] ${
                          bot.status === 'RUNNING' 
                            ? 'bg-green-500/20 text-green-100' 
                            : bot.status === 'PAUSED'
                            ? 'bg-yellow-500/20 text-yellow-100'
                            : 'bg-red-500/20 text-red-100'
                        }`}
                      >
                        {bot.status}
                      </Badge>
                      <Badge 
                        className={`text-[9px] ${
                          bot.mode === 'PAPER' 
                            ? 'bg-blue-500/20 text-blue-100' 
                            : 'bg-orange-500/20 text-orange-100'
                        }`}
                      >
                        {bot.mode}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bot.exchange.toUpperCase()} • {new Date(bot.startTime).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      bot.account.dayPL >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {bot.account.dayPL >= 0 ? '+' : ''}{bot.account.dayPL.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${bot.account.equity.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="rounded bg-background/50 p-2">
                    <p className="text-muted-foreground">Trades</p>
                    <p className="font-semibold">{bot.metrics.totalTrades}</p>
                  </div>
                  <div className="rounded bg-background/50 p-2">
                    <p className="text-muted-foreground">Win Rate</p>
                    <p className="font-semibold">{(bot.metrics.winRate * 100).toFixed(1)}%</p>
                  </div>
                  <div className="rounded bg-background/50 p-2">
                    <p className="text-muted-foreground">Sharpe</p>
                    <p className="font-semibold">{bot.metrics.sharpeRatio.toFixed(2)}</p>
                  </div>
                  <div className="rounded bg-background/50 p-2">
                    <p className="text-muted-foreground">Drawdown</p>
                    <p className="font-semibold text-red-500">-{bot.metrics.maxDrawdown.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default ActiveBotsPanel
