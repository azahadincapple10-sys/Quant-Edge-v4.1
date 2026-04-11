
"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"
import { Bell, BellRing, Settings, Plus, Trash2, Loader2, SignalHigh, AlertCircle } from "lucide-react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase'
import { collection, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { useToast } from '@/hooks/use-toast'

export default function AlertsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [newAlert, setNewAlert] = useState({
    symbol: 'BTC/USDT',
    type: 'Price',
    condition: 'Above',
    value: '70000'
  })

  // Fetch Alerts from Firestore scoped to user
  const alertsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, 'users', user.uid, 'alerts'), orderBy('createdAt', 'desc'))
  }, [db, user])

  const { data: alerts, isLoading } = useCollection<any>(alertsQuery)

  const handleCreateAlert = async () => {
    if (!db || !user) return
    setIsSaving(true)

    const alertId = doc(collection(db, 'temp')).id
    const alertData = {
      id: alertId,
      userId: user.uid,
      name: `${newAlert.symbol} ${newAlert.type} Alert`,
      instrumentId: newAlert.symbol,
      type: newAlert.type,
      condition: `${newAlert.condition} ${newAlert.value}`,
      status: 'active',
      notificationChannels: ['in-app', 'telegram'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    try {
      setDocumentNonBlocking(doc(db, 'users', user.uid, 'alerts', alertId), alertData, { merge: true })
      setIsCreateOpen(false)
      toast({ 
        title: "Alert Created", 
        description: `Watching ${newAlert.symbol} for ${newAlert.condition} ${newAlert.value}.` 
      })
    } catch (e) {
      toast({ variant: "destructive", title: "Error creating alert" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!db || !user) return
    try {
      deleteDocumentNonBlocking(doc(db, 'users', user.uid, 'alerts', id))
      toast({ title: "Alert Removed" })
    } catch (e) {
      toast({ variant: "destructive", title: "Error deleting alert" })
    }
  }

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-auto bg-background">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Strategy Alerts</h1>
          <p className="text-muted-foreground">Real-time triggers for market conditions and algorithmic events.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary">
              <Plus className="w-4 h-4" /> Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>New Market Alert</DialogTitle>
              <DialogDescription>Set conditions to trigger institutional notifications.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Symbol / Instrument</Label>
                <Input value={newAlert.symbol} onChange={(e) => setNewAlert({...newAlert, symbol: e.target.value})} placeholder="e.g. BTC/USDT" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Logic Type</Label>
                  <Select value={newAlert.type} onValueChange={(v) => setNewAlert({...newAlert, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Price">Price Level</SelectItem>
                      <SelectItem value="Indicator">RSI Indicator</SelectItem>
                      <SelectItem value="Volume">Volume Spike</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Select value={newAlert.condition} onValueChange={(v) => setNewAlert({...newAlert, condition: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Above">Crosses Above</SelectItem>
                      <SelectItem value="Below">Crosses Below</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Trigger Threshold</Label>
                <Input type="number" value={newAlert.value} onChange={(e) => setNewAlert({...newAlert, value: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateAlert} disabled={isSaving} className="w-full bg-primary">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Activate Watcher
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-headline">
              <Bell className="w-4 h-4 text-primary" /> Active Watchers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="h-32 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : !alerts || alerts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground opacity-40">
                <SignalHigh className="w-12 h-12 mx-auto mb-2" />
                <p>No active alerts configured.</p>
              </div>
            ) : (
              alerts.map((alert: any) => (
                <div key={alert.id} className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${alert.status === 'active' ? 'bg-primary/10' : 'bg-muted'}`}>
                      {alert.status === 'active' ? <BellRing className="w-5 h-5 text-primary" /> : <Bell className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{alert.instrumentId}</span>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter h-4">{alert.type}</Badge>
                        {alert.status === 'triggered' && <Badge className="bg-orange-500 h-4 text-[9px]">TRIGGERED</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{alert.condition}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(alert.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Notification Hub</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-2 rounded bg-muted/20">
              <span className="text-xs">Terminal Push</span>
              <Badge className="bg-green-500 h-4 text-[9px]">ACTIVE</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-muted/20 opacity-50">
              <span className="text-xs">Email Digest</span>
              <Badge variant="outline" className="h-4 text-[9px]">DISABLED</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-muted/20">
              <span className="text-xs">Telegram Bot</span>
              <Badge className="bg-green-500 h-4 text-[9px]">SYNCED</Badge>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex gap-3">
               <AlertCircle className="w-4 h-4 text-primary shrink-0" />
               <p className="text-[10px] leading-relaxed text-primary/80">
                 Remote AWS workers will prioritize Telegram alerts if terminal latency exceeds 50ms.
               </p>
            </div>
            <Button variant="outline" className="w-full mt-2 text-xs h-8">Manage Channels</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
