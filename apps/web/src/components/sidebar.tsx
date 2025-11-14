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
} from "lucide-react"
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { pathsConfig, type MenuItem } from '@smartlogbook/config/paths.config'

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
} from "@smartlogbook/ui/sidebar"
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
      return items.map((item: MenuItem) => ({
        title: item.translationKey ? t(item.translationKey) : item.title,
        url: item.url,
        icon: iconMap[item.icon as keyof typeof iconMap],
        translationKey: item.translationKey,
        isActive: item.isActive,
        items: item.items ? processMenuItems(item.items) : undefined,
      }))
    }

    return {
      navMain: processMenuItems(pathsConfig.navMain),
      navSecondary: processMenuItems(pathsConfig.navSecondary),
    }
  }, [t])

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Train className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">SmartLogBook</span>
                  <span className="truncate text-xs">Console</span>
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
    </Sidebar>
  )
}