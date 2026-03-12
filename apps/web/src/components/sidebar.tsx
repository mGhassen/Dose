"use client"

import * as React from "react"
import { useMemo } from "react"
import {
  Train,
  Wrench,
  MapPin,
  Settings,
  Zap,
  Calendar,
  Cog,
  ListChecks,
  Users,
  AlertTriangle,
  Home,
  Command,
  Package,
  FileText,
  HelpCircle,
  MessageSquare,
  Bug,
  Layers,
  Hash,
  DollarSign,
  CreditCard,
  TrendingUp,
  Building2,
  Briefcase,
  PiggyBank,
  BarChart3,
  Wallet,
  Receipt,
  Calculator,
  Target,
  FileSpreadsheet,
} from "lucide-react"
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import { pathsConfig, type MenuItem } from '@kit/config/paths.config'

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@kit/ui/sidebar"
import { type LucideIcon } from "lucide-react"

// Icon mapping
const iconMap = {
  Train,
  Wrench,
  MapPin,
  Settings,
  Zap,
  Calendar,
  Cog,
  ListChecks,
  Users,
  AlertTriangle,
  Home,
  Command,
  Package,
  FileText,
  HelpCircle,
  MessageSquare,
  Bug,
  Layers,
  Hash,
  DollarSign,
  CreditCard,
  TrendingUp,
  Building2,
  Briefcase,
  PiggyBank,
  BarChart3,
  Wallet,
  Receipt,
  Calculator,
  Target,
  FileSpreadsheet,
} as const

// Processed menu item type with React component icon
type ProcessedMenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  translationKey?: string;
  isActive?: boolean;
  items?: ProcessedMenuItem[];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations('navigation');
  
  const data = useMemo(() => {
    const processMenuItems = (items: MenuItem[]): ProcessedMenuItem[] => {
      return items.map((item: MenuItem) => {
        return {
          title: item.translationKey ? t(item.translationKey) : item.title,
          url: item.url,
          icon: item.icon ? (iconMap[item.icon as keyof typeof iconMap] || FileText) : FileText,
          translationKey: item.translationKey,
          isActive: item.isActive,
          items: item.items ? processMenuItems(item.items) : undefined,
        };
      });
    }

    return {
      navMain: processMenuItems(pathsConfig.navMain),
      navSecondary: processMenuItems(pathsConfig.navSecondary),
    }
  }, [t])

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Dose">
              <Link href="/dashboard">
                <Image src="/logo_light.png" alt="Dose" width={96} height={32} className="h-8 w-auto dark:hidden" priority />
                <Image src="/logo_dark.png" alt="Dose" width={96} height={32} className="h-8 w-auto hidden dark:block" priority />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate text-xs text-muted-foreground">Console</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}