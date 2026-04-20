"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@kit/ui/command";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@kit/ui/dialog";
import { Input } from "@kit/ui/input";
import { useUsers } from "@kit/hooks";
import { itemsApi, recipesApi } from "@kit/lib";
import { pathsConfig, type MenuItem } from "@kit/config/paths.config";
import { ChefHat, FileText, Package, Search, Users, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

interface SearchItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: string;
  icon: React.ReactNode;
}

type ScopeKey = "items" | "users" | "recipes" | "pages";

type ScopeConfig = {
  key: ScopeKey;
  typeName: string;
  alias: string;
  icon: React.ReactNode;
};

type ParsedQuery = {
  scope?: ScopeKey;
  term: string;
  rawScope?: string;
};

const RECENT_KEY = "global-search:recent";
const RESULT_INCREMENT = 5;
const LIMIT_PER_SOURCE = 200;

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const toSingular = (value: string) => (value.endsWith("s") ? value.slice(0, -1) : value);
const toTitle = (value: string) =>
  value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const scopeConfigs: ScopeConfig[] = [
  {
    key: "items",
    typeName: "Items",
    alias: "item",
    icon: <Package className="h-4 w-4" />,
  },
  {
    key: "users",
    typeName: "Users",
    alias: "user",
    icon: <Users className="h-4 w-4" />,
  },
  {
    key: "recipes",
    typeName: "Recipes",
    alias: "recipe",
    icon: <ChefHat className="h-4 w-4" />,
  },
  {
    key: "pages",
    typeName: "Pages",
    alias: "page",
    icon: <FileText className="h-4 w-4" />,
  },
];

const scopeByAlias: Record<string, ScopeKey> = {
  item: "items",
  items: "items",
  user: "users",
  users: "users",
  recipe: "recipes",
  recipes: "recipes",
  page: "pages",
  pages: "pages",
};

const typeByScope: Record<ScopeKey, string> = {
  items: "Items",
  users: "Users",
  recipes: "Recipes",
  pages: "Pages",
};

const parseQuery = (query: string): ParsedQuery => {
  const match = query.match(/^\s*([^:]+)\s*:\s*(.*)$/);
  if (!match) return { term: query };
  const rawScope = match[1] || "";
  const term = match[2] || "";
  const scope = scopeByAlias[normalize(rawScope)];
  if (!scope) return { term, rawScope };
  return { scope, term, rawScope };
};

const getDefaultScopeFromPathname = (pathname: string | null): ScopeKey | undefined => {
  if (!pathname) return undefined;
  if (pathname.startsWith("/items")) return "items";
  if (pathname.startsWith("/users")) return "users";
  if (pathname.startsWith("/recipes")) return "recipes";
  return undefined;
};

const extractArrayData = <T,>(result: unknown): T[] => {
  if (Array.isArray(result)) return result as T[];
  if (
    result &&
    typeof result === "object" &&
    "data" in result &&
    Array.isArray((result as { data?: unknown }).data)
  ) {
    return (result as { data: T[] }).data;
  }
  return [];
};

const buildRouteSearchItems = () => {
  const items: SearchItem[] = [];
  const visit = (nodes: MenuItem[], parentTitles: string[] = []) => {
    nodes.forEach((node) => {
      const currentTitle = toTitle(node.title);
      const nextParents = [...parentTitles, currentTitle];
      if (node.url !== "#") {
        items.push({
          id: `page-${node.url}`,
          title: currentTitle,
          description: parentTitles.length > 0 ? parentTitles.join(" / ") : node.url,
          url: node.url,
          type: "Pages",
          icon: <FileText className="h-4 w-4" />,
        });
      }
      if (node.items?.length) {
        visit(node.items, nextParents);
      }
    });
  };
  visit(pathsConfig.navMain);
  visit(pathsConfig.navSecondary);
  return items;
};

const scoreItem = (item: SearchItem, term: string) => {
  const query = term.trim().toLowerCase();
  if (!query) return 10;
  const title = item.title.toLowerCase();
  const description = (item.description || "").toLowerCase();
  const combined = `${title} ${description}`.trim();

  if (title === query) return 140;
  if (title.startsWith(query)) return 110;
  if (title.split(/\s+/).some((part) => part.startsWith(query))) return 95;
  if (combined.includes(query)) return 70;
  return -1;
};

const dedupeAndSort = (items: SearchItem[], term: string) => {
  const scored = items
    .map((item) => ({ item, score: scoreItem(item, term) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));

  const bestByUrl = new Map<string, { item: SearchItem; score: number }>();
  scored.forEach((entry) => {
    const previous = bestByUrl.get(entry.item.url);
    if (!previous || entry.score > previous.score) {
      bestByUrl.set(entry.item.url, entry);
    }
  });

  return Array.from(bestByUrl.values())
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .map((entry) => entry.item);
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<Array<Pick<SearchItem, "id" | "title" | "description" | "url" | "type">>>([]);
  const [resultLimit, setResultLimit] = useState(RESULT_INCREMENT);
  const [badgeWidth, setBadgeWidth] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  const { scope, term, rawScope } = parseQuery(query);
  const defaultScope = useMemo(() => getDefaultScopeFromPathname(pathname), [pathname]);

  const shouldFetchUsers = open && (!scope || scope === "users");
  const shouldFetchItems = open && (!scope || scope === "items");
  const shouldFetchRecipes = open && (!scope || scope === "recipes");

  const { data: usersData, isLoading: usersLoading } = useUsers({ enabled: shouldFetchUsers });
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ["global-search", "items"],
    queryFn: async () => {
      const result = await itemsApi.getAll({
        limit: LIMIT_PER_SOURCE,
        excludeCatalogParents: true,
      });
      return extractArrayData<{
        id: number | string;
        name?: string;
        category?: { label?: string; name?: string };
      }>(result);
    },
    enabled: shouldFetchItems,
    staleTime: 60_000,
  });
  const { data: recipesData, isLoading: recipesLoading } = useQuery({
    queryKey: ["global-search", "recipes"],
    queryFn: async () => {
      const result = await recipesApi.getAll({ limit: LIMIT_PER_SOURCE });
      return extractArrayData<{
        id: number | string;
        name?: string;
        category?: string;
        description?: string;
      }>(result);
    },
    enabled: shouldFetchRecipes,
    staleTime: 60_000,
  });

  const routeItems = useMemo(() => buildRouteSearchItems(), []);

  const userItems = useMemo(() => {
    const items: SearchItem[] = [];
    if (!Array.isArray(usersData)) return items;
    usersData.forEach((user: any) => {
      items.push({
        id: `users-${user.id}`,
        title: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "",
        description: `${user.role || ""} ${user.department || ""}`.trim() || user.email || "",
        url: `/users/${user.id}`,
        type: "Users",
        icon: <Users className="h-4 w-4" />,
      });
    });
    return items;
  }, [usersData]);

  const itemItems = useMemo(() => {
    const items: SearchItem[] = [];
    if (!Array.isArray(itemsData)) return items;
    itemsData.forEach((item) => {
      const itemId = String(item.id);
      const categoryLabel = item.category?.label || item.category?.name || "";
      items.push({
        id: `items-${itemId}`,
        title: item.name || `Item ${itemId}`,
        description: categoryLabel || "Inventory item",
        url: `/items/${itemId}`,
        type: "Items",
        icon: <Package className="h-4 w-4" />,
      });
    });
    return items;
  }, [itemsData]);

  const recipeItems = useMemo(() => {
    const items: SearchItem[] = [];
    if (!Array.isArray(recipesData)) return items;
    recipesData.forEach((recipe) => {
      const recipeId = String(recipe.id);
      items.push({
        id: `recipes-${recipeId}`,
        title: recipe.name || `Recipe ${recipeId}`,
        description: recipe.category || recipe.description || "Recipe",
        url: `/recipes/${recipeId}`,
        type: "Recipes",
        icon: <ChefHat className="h-4 w-4" />,
      });
    });
    return items;
  }, [recipesData]);

  const isLoading = usersLoading || itemsLoading || recipesLoading;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecent(parsed);
      }
    } catch {
      // ignore
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setBadgeWidth(0);
      return;
    }
    setQuery((previous) => {
      if (previous.trim().length > 0) return previous;
      if (!defaultScope) return "";
      return `${toSingular(defaultScope)}: `;
    });
  }, [open, defaultScope]);

  useEffect(() => {
    setResultLimit(RESULT_INCREMENT);
  }, [query]);

  const handleSelect = (url: string, item?: SearchItem) => {
    setOpen(false);
    if (item) {
      setRecent((previous) => {
        const next = [
          { id: item.id, title: item.title, description: item.description, url: item.url, type: item.type },
          ...previous.filter((recentItem) => recentItem.url !== item.url),
        ].slice(0, 5);
        try {
          localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
    router.push(url);
  };

  const searchablePool = useMemo(() => {
    if (scope === "users") return userItems;
    if (scope === "items") return itemItems;
    if (scope === "recipes") return recipeItems;
    if (scope === "pages") return routeItems;
    return [...routeItems, ...itemItems, ...userItems, ...recipeItems];
  }, [scope, routeItems, itemItems, userItems, recipeItems]);

  const filteredItems = useMemo(() => dedupeAndSort(searchablePool, term), [searchablePool, term]);
  const limitedFilteredItems = filteredItems.slice(0, resultLimit);
  const hasMoreResults = filteredItems.length > resultLimit;

  const groupedFiltered = limitedFilteredItems.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, SearchItem[]>);

  const beforeColon = (query.split(":")[0] || "").trim();
  const showingFilterSuggestions = query.indexOf(":") === -1 && beforeColon.length > 0;
  const normalizedBeforeColon = normalize(beforeColon);
  const filterSuggestions = showingFilterSuggestions
    ? scopeConfigs.filter((config) => {
        const alias = normalize(config.alias);
        const typeName = normalize(config.typeName);
        return alias.includes(normalizedBeforeColon) || typeName.includes(normalizedBeforeColon);
      }).map((config) => ({
        key: config.key,
        typeName: config.typeName,
        alias: config.alias,
        display: `${config.alias}:`,
        icon: config.icon,
      }))
    : [];

  const activeScopeType = scope ? typeByScope[scope] : undefined;

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
      <DialogContent className="max-h-[600px] overflow-hidden p-0 shadow-lg">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <div className="border-b px-3">
            <div className="relative flex h-12 items-center">
              <Input
                placeholder="Search..."
                className="absolute inset-0 h-full rounded-none border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0"
                style={{ paddingLeft: `${32 + badgeWidth + 8}px` }}
                value={scope ? term : query}
                onChange={(event) => {
                  const value = event.target.value;
                  if (scope) {
                    setQuery(`${rawScope || toSingular(scope)}: ${value}`);
                    return;
                  }
                  setQuery(value);
                }}
              />
              <div className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                <Search className="h-4 w-4 opacity-50" />
                {activeScopeType && (
                  <div
                    ref={(element: HTMLDivElement | null) => {
                      if (element) setBadgeWidth(element.offsetWidth);
                    }}
                  >
                    <Badge
                      variant="secondary"
                      className="cursor-pointer text-xs hover:bg-secondary/80"
                      onClick={() => {
                        setQuery(term);
                        setBadgeWidth(0);
                      }}
                    >
                      <span className="mr-1">{toSingular(activeScopeType).toLowerCase()}</span>
                      <X className="h-3 w-3" />
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
          <CommandList className="max-h-[500px]">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
            ) : filteredItems.length === 0 &&
              filterSuggestions.length === 0 &&
              !(query.trim() === "" && recent.length > 0) ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              <>
                {filterSuggestions.length > 0 && (
                  <CommandGroup heading="Filters">
                    {filterSuggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion.key}
                        onSelect={() => setQuery(`${suggestion.display} `)}
                        onKeyDown={(event) => {
                          if (event.key === "Tab") {
                            setQuery(`${suggestion.display} `);
                            event.preventDefault();
                          }
                        }}
                        className="flex items-center gap-3"
                      >
                        {suggestion.icon}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{suggestion.display}</div>
                          <div className="truncate text-sm text-muted-foreground">
                            Scope search to {toSingular(suggestion.typeName).toLowerCase()}
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          filter
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {query.trim() === "" && recent.length > 0 && (
                  <CommandGroup heading="Recent">
                    {recent.map((recentItem) => (
                      <CommandItem
                        key={`recent-${recentItem.id}`}
                        value={`${recentItem.title} ${recentItem.description || ""} ${recentItem.type}`}
                        onSelect={() => handleSelect(recentItem.url)}
                        className="flex items-center gap-3"
                      >
                        <Users className="h-4 w-4" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{recentItem.title}</div>
                          {recentItem.description && (
                            <div className="truncate text-sm text-muted-foreground">{recentItem.description}</div>
                          )}
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {recentItem.type}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {query.trim() !== "" &&
                  Object.entries(groupedFiltered).map(([type, entries]) => (
                    <CommandGroup key={type} heading={type}>
                      {entries.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`${item.title} ${item.description || ""} ${item.type}`}
                          onSelect={() => handleSelect(item.url, item)}
                          className="flex items-center gap-3"
                        >
                          {item.icon}
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{item.title}</div>
                            {item.description && (
                              <div className="truncate text-sm text-muted-foreground">{item.description}</div>
                            )}
                          </div>
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {item.type}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                {query.trim() !== "" && hasMoreResults && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => setResultLimit((previous) => previous + RESULT_INCREMENT)}
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
