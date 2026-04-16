import { NextRequest, NextResponse } from 'next/server'
import { BotManager } from '@/services/live-bot-monitor'

// Initialize bot manager singleton
const botManager = new BotManager()

export async function GET(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  const { botId } = params

  try {
    const bot = botManager.getBot(botId)
    
    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      )
    }

    const status = bot.getStatus()

    return NextResponse.json({
      success: true,
      bot: {
        botId,
        strategy: status.strategy,
        exchange: status.exchange,
        mode: status.mode,
        status: status.status,
        startTime: status.startTime,
        account: status.account,
        positions: status.positions,
        metrics: status.metrics,
        equityCurve: status.equityCurveHistory,
        recentTrades: status.recentTrades,
        healthCheck: {
          dataFeed: status.dataFeed,
          apiLatency: status.apiLatency,
          lastUpdate: status.lastUpdate,
          uptime: formatUptime(Date.now() - status.startTime)
        }
      }
    })
  } catch (error) {
    console.error('Failed to fetch bot status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bot status' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  const { botId } = params
  const { action } = await request.json()

  try {
    const bot = botManager.getBot(botId)
    
    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'pause':
        bot.pause()
        break
      case 'resume':
        bot.resume()
        break
      case 'stop':
        await bot.stop()
        botManager.removeBot(botId)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Bot ${action} successful`
    })
  } catch (error) {
    console.error('Failed to perform bot action:', error)
    return NextResponse.json(
      { error: 'Failed to perform bot action' },
      { status: 500 }
    )
  }
}

function formatUptime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}
