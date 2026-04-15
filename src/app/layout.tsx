
'use client';

import './globals.css';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Toaster } from "@/components/ui/toaster";
import { usePathname } from "next/navigation";
import { FirebaseClientProvider, useUser } from '@/firebase';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useUser();
  
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/';
  
  if (loading && !isAuthPage) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary animate-pulse" />
          <p className="text-sm text-muted-foreground font-mono">INITIALIZING TERMINAL...</p>
        </div>
      </div>
    );
  }

  // Show sidebar on all pages except auth/landing pages to ensure preview visibility
  const showSidebar = !isAuthPage;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {showSidebar && <AppSidebar />}
        <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
          {showSidebar && (
            <header className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-card/30 backdrop-blur-sm z-10">
              <SidebarTrigger className="mr-4" />
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                QuantEdge Terminal // {pathname.split('/').pop() || 'Dashboard'}
              </div>
            </header>
          )}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=Source+Code+Pro:wght@400;600&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.png" />
        <title>QuantEdge | Advanced Algo Trading</title>
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-hidden">
        <FirebaseClientProvider>
          <LayoutContent>
            {children}
          </LayoutContent>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
