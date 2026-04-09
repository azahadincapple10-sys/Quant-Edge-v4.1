
"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  User, Shield, Bell, LogOut, Key, 
  Save, AlertTriangle, Globe
} from "lucide-react"
import { useAuth, useUser } from "@/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { user } = useUser()
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/')
      toast({
        title: "Signed out",
        description: "You have been successfully logged out."
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out. Please try again."
      })
    }
  }

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved locally."
      })
    }, 1000)
  }

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-auto bg-background">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">Manage your account, API integrations, and trading preferences.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? "Saving..." : "Save Changes"} <Save className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Account Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-bold">{user?.displayName || 'Quant Strategist'}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">{user?.email}</div>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Membership Plan</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Enterprise Tier</span>
                  <Badge className="bg-accent text-accent-foreground">PRO</Badge>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10 border-destructive/20 gap-2" onClick={handleLogout}>
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-destructive/5 border-destructive/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">Once you delete your account or API keys, there is no going back. Please be certain.</p>
              <Button variant="destructive" size="sm" className="w-full">Purge All Data</Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" /> Exchange Connectivity
              </CardTitle>
              <CardDescription>Configure your API keys for data sources and live execution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10">Binance</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input type="password" placeholder="************************" />
                  </div>
                  <div className="space-y-2">
                    <Label>API Secret</Label>
                    <Input type="password" placeholder="************************" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-accent/10">Alpaca Markets</Badge>
                  <span className="text-[10px] text-muted-foreground">(Paper & Live)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Alpaca Key ID</Label>
                    <Input type="password" placeholder="************************" />
                  </div>
                  <div className="space-y-2">
                    <Label>Alpaca Secret Key</Label>
                    <Input type="password" placeholder="************************" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="alpaca-paper" defaultChecked />
                  <Label htmlFor="alpaca-paper" className="text-xs">Use Alpaca Paper Trading by default</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Risk Management
              </CardTitle>
              <CardDescription>Default safety limits for all active strategies.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Daily Loss ($)</Label>
                  <Input type="number" defaultValue="5000" />
                </div>
                <div className="space-y-2">
                  <Label>Max Position Size (%)</Label>
                  <Input type="number" defaultValue="10" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Circuit Breaker</div>
                  <div className="text-xs text-muted-foreground">Pause all strategies if exchange latency exceeds 500ms.</div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Order Execution Alerts</div>
                  <div className="text-xs text-muted-foreground">Notify when a strategy fills or cancels an order.</div>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Telegram Integration</div>
                  <div className="text-xs text-muted-foreground">Send real-time PnL updates to your bot.</div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
