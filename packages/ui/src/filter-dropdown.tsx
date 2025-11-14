"use client"

import * as React from "react"
import { Button } from "@smartlogbook/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@smartlogbook/ui/dropdown-menu"
import { Filter } from "lucide-react"

interface FilterDropdownProps {
  children?: React.ReactNode
  filterContent?: React.ReactNode
}

export function FilterDropdown({
  children,
  filterContent,
}: FilterDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children || (
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-4">
          {filterContent}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
