"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@smartlogbook/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@smartlogbook/ui/sidebar"

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

  // Function to check if a menu item is active
  const isItemActive = (url: string) => {
    if (url === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/"
    }
    return pathname.startsWith(url)
  }

  // Function to check if any sub-item is active
  const hasActiveSubItem = (subItems?: { title: string; url: string }[]) => {
    if (!subItems) return false
    return subItems.some(subItem => isItemActive(subItem.url))
  }

  // Function to determine if a group should be open by default
  const shouldGroupBeOpen = (item: { url: string; items?: { title: string; url: string }[] }) => {
    return isItemActive(item.url) || hasActiveSubItem(item.items)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item, index) => {
          const isActive = isItemActive(item.url)
          const hasActiveChild = hasActiveSubItem(item.items)
          const isGroupOpen = shouldGroupBeOpen(item)
          
          return (
            <Collapsible key={`${item.title}-${index}`} asChild defaultOpen={isGroupOpen}>
              <SidebarMenuItem>
                {item.items?.length ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        isActive={isActive}
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
                        {item.items?.map((subItem) => {
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
                  </>
                ) : (
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive}
                    className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : ""}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
})
