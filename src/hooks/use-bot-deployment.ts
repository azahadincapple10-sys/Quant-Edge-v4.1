import { useState } from 'react'

export interface BacktestResult {
  strategy: string
  returns: number
  winRate: number
  sharpeRatio: number
  maxDrawdown: number
  totalTrades: number
  trades: Array<{
    entryTime: string
    exitTime: string
    profit: number
    side: 'long' | 'short'
  }>
  metrics: {
    totalProfit: number
    totalLoss: number
    profitFactor: number
    calmarRatio: number
  }
}

export interface DeploymentConfig {
  botId: string
  exchange: 'alpaca' | 'binance'
  mode: 'PAPER' | 'LIVE'
  alpacaKeyId?: string
  alpacaSecretKey?: string
  binanceApiKey?: string
  binanceApiSecret?: string
}

export function useBotDeployment() {
  const [isDeploying, setIsDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const deployFromBacktest = async (
    backtest: BacktestResult,
    config: DeploymentConfig,
    initialCapital: number
  ) => {
    setIsDeploying(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/live/deploy-from-backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: config.botId,
          strategy: backtest.strategy,
          exchange: config.exchange,
          mode: config.mode,
          alpacaKeyId: config.alpacaKeyId,
          alpacaSecretKey: config.alpacaSecretKey,
          binanceApiKey: config.binanceApiKey,
          binanceApiSecret: config.binanceApiSecret,
          backtestMetrics: {
            totalTrades: backtest.totalTrades,
            winRate: backtest.winRate,
            sharpeRatio: backtest.sharpeRatio,
            maxDrawdown: backtest.maxDrawdown,
            returns: backtest.returns,
            profitFactor: backtest.metrics.profitFactor,
            calmarRatio: backtest.metrics.calmarRatio,
          },
          backtestTrades: backtest.trades,
          initialCapital,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deploy bot')
      }

      setSuccess(`Bot ${config.botId} deployed successfully!`)
      return data.bot
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsDeploying(false)
    }
  }

  return {
    isDeploying,
    error,
    success,
    deployFromBacktest,
  }
}
