"use client";

import { useState, useEffect, useMemo } from "react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@kit/ui/command";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@kit/ui/dialog";
import { Button } from "@kit/ui/button";
import { Badge } from "@kit/ui/badge";
import { Search, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@kit/ui/input";
import { useUsers } from "@kit/hooks";

interface SearchItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: string;
  icon: React.ReactNode;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<Array<Pick<SearchItem, "id" | "title" | "description" | "url" | "type">>>([]);
  const [resultLimit, setResultLimit] = useState(5);
  const [badgeWidth, setBadgeWidth] = useState(0);
  const router = useRouter();

  const RECENT_KEY = "global-search:recent";

  // Helper functions
  const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  const toSingular = (v: string) => v.endsWith("s") ? v.slice(0, -1) : v;

  // Parse query to determine which filter is active
  const parseQuery = (q: string): { scope?: string; term: string; rawScope?: string } => {
    const match = q.match(/^\s*([^:]+)\s*:\s*(.*)$/);
    if (!match) return { term: q };
    const rawScope = match[1] || "";
    const term = match[2] || "";
    const normalized = normalize(rawScope);
    if (normalized === 'user' || normalized === 'users') {
      return { scope: 'Users', term, rawScope };
    }
    return { term, rawScope };
  };

  const { scope, term, rawScope } = parseQuery(query);
  const shouldFetch = open && scope === 'Users';

  // Fetch users data
  const { data: usersData, isLoading: usersLoading } = useUsers({ enabled: shouldFetch });

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    if (!open) return;
    
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecent(parsed);
      }
    } catch (e) {
      // ignore
    }
  }, [open]);

  // Build search items from users data
  const searchItems = useMemo(() => {
    const items: SearchItem[] = [];

    if (usersData && Array.isArray(usersData)) {
      usersData.forEach((item: any) => {
        items.push({
          id: `users-${item.id}`,
          title: `${item.firstName || ""} ${item.lastName || ""}`.trim() || item.email || "",
          description: `${item.role || ""} ${item.department || ""}`.trim() || item.email || "",
          url: `/users/${item.id}`,
          type: "Users",
          icon: <Users className="h-4 w-4" />
        });
      });
    }

    return items;
  }, [usersData]);

  const isLoading = usersLoading;

  const handleSelect = (url: string, item?: SearchItem) => {
    setOpen(false);
    // Save to recent (max 5, dedupe by url)
    if (item) {
      setRecent(prev => {
        const next = [
          { id: item.id, title: item.title, description: item.description, url: item.url, type: item.type },
          ...prev.filter(r => r.url !== item.url)
        ].slice(0, 5);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
    }
    router.push(url);
  };

  const filteredItems: SearchItem[] = (() => {
    // Only show data when users filter is selected
    if (scope !== 'Users') {
      return [];
    }
    // If scoped like "user: john"
    const t = term.trim().toLowerCase();
    const itemsInScope = searchItems.filter(i => i.type === scope);
    if (!t) return itemsInScope;
    return itemsInScope.filter(i =>
      `${i.title} ${i.description || ""}`.toLowerCase().includes(t)
    );
  })();

  const limitedFilteredItems = filteredItems.slice(0, resultLimit);
  const hasMoreResults = filteredItems.length > resultLimit;

  const groupedFiltered = limitedFilteredItems.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, SearchItem[]>);

  // Build filter suggestions
  const beforeColon = (query.split(":")[0] || "").trim();
  const showingFilterSuggestions = query.indexOf(":") === -1 && beforeColon.length > 0;
  const filterSuggestions = showingFilterSuggestions && (normalize(beforeColon).includes('user') || normalize(beforeColon).includes('users'))
    ? [{
        key: 'users',
        typeName: 'Users',
        alias: 'user',
        display: 'user:',
        icon: <Users className="h-4 w-4" />
      }]
    : [];

  const insertFilter = (display: string) => {
    setQuery(`${display} `);
  };

  // Reset limit when query changes
  useEffect(() => {
    setResultLimit(5);
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="relative h-9 w-full justify-start rounded-[0.5rem] bg-muted text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="hidden lg:inline-flex">Search...</span>
          <span className="inline-flex lg:hidden">Search</span>
          <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 shadow-lg max-h-[600px]">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <div className="border-b px-3">
            <div className="relative flex items-center h-12">
              <Input
                placeholder="Search..."
                className="absolute inset-0 border-0 focus-visible:ring-0 bg-transparent h-full shadow-none rounded-none"
                style={{ paddingLeft: `${32 + badgeWidth + 8}px` }}
                value={scope ? term : query}
                onChange={(e) => {
                  const v = e.target.value;
                  if (scope) {
                    setQuery(`${rawScope || toSingular(scope).toLowerCase()}: ${v}`);
                  } else {
                    setQuery(v);
                  }
                }}
              />
              <div className="absolute left-3 flex items-center gap-2 top-1/2 -translate-y-1/2">
                <Search className="h-4 w-4 opacity-50" />
                {scope && (
                  <div
                    ref={(el: HTMLDivElement | null) => {
                      if (el) setBadgeWidth(el.offsetWidth);
                    }}
                  >
                    <Badge 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-secondary/80 flex items-center gap-1"
                      onClick={() => {
                        setQuery("");
                        setBadgeWidth(0);
                      }}
                    >
                      {toSingular(scope).toLowerCase()}
                      <X className="h-3 w-3" />
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
          <CommandList className="max-h-[500px]">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : filteredItems.length === 0 && filterSuggestions.length === 0 && !(query.trim() === "" && recent.length > 0) ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              <>
                {filterSuggestions.length > 0 && (
                  <CommandGroup heading="Filters">
                    {filterSuggestions.map(s => (
                      <CommandItem 
                        key={s.display} 
                        onSelect={() => insertFilter(s.display)} 
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            insertFilter(s.display);
                            e.preventDefault();
                          }
                        }}
                        className="flex items-center gap-3"
                      >
                        {s.icon}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{s.display}</div>
                          <div className="text-sm text-muted-foreground truncate">Scope search to {toSingular(s.typeName).toLowerCase()}</div>
                        </div>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">filter</Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {query.trim() === "" && recent.length > 0 && (
                  <CommandGroup heading="Recent">
                    {recent.map(r => (
                      <CommandItem
                        key={`recent-${r.id}`}
                        value={`${r.title} ${r.description || ""} ${r.type}`}
                        onSelect={() => handleSelect(r.url)}
                        className="flex items-center gap-3"
                      >
                        <Users className="h-4 w-4" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{r.title}</div>
                          {r.description && (
                            <div className="text-sm text-muted-foreground truncate">{r.description}</div>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">{r.type}</Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {query.trim() !== "" && Object.entries(groupedFiltered).map(([type, items]) => (
                  <CommandGroup key={type} heading={type}>
                    {items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.title} ${item.description || ""} ${item.type}`}
                        onSelect={() => handleSelect(item.url, item)}
                        className="flex items-center gap-3"
                      >
                        {item.icon}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground truncate">{item.description}</div>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {item.type}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
                {query.trim() !== "" && hasMoreResults && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => setResultLimit(prev => prev + 5)}
                      className="flex items-center justify-center py-2 text-muted-foreground"
                    >
                      Load more ({filteredItems.length - resultLimit} remaining)
                    </CommandItem>
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
