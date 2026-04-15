
"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Search,
  Code2,
  History as HistoryIcon,
  Play,
  Map as MapIcon,
  Settings,
  Bell,
  BarChart3,
  Terminal,
  LogOut,
  User,
  BrainCircuit,
  ClipboardList
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { useAuth, useUser } from "@/firebase"
import LogoImage from "../../../image.png"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const mainNav = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
  { title: "AI Agent", icon: BrainCircuit, url: "/ai-agent" },
  { title: "Screener", icon: Search, url: "/screener" },
  { title: "Editor", icon: Code2, url: "/editor" },
  { title: "Backtest", icon: HistoryIcon, url: "/backtest" },
  { title: "Live Trading", icon: Play, url: "/live" },
  { title: "History", icon: ClipboardList, url: "/history" },
  { title: "Market Map", icon: MapIcon, url: "/heatmap" },
]

const analysisNav = [
  { title: "Portfolio", icon: BarChart3, url: "/portfolio" },
  { title: "Alerts", icon: Bell, url: "/alerts" },
  { title: "Debug Console", icon: Terminal, url: "/debug" },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()
  const { setOpenMobile, isMobile } = useSidebar()

  const handleLogout = async () => {
    if (!auth) return
    try {
      await signOut(auth)
      router.push('/')
    } catch (error) {
      console.error("Logout error", error)
    }
  }

  // Closes the mobile sidebar after navigation
  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-border">
        <Link href="/" className="flex items-center gap-3" onClick={handleLinkClick}>
          <div className="relative w-8 h-8 rounded overflow-hidden bg-card shadow-sm">
            <Image src={LogoImage} alt="QuantEdge logo" fill className="object-cover" />
          </div>
          <span className="font-headline font-bold text-xl group-data-[collapsible=icon]:hidden">
            QuantEdge
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url} onClick={handleLinkClick}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Analysis</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analysisNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url} onClick={handleLinkClick}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border space-y-2">
        {user && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium truncate">{user.displayName || 'Strategist'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings" isActive={pathname === '/settings'}>
              <Link href="/settings" onClick={handleLinkClick}>
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
