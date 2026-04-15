
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BarChart3, Shield, Zap, Globe, Cpu } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-trading');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8 rounded overflow-hidden bg-card shadow-sm">
            <Image src="/favicon.png" alt="QuantEdge logo" fill className="object-cover" />
          </div>
          <span className="font-headline font-bold text-xl">QuantEdge</span>
        </div>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="#features">Features</Link>
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="/login">Sign In</Link>
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
            <Link href="/signup">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 px-4">
          <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <Badge variant="outline" className="w-fit text-primary border-primary">v2.0 Beta Now Live</Badge>
                <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                  Automate Your Alpha with <span className="text-primary">QuantEdge</span>
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl leading-relaxed">
                  The ultimate QuantEdge-powered algorithmic trading platform. Design, backtest, and deploy high-frequency strategies with AI assistance.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button asChild size="lg" className="px-8 bg-primary hover:bg-primary/90">
                  <Link href="/signup">Start Free Trial <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="px-8">
                  <Link href="/login">View Demo</Link>
                </Button>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
                      U{i}
                    </div>
                  ))}
                </div>
                <span>Trusted by 5,000+ quantitative traders</span>
              </div>
            </div>
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border shadow-2xl">
              {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  fill
                  className="object-cover"
                  data-ai-hint={heroImage.imageHint}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-card/30">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Engineered for Performance</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl">
                Our infrastructure handles the heavy lifting so you can focus on building profitable strategies.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "Low Latency Execution", desc: "Average order fill time of 4ms with direct exchange connectivity." },
                { icon: Cpu, title: "AI Strategy Builder", desc: "Draft Jesse-compatible Python logic in seconds using our integrated LLM." },
                { icon: Shield, title: "Institutional Risk Guard", desc: "Automatic circuit breakers and drawdown limits to protect your capital." },
                { icon: Globe, title: "Multi-Market Screener", desc: "Real-time indicators across 1,000+ pairs in Crypto, Forex, and Stocks." },
                { icon: BarChart3, title: "High-Precision Backtesting", desc: "Simulate strategies against years of tick-by-tick historical data." },
                { icon: ArrowRight, title: "Real-time Analytics", desc: "Monitor equity curves and portfolio health through immersive dashboards." }
              ].map((feat, i) => (
                <div key={i} className="flex flex-col p-6 space-y-2 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors group">
                  <div className="p-2 rounded-lg bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
                    <feat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{feat.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 md:py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative w-5 h-5 rounded overflow-hidden bg-card shadow-sm">
              <Image src="/favicon.png" alt="QuantEdge logo" fill className="object-cover" />
            </div>
            <span className="font-bold">QuantEdge</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 QuantEdge Inc. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
