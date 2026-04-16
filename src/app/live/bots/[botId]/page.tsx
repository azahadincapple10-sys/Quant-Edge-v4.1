"use client"

import React from 'react'
import { useParams } from 'next/navigation'
import LiveBotMonitor from '@/components/LiveBotMonitor'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function BotDetailPage() {
  const params = useParams()
  const botId = params.botId as string

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 space-y-6 bg-[#080A0C]">
      <div className="flex items-center gap-4">
        <Link href="/live">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Live Trading
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight font-headline">
            Bot Monitor: {botId}
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">Real-time monitoring and control panel</p>
        </div>
      </div>

      <LiveBotMonitor botId={botId} />
    </div>
  )
}
