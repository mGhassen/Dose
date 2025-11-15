"use client";

import { Button } from "@kit/ui/button";
import { Table2, Grid3x3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";

type ViewType = "table" | "grid";

interface ViewToggleProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          {view === "table" ? (
            <>
              <Table2 className="w-4 h-4 mr-1" />
              Table View
            </>
          ) : (
            <>
              <Grid3x3 className="w-4 h-4 mr-1" />
              Grid View
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewChange("table")}>
          <Table2 className="w-4 h-4 mr-2" />
          Table View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onViewChange("grid")}>
          <Grid3x3 className="w-4 h-4 mr-2" />
          Grid View
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

