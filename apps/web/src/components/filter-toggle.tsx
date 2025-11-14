"use client";

import { useState } from "react";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";

interface FilterToggleProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterToggle({ 
  title = "Filters", 
  children, 
  className = "mb-6" 
}: FilterToggleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={className}>
      {/* Filter Toggle Button */}
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          {title}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Filter Card */}
      {isExpanded && (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
