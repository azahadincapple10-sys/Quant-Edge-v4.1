
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"
import { 
  User, Shield, Bell, LogOut, Key, 
  Save, AlertTriangle, Trophy,
  ShieldCheck, Landmark, Calculator,
  Mail, Globe, Clock, CreditCard, Loader2, Coins, Zap, RefreshCcw
} from "lucide-react"
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { doc, serverTimestamp } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { user } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Profile State
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, 'users', user.uid)
  }, [db, user])

  const { data: profileData, isLoading: isProfileLoading } = useDoc<any>(profileRef)

  const [profileForm, setProfileForm] = useState({
    username: '',
    fullName: '',
    timezone: 'UTC',
    currency: 'USD'
  })

  // Settings State (Persisted to Firestore)
  const [propFirmMode, setPropFirmMode] = useState(true)
  const [accountSize, setAccountSize] = useState("100000")
  const [challengePhase, setChallengePhase] = useState("phase1")

  // Sync form with Firestore data
  useEffect(() => {
    if (profileData) {
      setProfileForm({
        username: profileData.username || '',
        fullName: profileData.fullName || '',
        timezone: profileData.timezone || 'UTC',
        currency: profileData.currency || 'USD'
      })
      setPropFirmMode(profileData.propFirmMode !== undefined ? profileData.propFirmMode : true)
      setAccountSize(profileData.accountSize || "100000")
      setChallengePhase(profileData.challengePhase || "phase1")
    } else if (user) {
        setProfileForm(prev => ({ ...prev, username: user.email?.split('@')[0] || '' }))
    }
  }, [profileData, user])

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

  const handleSaveProfile = () => {
    if (!db || !user) return
    setIsSaving(true)
    
    const updatedProfile = {
      ...profileForm,
      propFirmMode,
      accountSize,
      challengePhase,
      id: user.uid,
      email: user.email,
      updatedAt: serverTimestamp(),
    }

    setDocumentNonBlocking(doc(db, 'users', user.uid), updatedProfile, { merge: true })
    
    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: "Settings Applied",
        description: "Your terminal profile and compliance rules have been updated."
      })
    }, 800)
  }

  const handleResetAccount = () => {
    if (!db || !user) return
    setIsResetting(true)

    const resetData = {
      totalBalance: 100000,
      vaultBalance: 100000,
      tradingBalance: 0,
      updatedAt: serverTimestamp(),
    }

    setDocumentNonBlocking(doc(db, 'users', user.uid), resetData, { merge: true })

    setTimeout(() => {
      setIsResetting(false)
      toast({
        title: "Account Reset",
        description: "Balances have been restored to the default $100,000 allocation."
      })
    }, 1000)
  }

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-auto bg-background">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">System Settings</h1>
          <p className="text-muted-foreground">Configure your institutional identity and compliance protocols.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2" onClick={() => router.push('/live')}>
             <ShieldCheck className="w-4 h-4" /> Compliance Dashboard
           </Button>
           <Button onClick={handleSaveProfile} disabled={isSaving || isProfileLoading} className="gap-2 bg-primary">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
            {isSaving ? "Syncing..." : "Apply Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Identity & Balances */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="overflow-hidden border-primary/10">
            <CardHeader className="bg-primary/5 pb-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                    {profileForm.username?.[0]?.toUpperCase() || 'S'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl font-bold">{profileForm.fullName || profileForm.username || 'Strategist'}</CardTitle>
                  <CardDescription className="flex items-center justify-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px]">ENTERPRISE TIER</Badge>
                    <Badge variant="outline" className="text-[10px]">UID: {user?.uid.substring(0, 8)}...</Badge>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <Separator />
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                    <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> Vault Balance (Bal.)</span>
                    <span className="text-white">${profileData?.vaultBalance?.toLocaleString() || '100,000'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-accent" /> Trading Balance</span>
                    <span className="text-accent">${profileData?.tradingBalance?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-primary pt-1 border-t border-white/5">
                    <span>Total Net Worth</span>
                    <span>${profileData?.totalBalance?.toLocaleString() || '100,000'}</span>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full gap-2 border-orange-500/20 text-orange-500 hover:bg-orange-500/10">
                      <RefreshCcw className="w-4 h-4" /> Reset Terminal Balances
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle>Confirm Account Reset?</DialogTitle>
                      <DialogDescription>
                        This will restore your Vault to $100,000 and clear your Trading balance. Active bots will not be affected, but their funding logic may drift.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="destructive" onClick={handleResetAccount} disabled={isResetting}>
                        {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Reset to $100,000
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 gap-2" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" /> Sign Out from Terminal
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase text-primary flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Challenge Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Prop Firm Mode</div>
                  <div className="text-[10px] text-muted-foreground">Enforce strict risk guardrails.</div>
                </div>
                <Switch checked={propFirmMode} onCheckedChange={setPropFirmMode} />
              </div>
              
              {propFirmMode && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                   <div className="space-y-2">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">Account Size</Label>
                     <Select value={accountSize} onValueChange={setAccountSize}>
                        <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25000">$25,000</SelectItem>
                          <SelectItem value="50000">$50,000</SelectItem>
                          <SelectItem value="100000">$100,000</SelectItem>
                          <SelectItem value="250000">$250,000</SelectItem>
                        </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-[10px] uppercase font-bold text-muted-foreground">Phase</Label>
                     <Select value={challengePhase} onValueChange={setChallengePhase}>
                        <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phase1">Phase 1 (10%)</SelectItem>
                          <SelectItem value="phase2">Phase 2 (5%)</SelectItem>
                          <SelectItem value="funded">Funded (HWM)</SelectItem>
                        </SelectContent>
                     </Select>
                   </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Profile Form & Rules */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Profile Information
              </CardTitle>
              <CardDescription>Update your public identity and terminal preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="username" 
                      value={profileForm.username} 
                      onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    value={profileForm.fullName} 
                    onChange={(e) => setProfileForm({...profileForm, fullName: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Base Currency</Label>
                  <Select value={profileForm.currency} onValueChange={(v) => setProfileForm({...profileForm, currency: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="BTC">BTC (₿)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Timezone</Label>
                  <Select value={profileForm.timezone} onValueChange={(v) => setProfileForm({...profileForm, timezone: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC (London)</SelectItem>
                      <SelectItem value="EST">EST (New York)</SelectItem>
                      <SelectItem value="HKT">HKT (Hong Kong)</SelectItem>
                      <SelectItem value="JST">JST (Tokyo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" /> API Connectivity
              </CardTitle>
              <CardDescription>Securely connect your terminal to external brokers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-card/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Landmark className="w-5 h-5 text-blue-400" />
                    <div className="font-bold">Alpaca Markets</div>
                  </div>
                  <Badge className="bg-green-500">CONNECTED</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Key ID</Label>
                    <Input type="text" value={alpacaKey} onChange={(e) => setAlpacaKey(e.target.value)} className="h-9 font-mono text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Secret Key</Label>
                    <Input type="password" value={alpacaSecret} onChange={(e) => setAlpacaSecret(e.target.value)} className="h-9 font-mono text-xs" />
                  </div>
                </div>
              </div>

              <div className="p-4 border border-dashed rounded-lg opacity-40 grayscale pointer-events-none">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5" />
                    <div className="font-bold">Binance Futures</div>
                  </div>
                  <Badge variant="secondary">SOON</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
