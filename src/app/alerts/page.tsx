
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
import { Bell, BellRing, Settings, Plus, Trash2, Loader2, SignalHigh } from "lucide-react"
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

  // Fetch Alerts from Firestore
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
      symbol: newAlert.symbol,
      type: newAlert.type,
      condition: `${newAlert.condition} $${newAlert.value}`,
      status: 'active',
      notificationChannels: ['in-app', 'telegram'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    try {
      await setDocumentNonBlocking(doc(db, 'users', user.uid, 'alerts', alertId), alertData, { merge: true })
      setIsCreateOpen(false)
      toast({ title: "Alert Created", description: `You will be notified when ${newAlert.symbol} is ${newAlert.condition} ${newAlert.value}.` })
    } catch (e) {
      toast({ variant: "destructive", title: "Error creating alert" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!db || !user) return
    try {
      await deleteDocumentNonBlocking(doc(db, 'users', user.uid, 'alerts', id))
      toast({ title: "Alert Removed" })
    } catch (e) {
      toast({ variant: "destructive", title: "Error deleting alert" })
    }
  }

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Strategy Alerts</h1>
          <p className="text-muted-foreground">Configure triggers for market conditions and strategy events.</p>
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
                <Label>Symbol</Label>
                <Input value={newAlert.symbol} onChange={(e) => setNewAlert({...newAlert, symbol: e.target.value})} placeholder="e.g. BTC/USDT" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
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
                  <Label>Condition</Label>
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
                <Label>Trigger Value</Label>
                <Input type="number" value={newAlert.value} onChange={(e) => setNewAlert({...newAlert, value: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateAlert} disabled={isSaving} className="w-full">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirm Alert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-4 h-4" /> Active Watchers
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
                <div key={alert.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${alert.status === 'active' ? 'bg-primary/10' : 'bg-muted'}`}>
                      {alert.status === 'active' ? <BellRing className="w-5 h-5 text-primary" /> : <Bell className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{alert.symbol}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">{alert.type}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{alert.condition}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(alert.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notification Channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">In-App Push</span>
              <Badge className="bg-green-500">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Email Digest</span>
              <Badge variant="outline">Disabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Telegram Bot</span>
              <Badge className="bg-green-500">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Webhook (Zapier)</span>
              <Badge variant="outline">Unconfigured</Badge>
            </div>
            <Button variant="outline" className="w-full mt-4">Manage Channels</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
