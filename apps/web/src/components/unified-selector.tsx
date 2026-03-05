'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@kit/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@kit/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Checkbox } from '@kit/ui/checkbox';
import { Badge } from '@kit/ui/badge';
import { Label } from '@kit/ui/label';
import { Plus, Search, Copy } from 'lucide-react';
import RelatedDataLink from '@/components/related-data-link';
import { useTranslations } from 'next-intl';
import { cn } from '@kit/lib/utils';

interface UnifiedSelectorItem {
  id: number | string;
  name?: string;
  code?: string;
  text?: string;
  description?: string;
  type?: string;
  act?: string;
  localizations?: Array<{ id: number; name?: string; code?: string }>;
  [key: string]: any;
}

interface UnifiedSelectorProps {
  mode?: 'single' | 'multi';
  items: UnifiedSelectorItem[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  selectedId?: number | string;
  selectedDisplayName?: string;
  onSelect?: (item: UnifiedSelectorItem) => void;
  onDuplicate?: (item: UnifiedSelectorItem) => void;
  onCreateNew?: () => void;
  selectedIds?: (number | string)[];
  onSelectionChange?: (selectedIds: (number | string)[]) => void;
  type?: string;
  buttonText?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  manageLink?: {
    href: string;
    text: string;
  };
  id?: string;
  className?: string;
  renderItem?: (item: UnifiedSelectorItem, isSelected?: boolean) => React.ReactNode;
  getDisplayName?: (item: UnifiedSelectorItem) => string;
}

export function UnifiedSelector({
  mode = 'single',
  items,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  selectedId,
  selectedDisplayName,
  onSelect,
  onDuplicate,
  onCreateNew,
  selectedIds = [],
  onSelectionChange,
  type = 'item',
  buttonText,
  placeholder,
  searchPlaceholder,
  label,
  required = false,
  disabled = false,
  manageLink,
  renderItem,
  getDisplayName,
  id,
  className
}: UnifiedSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const commandListRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const tCommon = useTranslations('common');

  const filterItems = (list: UnifiedSelectorItem[]) =>
    list.filter(item => {
      const searchLower = searchValue.toLowerCase();
      const name = getDisplayName
        ? getDisplayName(item)
        : mode === 'single' && type === 'action'
          ? (item.name || item.act)
          : mode === 'single' && type === 'question'
            ? item.text
            : (item.name || item.code || `${tCommon('item')} ${item.id}`);
      const description = item.description || '';
      const code = item.code || '';
      return (
        name?.toLowerCase().includes(searchLower) ||
        description.toLowerCase().includes(searchLower) ||
        code.toLowerCase().includes(searchLower) ||
        item.type?.toLowerCase().includes(searchLower) ||
        item.id.toString().includes(searchLower)
      );
    });

  const filteredItems = filterItems(items);

  const handleSelect = (item: UnifiedSelectorItem) => {
    setOpen(false);
    setSearchValue('');
    if (onSelect) {
      onSelect(item);
    }
  };

  const handleClearSelection = () => {
    setOpen(false);
    setSearchValue('');
    onSelect?.({ id: 0 } as UnifiedSelectorItem);
  };

  const handleDuplicate = (item: UnifiedSelectorItem) => {
    setOpen(false);
    setSearchValue('');
    onDuplicate?.(item);
  };

  const handleCreateNew = () => {
    setOpen(false);
    setSearchValue('');
    onCreateNew?.();
  };

  useEffect(() => {
    if (open && mode === 'single' && selectedItemRef.current) {
      setTimeout(() => {
        selectedItemRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }, [open, mode]);

  useEffect(() => {
    if (!open || !hasMore || !onLoadMore || loadingMore) return;
    const commandList = commandListRef.current;
    if (!commandList) return;
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const { scrollTop, scrollHeight, clientHeight } = commandList;
          if (scrollHeight - scrollTop - clientHeight < 150 && hasMore && !loadingMore) {
            onLoadMore();
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    commandList.addEventListener('scroll', handleScroll, { passive: true });
    return () => commandList.removeEventListener('scroll', handleScroll);
  }, [open, hasMore, onLoadMore, loadingMore]);

  const handleCheckboxChange = (itemId: number | string, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedIds, itemId]);
    } else {
      onSelectionChange?.(selectedIds.filter(id => String(id) !== String(itemId)));
    }
  };

  const defaultSingleRenderItem = (item: UnifiedSelectorItem) => {
    const name = getDisplayName 
      ? getDisplayName(item)
      : type === 'action' 
        ? (item.name || item.act)
        : type === 'question'
        ? item.text
        : item.name;
    const displayName = name || `${tCommon('unnamed')} ${type}`;
    const description = item.description || '';
    
    return (
      <div className="flex items-center justify-between gap-3 w-full px-3 py-3">
        <div className="flex flex-col flex-1 min-w-0 gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{displayName}</span>
            <span className="text-xs text-muted-foreground font-mono">#{item.id}</span>
          </div>
          {description && (
            <span className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </span>
          )}
        </div>
        {onDuplicate && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicate(item);
            }}
            title={`${tCommon('duplicate')} ${type}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  };

  const defaultMultiRenderItem = (item: UnifiedSelectorItem, isSelected: boolean) => {
    const name = getDisplayName ? getDisplayName(item) : (item.name || item.code || `Item ${item.id}`);
    
    return (
      <div className="flex items-start gap-2 w-full">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => handleCheckboxChange(item.id, checked as boolean)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5"
        />
        <div className="flex flex-col items-start text-left flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium leading-tight">
              #{item.id} - {name}
            </span>
            {item.code && item.name && (
              <span className="text-xs text-muted-foreground font-mono">
                ({item.code})
              </span>
            )}
          </div>
          {item.description && (
            <span className="text-xs text-muted-foreground leading-tight mt-0.5">
              {item.description}
            </span>
          )}
          {item.localizations && item.localizations.length > 0 && (
            <span className="text-xs text-muted-foreground leading-tight mt-0.5">
              📍 {item.localizations.length} {tCommon('location')}{item.localizations.length !== 1 ? 's' : ''}
              {item.localizations.slice(0, 2).map((loc: any) => loc.name || loc.code).filter(Boolean).join(', ')}
              {item.localizations.length > 2 && '...'}
            </span>
          )}
        </div>
      </div>
    );
  };

  if (mode === 'single') {
    const hasSelectedId = selectedId != null && selectedId !== '' && (typeof selectedId === 'string' || !Number.isNaN(Number(selectedId)));
    const itemsIncludingPrefill = (() => {
      if (!hasSelectedId || items.some(item => String(item.id) === String(selectedId))) return items;
      const stub: UnifiedSelectorItem = {
        id: selectedId,
        name: selectedDisplayName ?? `${tCommon('item')} ${selectedId}`,
      };
      return [stub, ...items];
    })();
    const selectedItem = hasSelectedId ? itemsIncludingPrefill.find(item => String(item.id) === String(selectedId)) : null;
    const filteredSingle = filterItems(itemsIncludingPrefill);
    const displayButtonText = buttonText
      ? buttonText
      : selectedItem
        ? (getDisplayName ? getDisplayName(selectedItem) : (selectedItem.name || selectedItem.code || `Item ${selectedItem.id}`))
        : hasSelectedId && selectedDisplayName
          ? selectedDisplayName
          : hasSelectedId
            ? `${tCommon('item')} ${selectedId}`
            : placeholder || `${tCommon('select')} ${type}`;
    
    const displayLabel = label ? (required && !label.endsWith(' *') ? `${label} *` : label) : undefined;
    
    return (
      <div className="space-y-2">
        {displayLabel && (
          manageLink ? (
            <div className="flex items-center justify-between gap-2 min-h-[1.25rem]">
              <Label htmlFor={id} className="leading-none">{displayLabel}</Label>
              <RelatedDataLink href={manageLink.href} className="text-xs shrink-0 leading-none">
                {manageLink.text}
              </RelatedDataLink>
            </div>
          ) : (
            <Label htmlFor={id}>{displayLabel}</Label>
          )
        )}
        <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              id={id}
              disabled={disabled}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-none ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                className
              )}
            >
              <span className="truncate text-left">{displayButtonText}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="start" sideOffset={5}>
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                type="text"
                placeholder={searchPlaceholder || `${tCommon('search')} ${type}s...`}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 shadow-none"
              />
            </div>
            <CommandList ref={commandListRef} className="max-h-80">
              <CommandEmpty>
                {isLoading ? 'Loading...' : `No ${type}s found.`}
              </CommandEmpty>
              
              <CommandGroup>
                <CommandItem
                  onSelect={handleClearSelection}
                  className="cursor-pointer px-3 py-2"
                >
                  <span className="text-muted-foreground">{tCommon('noSelection')}</span>
                </CommandItem>
              </CommandGroup>

              {filteredSingle.length > 0 ? (
                <CommandGroup heading={tCommon('selectExisting', { item: type })}>
                  {filteredSingle.map((item) => {
                    const isSelected = hasSelectedId && String(item.id) === String(selectedId);
                    return (
                      <CommandItem
                        key={item.id}
                        value={item.id.toString()}
                        onSelect={() => handleSelect(item)}
                        className={`cursor-pointer p-0 ${isSelected ? 'bg-accent' : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        ref={isSelected ? selectedItemRef : undefined}
                      >
                        {renderItem ? renderItem(item) : defaultSingleRenderItem(item)}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : itemsIncludingPrefill.length > 0 ? (
                <CommandGroup>
                  <CommandItem disabled>
                    <span className="text-muted-foreground text-sm">{tCommon('noItemsMatchSearch')}</span>
                  </CommandItem>
                </CommandGroup>
              ) : (
                <CommandGroup>
                  <CommandItem disabled>
                    <span className="text-muted-foreground text-sm">{tCommon('noItemsAvailable', { item: type })}</span>
                  </CommandItem>
                </CommandGroup>
              )}
              
              {hasMore && onLoadMore && (
                <CommandGroup>
                  <CommandItem
                    value="__load_more__"
                    onSelect={() => onLoadMore()}
                    className="flex items-center justify-center py-1.5 text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 border-t"
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                        Loading...
                      </span>
                    ) : (
                      <span>Load more...</span>
                    )}
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
            {onCreateNew && (
              <div className="flex shrink-0 border-t bg-muted/30 px-3 py-2">
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                  {tCommon('createNew', { entity: type })}
                </button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
      </div>
    );
  }

  const displayLabel = label ? (required && !label.endsWith(' *') ? `${label} *` : label) : undefined;
  
  return (
    <>
      {displayLabel && (
        manageLink ? (
          <div className="flex items-center justify-between gap-2 min-h-[1.25rem]">
            <Label htmlFor={id} className="leading-none">{displayLabel}</Label>
            <RelatedDataLink href={manageLink.href} className="text-xs shrink-0 leading-none">
              {manageLink.text}
            </RelatedDataLink>
          </div>
        ) : (
          <Label htmlFor={id}>{displayLabel}</Label>
        )
      )}
      <Select open={open} onOpenChange={setOpen}>
        <SelectTrigger id={id} className={cn("h-10 w-full shadow-none text-base md:text-sm justify-start [&_svg]:hidden", className)}>
          <SelectValue placeholder={selectedIds.length > 0 ? `${selectedIds.length} ${tCommon('item')}${selectedIds.length !== 1 ? 's' : ''} ${tCommon('selected')}` : placeholder || tCommon('selectItemsMultiple')} />
        </SelectTrigger>
        <SelectContent className="p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                type="text"
                placeholder={searchPlaceholder || tCommon('searchItems')}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 shadow-none"
              />
            </div>
              <CommandList ref={commandListRef} className="max-h-80">
              <CommandEmpty>
                {isLoading ? tCommon('loading') + '...' : tCommon('noItemsFound', { item: type })}
              </CommandEmpty>
              
              {filteredItems.length > 0 && (
                <CommandGroup>
                  {filteredItems.map((item) => {
                    const isSelected = selectedIds.some(id => String(id) === String(item.id));
                    return (
                      <CommandItem
                        key={item.id}
                        value={item.id.toString()}
                        onSelect={() => handleCheckboxChange(item.id, !isSelected)}
                        className="cursor-pointer px-3 py-3 hover:bg-muted/50"
                      >
                        {renderItem ? renderItem(item, isSelected) : defaultMultiRenderItem(item, isSelected)}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              
              {hasMore && onLoadMore && (
                <CommandGroup>
                  <CommandItem
                    value="__load_more__"
                    onSelect={() => onLoadMore()}
                    className="flex items-center justify-center py-1.5 text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 border-t"
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                        Loading...
                      </span>
                    ) : (
                      <span>Load more...</span>
                    )}
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </SelectContent>
      </Select>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedIds.map(itemId => {
            const item = items.find((i) => String(i.id) === String(itemId));
            if (!item) return null;
            const name = getDisplayName ? getDisplayName(item) : (item.name || item.code || `${tCommon('item')} ${item.id}`);
            return (
              <Badge key={String(itemId)} variant="secondary" className="cursor-pointer" onClick={() => {
                onSelectionChange?.(selectedIds.filter(id => String(id) !== String(itemId)));
              }}>
                #{item.id} - {name}
                {item.code && item.name && ` (${item.code})`}
                <span className="ml-1">×</span>
              </Badge>
            );
          })}
        </div>
      )}
    </>
  );
}
