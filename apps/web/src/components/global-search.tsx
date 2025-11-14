"use client";

import { useState, useEffect, useMemo } from "react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@smartlogbook/ui/command";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@smartlogbook/ui/dialog";
import { Button } from "@smartlogbook/ui/button";
import { Badge } from "@smartlogbook/ui/badge";
import { 
  Search, 
  ListChecks, 
  Calendar, 
  MapPin, 
  Users, 
  Settings,
  FileText,
  AlertTriangle,
  Wrench,
  Building,
  Package,
  Tag,
  ClipboardList,
  Activity,
  Code,
  GitBranch,
  Layers,
  Database,
  Target,
  FolderTree
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@smartlogbook/ui/input";
import { X } from "lucide-react";
import { 
  useEvents, 
  useUsers, 
  useObjects, 
  useIssues, 
  useActs,
  useAllOperations,
  useProcedures,
  useAllActions,
  useAllQuestions,
  useActionReferences,
  useActionRefTypes,
  useOperationTypes,
  useLocations,
  useLocationLevels,
  useChecklists,
  useAssetItems,
  useAssetModels
} from "@smartlogbook/hooks";

interface SearchItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: string;
  icon: React.ReactNode;
}

interface EntityConfig {
  icon: React.ReactNode;
  name: string;
  getTitle: (item: any) => string;
  getDescription: (item: any) => string;
  getId: (item: any) => string | number;
  getUrl: (id: string | number) => string;
  getData: () => any[] | undefined; // Function to get data from hook
}

// Create entity configs with data getters
// Note: ActionTypes is excluded as it's an enum, not a searchable entity
const createEntityConfigs = (
  eventsData: any[] | undefined,
  usersData: any[] | undefined,
  objectsData: any,
  issuesData: any[] | undefined,
  actsData: any[] | undefined,
  operationsData: any,
  proceduresData: any,
  actionsData: any[] | undefined,
  questionsData: any[] | undefined,
  actionReferencesData: any,
  actionRefTypesData: any[] | undefined,
  operationTypesData: any[] | undefined,
  locationsData: any,
  locationLevelsData: any[] | undefined,
  checklistsData: any[] | undefined,
  assetItemsData: any[] | undefined,
  assetModelsData: any[] | undefined
): Record<string, EntityConfig> => ({
  events: {
    icon: <Calendar className="h-4 w-4" />,
    name: "Events",
    getTitle: (item) => item.name || item.type || `Event ${item.id}`,
    getDescription: (item) => item.description || "",
    getId: (item) => item.id,
    getUrl: (id) => `/events/${id}`,
    getData: () => eventsData
  },
  locations: {
    icon: <MapPin className="h-4 w-4" />,
    name: "Locations",
    getTitle: (item) => item.name || item.code || `Location ${item.id}`,
    getDescription: (item) => item.description || "",
    getId: (item) => item.id,
    getUrl: (id) => `/locations/${id}`,
    getData: () => locationsData?.items || []
  },
  locationLevels: {
    icon: <Layers className="h-4 w-4" />,
    name: "Location Levels",
    getTitle: (item) => item.name || `Level ${item.level}` || "",
    getDescription: (item) => item.description || "",
    getId: (item) => item.id,
    getUrl: (id) => `/location-levels/${id}`,
    getData: () => locationLevelsData
  },
  users: {
    icon: <Users className="h-4 w-4" />,
    name: "Users",
    getTitle: (item) => `${item.firstName || ""} ${item.lastName || ""}`.trim() || item.email || "",
    getDescription: (item) => `${item.role || ""} ${item.department || ""}`.trim() || item.email || "",
    getId: (item) => item.id,
    getUrl: (id) => `/users/${id}`,
    getData: () => usersData
  },
  objects: {
    icon: <Wrench className="h-4 w-4" />,
    name: "Objects",
    getTitle: (item) => item.name || item.code || `Object ${item.id}`,
    getDescription: (item) => item.description || item.type || "",
    getId: (item) => item.id,
    getUrl: (id) => `/objects/${id}`,
    getData: () => objectsData?.items || []
  },
  issues: {
    icon: <AlertTriangle className="h-4 w-4" />,
    name: "Issues",
    getTitle: (item) => item.label || item.title || item.type || `Issue ${item.id}`,
    getDescription: (item) => item.description || item.status || "",
    getId: (item) => item.id,
    getUrl: (id) => `/issues/${id}`,
    getData: () => issuesData
  },
  actions: {
    icon: <Activity className="h-4 w-4" />,
    name: "Actions",
    getTitle: (item) => item.comment || `Action ${item.id}`,
    getDescription: (item) => `Action Reference: ${item.actionReferenceId}` || "",
    getId: (item) => item.id,
    getUrl: (id) => `/actions/${id}`,
    getData: () => actionsData
  },
  actionReferences: {
    icon: <GitBranch className="h-4 w-4" />,
    name: "Action References",
    getTitle: (item) => item.description || item.act?.name || `Action Reference ${item.id}`,
    getDescription: (item) => `${item.actionRefType?.name || ""} ${item.act?.name || ""}`.trim() || "",
    getId: (item) => item.id,
    getUrl: (id) => `/action-references/${id}`,
    getData: () => actionReferencesData?.items || []
  },
  operations: {
    icon: <ClipboardList className="h-4 w-4" />,
    name: "Operations",
    getTitle: (item) => item.name || `Operation ${item.id}`,
    getDescription: (item) => item.description || "",
    getId: (item) => item.id,
    getUrl: (id) => `/operations/${id}`,
    getData: () => operationsData?.items || []
  },
  operationTypes: {
    icon: <Target className="h-4 w-4" />,
    name: "Operation Types",
    getTitle: (item) => item.name || `Operation Type ${item.id}`,
    getDescription: (item) => item.description || "",
    getId: (item) => item.id,
    getUrl: (id) => `/operation-types/${id}`,
    getData: () => operationTypesData
  },
  questions: {
    icon: <Code className="h-4 w-4" />,
    name: "Questions",
    getTitle: (item) => item.value || `Question ${item.id}`,
    getDescription: (item) => `Operation: ${item.operationId}` || "",
    getId: (item) => item.id,
    getUrl: (id) => `/questions/${id}`,
    getData: () => questionsData
  },
  procedures: {
    icon: <FileText className="h-4 w-4" />,
    name: "Procedures",
    getTitle: (item) => item.name || `Procedure ${item.id}`,
    getDescription: (item) => item.description || "",
    getId: (item) => item.id,
    getUrl: (id) => `/procedures/${id}`,
    getData: () => proceduresData?.items || []
  },
  acts: {
    icon: <FileText className="h-4 w-4" />,
    name: "Acts",
    getTitle: (item) => item.name || `Act ${item.id}`,
    getDescription: (item) => item.description || "",
    getId: (item) => item.id,
    getUrl: (id) => `/acts/${id}`,
    getData: () => actsData
  },
  checklists: {
    icon: <ListChecks className="h-4 w-4" />,
    name: "Checklists",
    getTitle: (item) => item.name || `Checklist ${item.id}`,
    getDescription: (item) => item.description || "",
    getId: (item) => item.id,
    getUrl: (id) => `/checklists/${id}`,
    getData: () => checklistsData
  },
  actionRefTypes: {
    icon: <FolderTree className="h-4 w-4" />,
    name: "Action Ref Types",
    getTitle: (item) => item.name || `Action Ref Type ${item.id}`,
    getDescription: (item) => item.description || "",
    getId: (item) => item.id,
    getUrl: (id) => `/action-ref-types/${id}`,
    getData: () => actionRefTypesData
  },
  assetItems: {
    icon: <Database className="h-4 w-4" />,
    name: "Asset Items",
    getTitle: (item) => item.label || item.name || `Asset Item ${item.id}`,
    getDescription: (item) => item.description || "",
    getId: (item) => item.id,
    getUrl: (id) => `/asset-items/${id}`,
    getData: () => assetItemsData
  },
  assetModels: {
    icon: <Building className="h-4 w-4" />,
    name: "Asset Models",
    getTitle: (item) => item.label || item.name || `Asset Model ${item.id}`,
    getDescription: (item) => item.description || "",
    getId: (item) => item.id,
    getUrl: (id) => `/asset-models/${id}`,
    getData: () => assetModelsData
  }
});

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

  // Simple static mapping for determining which entity to fetch (before entityConfigs is built)
  const entityKeyMap: Record<string, string> = {
    'events': 'events',
    'event': 'events',
    'locations': 'locations',
    'location': 'locations',
    'locationlevels': 'locationLevels',
    'locationlevel': 'locationLevels',
    'users': 'users',
    'user': 'users',
    'objects': 'objects',
    'object': 'objects',
    'issues': 'issues',
    'issue': 'issues',
    'actions': 'actions',
    'action': 'actions',
    'actionreferences': 'actionReferences',
    'actionreference': 'actionReferences',
    'operations': 'operations',
    'operation': 'operations',
    'operationtypes': 'operationTypes',
    'operationtype': 'operationTypes',
    'questions': 'questions',
    'question': 'questions',
    'procedures': 'procedures',
    'procedure': 'procedures',
    'acts': 'acts',
    'act': 'acts',
    'checklists': 'checklists',
    'checklist': 'checklists',
    'actionreftypes': 'actionRefTypes',
    'actionreftype': 'actionRefTypes',
    'assetitems': 'assetItems',
    'assetitem': 'assetItems',
    'assetmodels': 'assetModels',
    'assetmodel': 'assetModels',
  };

  // Parse query early to determine which entity to fetch
  const parseQueryForFetch = (q: string): { scope?: string; term: string; rawScope?: string } => {
    const match = q.match(/^\s*([^:]+)\s*:\s*(.*)$/);
    if (!match) return { term: q };
    const rawScope = match[1] || "";
    const term = match[2] || "";
    const normalized = normalize(rawScope);
    const entityKey = entityKeyMap[normalized];
    const entityTypeMap: Record<string, string> = {
      'events': 'Events',
      'locationLevels': 'Location Levels',
      'users': 'Users',
      'objects': 'Objects',
      'issues': 'Issues',
      'actions': 'Actions',
      'actionReferences': 'Action References',
      'operations': 'Operations',
      'operationTypes': 'Operation Types',
      'questions': 'Questions',
      'procedures': 'Procedures',
      'acts': 'Acts',
      'checklists': 'Checklists',
      'actionRefTypes': 'Action Ref Types',
      'assetItems': 'Asset Items',
      'assetModels': 'Asset Models',
      'locations': 'Locations',
    };
    return { 
      scope: entityKey ? entityTypeMap[entityKey] : undefined, 
      term, 
      rawScope 
    };
  };

  // Determine which entity type is selected based on query (for fetching)
  const { scope: fetchScope, term: fetchTerm, rawScope: fetchRawScope } = parseQueryForFetch(query);
  const selectedEntityKey = fetchScope ? Object.entries(entityKeyMap).find(([_, key]) => {
    const entityTypeMap: Record<string, string> = {
      'events': 'Events',
      'locationLevels': 'Location Levels',
      'users': 'Users',
      'objects': 'Objects',
      'issues': 'Issues',
      'actions': 'Actions',
      'actionReferences': 'Action References',
      'operations': 'Operations',
      'operationTypes': 'Operation Types',
      'questions': 'Questions',
      'procedures': 'Procedures',
      'acts': 'Acts',
      'checklists': 'Checklists',
      'actionRefTypes': 'Action Ref Types',
      'assetItems': 'Asset Items',
      'assetModels': 'Asset Models',
      'locations': 'Locations',
    };
    return entityTypeMap[key] === fetchScope;
  })?.[1] : undefined;
  
  // Only fetch data for the selected entity type when dialog is open and a filter is selected
  // Note: ActionTypes is an enum, not a searchable entity, so it's excluded
  const shouldFetch = open && selectedEntityKey !== undefined;
  
  // Use React Query hooks with conditional fetching based on selected filter
  const { data: eventsData, isLoading: eventsLoading } = useEvents({ enabled: shouldFetch && selectedEntityKey === 'events' });
  const { data: usersData, isLoading: usersLoading } = useUsers({ enabled: shouldFetch && selectedEntityKey === 'users' });
  const { data: objectsData, isLoading: objectsLoading } = useObjects({ page: 1, pageSize: 100, enabled: shouldFetch && selectedEntityKey === 'objects' });
  const { data: issuesData, isLoading: issuesLoading } = useIssues({ enabled: shouldFetch && selectedEntityKey === 'issues' });
  const { data: actsData, isLoading: actsLoading } = useActs({ enabled: shouldFetch && selectedEntityKey === 'acts' });
  const { data: operationsData, isLoading: operationsLoading } = useAllOperations({ enabled: shouldFetch && selectedEntityKey === 'operations' });
  const { data: proceduresData, isLoading: proceduresLoading } = useProcedures({ page: 1, pageSize: 100, enabled: shouldFetch && selectedEntityKey === 'procedures' });
  const { data: actionsData, isLoading: actionsLoading } = useAllActions({ enabled: shouldFetch && selectedEntityKey === 'actions' });
  const { data: questionsData, isLoading: questionsLoading } = useAllQuestions({ enabled: shouldFetch && selectedEntityKey === 'questions' });
  const { data: actionReferencesData, isLoading: actionReferencesLoading } = useActionReferences({ page: 1, pageSize: 100, enabled: shouldFetch && selectedEntityKey === 'actionReferences' });
  const { data: actionRefTypesData, isLoading: actionRefTypesLoading } = useActionRefTypes({ enabled: shouldFetch && selectedEntityKey === 'actionRefTypes' });
  const { data: operationTypesData, isLoading: operationTypesLoading } = useOperationTypes({ enabled: shouldFetch && selectedEntityKey === 'operationTypes' });
  const { data: locationsData, isLoading: locationsLoading } = useLocations({ page: 1, pageSize: 100, enabled: shouldFetch && selectedEntityKey === 'locations' });
  const { data: locationLevelsData, isLoading: locationLevelsLoading } = useLocationLevels({ enabled: shouldFetch && selectedEntityKey === 'locationLevels' });
  const { data: checklistsData, isLoading: checklistsLoading } = useChecklists({ enabled: shouldFetch && selectedEntityKey === 'checklists' });
  const { data: assetItemsData, isLoading: assetItemsLoading } = useAssetItems({ enabled: shouldFetch && selectedEntityKey === 'assetItems' });
  const { data: assetModelsData, isLoading: assetModelsLoading } = useAssetModels({ enabled: shouldFetch && selectedEntityKey === 'assetModels' });

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

  // Create entity configs with current data
  const entityConfigs = useMemo(() => createEntityConfigs(
    eventsData,
    usersData,
    objectsData,
    issuesData,
    actsData,
    operationsData,
    proceduresData,
    actionsData,
    questionsData,
    actionReferencesData,
    actionRefTypesData,
    operationTypesData,
    locationsData,
    locationLevelsData,
    checklistsData,
    assetItemsData,
    assetModelsData
  ), [
    eventsData,
    usersData,
    objectsData,
    issuesData,
    actsData,
    operationsData,
    proceduresData,
    actionsData,
    questionsData,
    actionReferencesData,
    actionRefTypesData,
    operationTypesData,
    locationsData,
    locationLevelsData,
    checklistsData,
    assetItemsData,
    assetModelsData
  ]);

  // Build entity aliases for filter matching (dynamic, built from entityConfigs)
  const entityAliases: Array<{
    key: string;
    typeName: string;
    alias: string;
    display: string;
    icon: React.ReactNode;
  }> = Object.entries(entityConfigs).flatMap(([key, cfg]) => {
    const fromKey = normalize(key);
    const fromKeySingular = toSingular(fromKey);
    const fromName = normalize(cfg.name);
    const fromNameSingular = toSingular(fromName);
    const baseDisplay = toSingular(cfg.name).toLowerCase();
    const makeEntry = (alias: string) => ({
      key,
      typeName: cfg.name,
      alias,
      display: `${baseDisplay}:`,
      icon: cfg.icon
    });
    const aliases = new Map<string, boolean>();
    [fromKey, fromKeySingular, fromName, fromNameSingular].forEach(a => {
      if (a) aliases.set(a, true);
    });
    return Array.from(aliases.keys()).map(makeEntry);
  });

  // Parse query to determine which filter is active
  const parseQuery = (q: string): { scope?: string; term: string; rawScope?: string } => {
    const match = q.match(/^\s*([^:]+)\s*:\s*(.*)$/);
    if (!match) return { term: q };
    const rawScope = match[1] || "";
    const term = match[2] || "";
    const normalized = normalize(rawScope);
    const found = entityAliases.find(a => a.alias === normalized);
    return { scope: found?.typeName, term, rawScope };
  };

  // Parse query for UI (using full entityAliases for better matching)
  const { scope, term, rawScope } = parseQuery(query);

  // Build search items from all entity data
  const searchItems = useMemo(() => {
    const items: SearchItem[] = [];

    for (const [key, config] of Object.entries(entityConfigs)) {
      try {
        const data = config.getData();
        if (!data || !Array.isArray(data)) continue;
        
        // Take first 10 items for initial load (can be expanded with search)
        data.slice(0, 10).forEach((item: any) => {
          items.push({
            id: `${key}-${config.getId(item)}`,
            title: config.getTitle(item),
            description: config.getDescription(item),
            url: config.getUrl(config.getId(item)),
            type: config.name,
            icon: config.icon
          });
        });
      } catch (error) {
        // Silently skip entities that fail to load
        console.warn(`Failed to process ${key} data:`, error);
      }
    }

    return items;
  }, [entityConfigs]);

  // Check if any data is still loading
  const isLoading = eventsLoading || usersLoading || objectsLoading || issuesLoading || 
    actsLoading || operationsLoading || proceduresLoading || actionsLoading || 
    questionsLoading || actionReferencesLoading || actionRefTypesLoading ||
    operationTypesLoading || locationsLoading || locationLevelsLoading || checklistsLoading ||
    assetItemsLoading || assetModelsLoading;

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
    // Only show data when a filter is selected
    if (!scope) {
      return [];
    }
    // If scoped like "location: engine"
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

  // Build filter suggestions (autocomplete before the colon)
  const beforeColon = (query.split(":")[0] || "").trim();
  const showingFilterSuggestions = query.indexOf(":") === -1 && beforeColon.length > 0;
  const filterSuggestions = showingFilterSuggestions
    ? entityAliases
        .filter(a => a.alias.includes(normalize(beforeColon)))
        // dedupe by display label (multiple aliases map to same display)
        .reduce((acc: Array<typeof entityAliases[number]>, curr) => {
          if (!acc.find(x => x.display === curr.display)) acc.push(curr);
          return acc;
        }, [])
        .slice(0, 8)
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
                    {recent.map(r => {
                      const cfg = Object.values(entityConfigs).find(c => c.name === r.type);
                      return (
                        <CommandItem
                          key={`recent-${r.id}`}
                          value={`${r.title} ${r.description || ""} ${r.type}`}
                          onSelect={() => handleSelect(r.url)}
                          className="flex items-center gap-3"
                        >
                          {cfg?.icon}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{r.title}</div>
                            {r.description && (
                              <div className="text-sm text-muted-foreground truncate">{r.description}</div>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">{r.type}</Badge>
                        </CommandItem>
                      );
                    })}
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
