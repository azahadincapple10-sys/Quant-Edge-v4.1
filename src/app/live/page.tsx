"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, TrendingUp, Building2, Zap } from "lucide-react"
import { ActiveBotsPanel } from "@/components/ActiveBotsPanel"

export default function LiveTradingHome() {
  const router = useRouter()

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 space-y-8 overflow-auto">
      <div className="space-y-2">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight font-headline">Live Trading</h1>
        <p className="text-muted-foreground">Choose a trading platform to begin paper trading with real market data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alpaca Card */}
        <Card className="border-2 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all cursor-pointer h-full flex flex-col"
          onClick={() => router.push('/live/alpaca')}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  <CardTitle>Alpaca Paper Trading</CardTitle>
                </div>
                <CardDescription>Trade stocks, ETFs, and options with paper money</CardDescription>
              </div>
              <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Stocks</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 flex flex-col">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Features:</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>Real-time market data for U.S. equities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>$100,000 virtual starting capital</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>Commission-free trading in paper mode</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>Access to extended hours trading</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>Live position tracking with profit/loss</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 mt-auto">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                <p className="font-semibold text-blue-500 mb-1">Requires API Keys:</p>
                <p className="text-muted-foreground">You'll need to configure your Alpaca API credentials in Settings first.</p>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={(e) => {
                e.stopPropagation()
                router.push('/live/alpaca')
              }}>
                Start Paper Trading <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Binance Card */}
        <Card className="border-2 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-all cursor-pointer h-full flex flex-col"
          onClick={() => router.push('/live/binance')}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-500" />
                  <CardTitle>Binance Sim Trading</CardTitle>
                </div>
                <CardDescription>Trade crypto on Binance Testnet (simulated)</CardDescription>
              </div>
              <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Crypto</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 flex flex-col">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Features:</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">✓</span>
                  <span>Testnet simulation with virtual USDT</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">✓</span>
                  <span>Trade 500+ cryptocurrency pairs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">✓</span>
                  <span>Real Binance market prices (live)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">✓</span>
                  <span>Practice risk management strategies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">✓</span>
                  <span>No risk of real capital loss</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 mt-auto">
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs">
                <p className="font-semibold text-orange-500 mb-1">Optional API Keys:</p>
                <p className="text-muted-foreground">You can trade without API keys, or configure them in Settings for enhanced features.</p>
              </div>
              <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={(e) => {
                e.stopPropagation()
                router.push('/live/binance')
              }}>
                Start Sim Trading <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ActiveBotsPanel />

      <Card className="bg-muted/50 border-muted">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Choose Your Platform
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-4">
          <p>
            You can access both Alpaca Paper Trading and Binance Sim Trading from the sidebar. Click on <strong>"Live Trading"</strong> in the menu to expand the submenu and select your platform.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Alpaca Paper Trading</h4>
              <p>Best for trading stocks, ETFs, and practicing equity market strategies with realistic U.S. market hours.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Binance Sim Trading</h4>
              <p>Ideal for crypto traders who want to practice trading 24/7 with real market data on the Binance testnet.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
