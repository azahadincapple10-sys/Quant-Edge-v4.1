
"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Terminal, Bug, Search, Filter, ShieldAlert, Cpu, Server, Trash2, Globe } from "lucide-react"

const logs = [
  { time: '14:20:01', level: 'INFO', msg: 'Connecting to us-east-1 worker cluster...', source: 'AWS' },
  { time: '14:20:02', level: 'SUCCESS', msg: 'Handshake complete. latency: 42ms.', source: 'AWS' },
  { time: '14:21:05', level: 'WARN', msg: 'Memory usage spiking on ec2-worker-01 (78%).', source: 'SYS' },
  { time: '14:21:10', level: 'ERROR', msg: 'Rate limit approaching on Binance API endpoint.', source: 'API' },
  { time: '14:22:00', level: 'DEBUG', msg: 'Strategy loop iteration: 4.2ms avg.', source: 'STRAT' },
]

export default function DebugConsolePage() {
  const [filter, setFilter] = useState("")

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Debug Console</h1>
          <p className="text-muted-foreground">Monitoring AWS worker health and remote execution logs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Trash2 className="w-4 h-4" /> Clear Logs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 overflow-hidden">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" /> Remote Workers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><Globe className="w-3 h-3" /> ec2-worker-01</span>
                <Badge className="bg-green-500 h-4 text-[8px]">ACTIVE</Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs"><span>CPU Load</span><span>12%</span></div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="bg-primary h-full w-[12%]"></div></div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs"><span>Memory</span><span>420MB</span></div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="bg-green-500 h-full w-[35%]"></div></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-500/5 border-red-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-500">
                <ShieldAlert className="w-4 h-4" /> Compliance Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-red-500/80">AWS Instance us-east-1 reports 1 connection reset in the last 15 minutes. No trades affected.</div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
             <CardHeader className="pb-2">
               <CardTitle className="text-[10px] font-bold uppercase">Integration Tip</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-[10px] text-muted-foreground leading-relaxed">
                 To connect your AWS instance: Run a Node.js process using the <code>firebase-admin</code> SDK. Listen to the <code>/positions</code> collection for <code>status: 'open'</code> and execute the logic on the server.
               </p>
             </CardContent>
          </Card>
        </div>

        <Card className="md:col-span-3 flex flex-col overflow-hidden bg-black/40 border-primary/20">
          <CardHeader className="border-b border-white/5 py-3">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Terminal className="w-4 h-4 text-primary" />
                  <span className="text-sm font-mono font-bold tracking-tighter">REMOTE_STDOUT_STREAM</span>
                </div>
                <div className="relative w-48">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input 
                    placeholder="Search logs..." 
                    className="h-7 pl-7 text-xs bg-muted/20 border-white/10" 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
             </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-y-auto font-mono text-xs">
            <div className="p-4 space-y-1">
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-4 hover:bg-white/5 p-1 rounded transition-colors group">
                  <span className="text-muted-foreground shrink-0">{log.time}</span>
                  <span className={`w-16 font-bold shrink-0 ${
                    log.level === 'ERROR' ? 'text-red-500' : 
                    log.level === 'WARN' ? 'text-yellow-500' : 
                    log.level === 'SUCCESS' ? 'text-green-500' : 'text-blue-500'
                  }`}>[{log.level}]</span>
                  <span className="text-muted-foreground w-12 shrink-0">{log.source}</span>
                  <span className="text-white/90">{log.msg}</span>
                </div>
              ))}
              <div className="pt-4 text-primary animate-pulse">_</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
