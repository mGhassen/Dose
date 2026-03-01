"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@kit/ui/collapsible"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@kit/ui/hover-card"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@kit/ui/sidebar"

import React from "react"

export const NavMain = React.memo(function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const isItemActive = (url: string) => {
    if (url === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/"
    }
    return pathname.startsWith(url)
  }

  const hasActiveSubItem = (subItems?: { title: string; url: string }[]) => {
    if (!subItems) return false
    return subItems.some(subItem => isItemActive(subItem.url))
  }

  const shouldGroupBeOpen = (item: { url: string; items?: { title: string; url: string }[] }) => {
    return isItemActive(item.url) || hasActiveSubItem(item.items)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item, index) => {
          const isActive = isItemActive(item.url)
          const isGroupOpen = shouldGroupBeOpen(item)
          const hasSubItems = item.items && item.items.length > 0

          if (hasSubItems && isCollapsed) {
            return (
              <SidebarMenuItem key={`${item.title}-${index}`}>
                <HoverCard openDelay={100} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <SidebarMenuButton
                      isActive={isActive}
                      asChild
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : ""}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </HoverCardTrigger>
                  <HoverCardContent
                    side="right"
                    align="start"
                    sideOffset={8}
                    className="w-48 p-0"
                  >
                    <div className="border-b border-sidebar-border bg-muted/50 px-3 py-2">
                      <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                    </div>
                    <nav className="p-1">
                      {item.items!.map((subItem) => {
                        const isSubItemActive = isItemActive(subItem.url)
                        return (
                          <Link
                            key={subItem.title}
                            href={subItem.url}
                            className={`block rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent ${
                              isSubItemActive ? "bg-sidebar-accent font-medium" : ""
                            }`}
                          >
                            {subItem.title}
                          </Link>
                        )
                      })}
                    </nav>
                  </HoverCardContent>
                </HoverCard>
              </SidebarMenuItem>
            )
          }

          if (hasSubItems) {
            return (
              <Collapsible key={`${item.title}-${index}`} asChild defaultOpen={isGroupOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : ""}
                      asChild
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </Link>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items!.map((subItem) => {
                        const isSubItemActive = isItemActive(subItem.url)
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubItemActive}
                              className={isSubItemActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : ""}
                            >
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          return (
            <SidebarMenuItem key={`${item.title}-${index}`}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.title}
                className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : ""}
              >
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
})
