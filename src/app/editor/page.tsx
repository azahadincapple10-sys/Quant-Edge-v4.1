
"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Code2, Sparkles, Play, Save, Bug, Search, 
  Terminal, Lightbulb, Wand2, ArrowRight, Plus, FolderOpen, Loader2, Trash2
} from "lucide-react"
import { generateStrategy } from '@/ai/flows/ai-strategy-generator'
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase'
import { collection, doc, setDoc, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

export default function EditorPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()

  const [currentStrategyId, setCurrentStrategyId] = useState<string | null>(null)
  const [name, setName] = useState("GoldenCross")
  const [code, setCode] = useState(`class GoldenCross(Strategy):
    def should_long(self):
        # go long when the EMA 8 is above the EMA 21
        short_ema = ta.ema(self.candles, 8)
        long_ema = ta.ema(self.candles, 21)
        return short_ema > long_ema

    def go_long(self):
        entry_price = self.price - 10
        qty = utils.size_to_qty(self.balance*0.05, entry_price)
        self.buy = qty, entry_price
        self.take_profit = qty, entry_price*1.2
        self.stop_loss = qty, entry_price*0.9`)
  
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "[SYSTEM] Environment ready.",
    "[INFO] ta library initialized (300+ indicators ready).",
    "[READY] Draft your logic or use JesseGPT."
  ])

  // Fetch user strategies
  const strategiesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, 'users', user.uid, 'strategies')
  }, [db, user])

  const { data: savedStrategies, isLoading: loadingStrategies } = useCollection<any>(strategiesQuery)

  const handleAiGenerate = async () => {
    if (!prompt) return
    setIsGenerating(true)
    setConsoleLogs(prev => [...prev, `[AI] Generating strategy based on prompt: "${prompt.substring(0, 30)}..."`])
    try {
      const result = await generateStrategy({
        strategyDescription: prompt,
        programmingLanguage: 'python',
        existingCode: code
      })
      if (result.generatedCode) {
        setCode(result.generatedCode)
        setConsoleLogs(prev => [...prev, "[AI] Code generation complete. Logic updated in editor."])
        toast({
          title: "Strategy Generated",
          description: "AI has successfully drafted your trading logic."
        })
      }
    } catch (error) {
      setConsoleLogs(prev => [...prev, "[ERROR] AI generation failed. Please check your connection."])
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate strategy. Please try again."
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!user || !db) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to save strategies."
      })
      return
    }
    
    setIsSaving(true)
    const strategyId = currentStrategyId || doc(collection(db, 'temp')).id
    
    const strategyData = {
      id: strategyId,
      name: name || "Untitled Strategy",
      code,
      updatedAt: serverTimestamp(),
      userId: user.uid,
      language: 'python'
    }

    try {
      await setDoc(doc(db, 'users', user.uid, 'strategies', strategyId), strategyData, { merge: true })
      setCurrentStrategyId(strategyId)
      setConsoleLogs(prev => [...prev, `[SUCCESS] Strategy "${strategyData.name}" saved successfully.`])
      toast({
        title: "Strategy Saved",
        description: `Successfully saved "${strategyData.name}".`
      })
    } catch (error: any) {
      setConsoleLogs(prev => [...prev, `[ERROR] Failed to save: ${error.message}`])
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, stratId: string, stratName: string) => {
    e.stopPropagation()
    if (!user || !db) return

    if (!confirm(`Are you sure you want to delete "${stratName}"?`)) return

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'strategies', stratId))
      if (currentStrategyId === stratId) {
        handleNew()
      }
      setConsoleLogs(prev => [...prev, `[SYSTEM] Strategy "${stratName}" deleted.`])
      toast({
        title: "Strategy Deleted",
        description: `"${stratName}" has been removed.`
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message
      })
    }
  }

  const handleNew = () => {
    setCurrentStrategyId(null)
    setName("New Strategy")
    setCode("")
    setPrompt("")
    setConsoleLogs(prev => [...prev, "[SYSTEM] New buffer created."])
  }

  const selectStrategy = (strat: any) => {
    setCurrentStrategyId(strat.id)
    setName(strat.name)
    setCode(strat.code)
    setConsoleLogs(prev => [...prev, `[LOADED] Strategy: ${strat.name}`])
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Editor Toolbar */}
      <div className="h-auto min-h-14 border-b border-border flex flex-col sm:flex-row items-center justify-between px-4 py-2 bg-card gap-2">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-sm font-medium w-full">
            <Code2 className="w-4 h-4 text-primary shrink-0" />
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="h-8 w-full sm:w-48 bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary font-bold px-1"
              placeholder="Strategy Name"
            />
            <Badge variant="outline" className="text-[10px] h-5 hidden xs:flex">Python 3.9</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="gap-1 h-8 text-[11px]" onClick={handleNew}>
              <Plus className="w-3.5 h-3.5" /> New
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 h-8 text-[11px]" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
            </Button>
          </div>
          <Button size="sm" className="gap-1 h-8 text-[11px] bg-primary hover:bg-primary/90" onClick={() => router.push('/backtest')}>
            <Play className="w-3.5 h-3.5" /> Run Backtest
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Code Editor Area */}
        <div className="flex-1 flex flex-col border-r border-border min-h-[300px] lg:min-h-0">
          <div className="flex-1 p-0 overflow-hidden bg-[#0D0F11]">
             <textarea 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full p-4 lg:p-6 font-code text-[13px] lg:text-sm bg-transparent border-none focus:ring-0 text-gray-300 resize-none outline-none leading-relaxed"
              spellCheck="false"
             />
          </div>
          <div className="h-32 lg:h-40 border-t border-border bg-card overflow-hidden flex flex-col">
            <div className="px-3 py-1 border-b border-border bg-muted/50 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Terminal className="w-3 h-3" /> Console Output
              </span>
            </div>
            <div className="flex-1 p-3 font-code text-[11px] text-green-500/80 overflow-y-auto">
              {consoleLogs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: AI Assistant & Tools */}
        <div className="w-full lg:w-[380px] flex flex-col bg-card overflow-hidden h-[400px] lg:h-auto border-t lg:border-t-0">
          <Tabs defaultValue="ai" className="flex flex-col h-full">
            <div className="px-4 border-b border-border shrink-0">
              <TabsList className="w-full bg-transparent p-0 h-12">
                <TabsTrigger value="ai" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  <Sparkles className="w-4 h-4 mr-2" /> JesseGPT
                </TabsTrigger>
                <TabsTrigger value="library" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  <FolderOpen className="w-4 h-4 mr-2" /> Strategies
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="ai" className="flex-1 flex flex-col overflow-hidden m-0 p-4 gap-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-[11px] text-primary leading-relaxed flex gap-3">
                <Lightbulb className="w-6 h-6 lg:w-8 lg:h-8 shrink-0" />
                <p>Describe your strategy ideas in plain English. I'll write the Jesse-compatible Python code for you.</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Describe Logic</label>
                  <Textarea 
                    placeholder="E.g. Go long when RSI is below 30 and volume is 2x average..."
                    className="min-h-[100px] lg:min-h-[120px] text-sm resize-none"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  <Button 
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-9" 
                    onClick={handleAiGenerate}
                    disabled={isGenerating || !prompt}
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Generate Logic"} <Wand2 className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                <div className="pt-4 border-t border-border">
                   <label className="text-[10px] font-bold uppercase text-muted-foreground mb-2 block">Quick Suggestions</label>
                   <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-1 gap-2">
                      <Button variant="outline" size="sm" className="w-full justify-start text-[10px] h-auto py-2" onClick={() => setPrompt("Add a Trailing Stop Loss to this strategy")}>
                        <ArrowRight className="w-3 h-3 mr-2 text-primary" /> Add Trailing Stop
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start text-[10px] h-auto py-2" onClick={() => setPrompt("Convert this to a trend-following breakout strategy")}>
                        <ArrowRight className="w-3 h-3 mr-2 text-primary" /> Trend Breakout
                      </Button>
                   </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="library" className="flex-1 overflow-y-auto m-0 p-4">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search saved..." className="pl-9 h-9" />
                </div>
                
                <div className="space-y-2">
                  {loadingStrategies ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
                  ) : !savedStrategies || savedStrategies.length === 0 ? (
                    <div className="text-center p-8 text-xs text-muted-foreground">No saved strategies found.</div>
                  ) : (
                    savedStrategies.map((strat: any) => (
                      <div 
                        key={strat.id} 
                        onClick={() => selectStrategy(strat)}
                        className={`p-3 rounded border border-border hover:bg-muted cursor-pointer transition-colors group relative ${currentStrategyId === strat.id ? 'bg-primary/10 border-primary/30' : ''}`}
                      >
                        <div className="font-bold text-sm truncate pr-8">{strat.name}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Updated: {strat.updatedAt?.toDate ? strat.updatedAt.toDate().toLocaleDateString() : 'Just now'}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDelete(e, strat.id, strat.name)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
