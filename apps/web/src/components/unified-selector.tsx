'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@kit/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Checkbox } from '@kit/ui/checkbox';
import { Badge } from '@kit/ui/badge';
import { Label } from '@kit/ui/label';
import { Plus, Search, Copy } from 'lucide-react';
import RelatedDataLink from '@/components/related-data-link';

interface UnifiedSelectorItem {
  id: number;
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
  // Mode: single or multi
  mode?: 'single' | 'multi';
  
  // Items to display
  items: UnifiedSelectorItem[];
  isLoading?: boolean;
  
  // Single select props
  selectedId?: number; // For single select: show selected value
  onSelect?: (item: UnifiedSelectorItem) => void;
  onDuplicate?: (item: UnifiedSelectorItem) => void;
  onCreateNew?: () => void;
  
  // Multi select props
  selectedIds?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  
  // Display props
  type?: string; // For single select: 'action' | 'question' | 'operation' | etc.
  buttonText?: string; // For single select button (overrides selected value display)
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  required?: boolean; // Whether the field is required (adds asterisk to label)
  disabled?: boolean; // Whether the selector is disabled
  manageLink?: {
    href: string;
    text: string;
  };
  
  // Customization
  renderItem?: (item: UnifiedSelectorItem, isSelected?: boolean) => React.ReactNode;
  getDisplayName?: (item: UnifiedSelectorItem) => string;
}

export function UnifiedSelector({
  mode = 'single',
  items,
  isLoading = false,
  selectedId,
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
  getDisplayName
}: UnifiedSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const filteredItems = items.filter(item => {
    const searchLower = searchValue.toLowerCase();
    const name = getDisplayName 
      ? getDisplayName(item)
      : mode === 'single' && type === 'action' 
        ? (item.name || item.act)
        : mode === 'single' && type === 'question'
        ? item.text
        : (item.name || item.code || `Item ${item.id}`);
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

  // Single select handlers
  const handleSelect = (item: UnifiedSelectorItem) => {
    setOpen(false);
    setSearchValue('');
    if (onSelect) {
      onSelect(item);
    }
  };

  // Handler to clear selection
  const handleClearSelection = () => {
    setOpen(false);
    setSearchValue('');
    // Call onSelect with id: 0 to indicate no selection
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

  // Multi select handlers
  const handleCheckboxChange = (itemId: number, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedIds, itemId]);
    } else {
      onSelectionChange?.(selectedIds.filter(id => id !== itemId));
    }
  };

  // Default render for single select
  const defaultSingleRenderItem = (item: UnifiedSelectorItem) => {
    const name = getDisplayName 
      ? getDisplayName(item)
      : type === 'action' 
        ? (item.name || item.act)
        : type === 'question'
        ? item.text
        : item.name;
    const displayName = name || `Unnamed ${type}`;
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
            title={`Duplicate ${type}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  };

  // Default render for multi select
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
              📍 {item.localizations.length} location{item.localizations.length !== 1 ? 's' : ''}
              {item.localizations.slice(0, 2).map((loc: any) => loc.name || loc.code).filter(Boolean).join(', ')}
              {item.localizations.length > 2 && '...'}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Single select mode (Popover with Button)
  if (mode === 'single') {
    // Determine button text: show selected value if selectedId is provided, otherwise use buttonText or default
    const selectedItem = selectedId ? items.find(item => item.id === selectedId) : null;
    const displayButtonText = buttonText 
      ? buttonText 
      : selectedItem 
        ? (getDisplayName ? getDisplayName(selectedItem) : (selectedItem.name || selectedItem.code || `Item ${selectedItem.id}`))
        : placeholder || `Select ${type}`;
    
    // Format label with asterisk if required
    const displayLabel = label ? (required && !label.endsWith(' *') ? `${label} *` : label) : undefined;
    
    return (
      <div className="space-y-2">
        {displayLabel && (
          <div className="relative">
            <Label>{displayLabel}</Label>
            {manageLink && (
              <RelatedDataLink 
                href={manageLink.href} 
                className="text-xs absolute right-0 top-0"
              >
                {manageLink.text}
              </RelatedDataLink>
            )}
          </div>
        )}
        <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="default" className="w-full justify-start text-left font-normal px-3 text-base md:text-sm shadow-md" disabled={disabled}>
              <span className="truncate">{displayButtonText}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="start" sideOffset={5}>
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                type="text"
                placeholder={searchPlaceholder || `Search ${type}s...`}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 shadow-none"
              />
            </div>
            <CommandList className="max-h-80">
              <CommandEmpty>
                {isLoading ? 'Loading...' : `No ${type}s found.`}
              </CommandEmpty>
              
              {/* Clear Selection Option */}
              <CommandGroup>
                <CommandItem
                  onSelect={handleClearSelection}
                  className="cursor-pointer px-3 py-2"
                >
                  <span className="text-muted-foreground">No selection</span>
                </CommandItem>
              </CommandGroup>
              
              {/* Create New Option */}
              {onCreateNew && (
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreateNew}
                    className="flex items-center gap-2 cursor-pointer px-3 py-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Create new {type}</span>
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Existing Items */}
              {filteredItems.length > 0 ? (
                <CommandGroup heading={`Select existing ${type}s`}>
                  {filteredItems.map((item) => {
                    return (
                      <CommandItem
                        key={item.id}
                        value={item.id.toString()}
                        onSelect={(value) => {
                          // Find the item and select it
                          const selectedItem = filteredItems.find(i => i.id.toString() === value);
                          if (selectedItem) {
                            handleSelect(selectedItem);
                          }
                        }}
                        className="cursor-pointer p-0"
                        onMouseDown={(e) => {
                          // Prevent any default form submission behavior
                          e.preventDefault();
                        }}
                      >
                        {renderItem ? renderItem(item) : defaultSingleRenderItem(item)}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : items.length > 0 ? (
                <CommandGroup>
                  <CommandItem disabled>
                    <span className="text-muted-foreground text-sm">No items match your search</span>
                  </CommandItem>
                </CommandGroup>
              ) : (
                <CommandGroup>
                  <CommandItem disabled>
                    <span className="text-muted-foreground text-sm">No {type}s available</span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      </div>
    );
  }

  // Multi select mode (Select with checkboxes)
  // Format label with asterisk if required
  const displayLabel = label ? (required && !label.endsWith(' *') ? `${label} *` : label) : undefined;
  
  return (
    <div className="space-y-2">
      {displayLabel && (
        <div className="relative">
          <Label>{displayLabel}</Label>
          {manageLink && (
            <RelatedDataLink 
              href={manageLink.href} 
              className="text-xs absolute right-0 top-0"
            >
              {manageLink.text}
            </RelatedDataLink>
          )}
        </div>
      )}
      <Select open={open} onOpenChange={setOpen}>
        <SelectTrigger className="h-10">
          <SelectValue placeholder={selectedIds.length > 0 ? `${selectedIds.length} item${selectedIds.length !== 1 ? 's' : ''} selected` : placeholder || "Select items (multiple)"} />
        </SelectTrigger>
        <SelectContent className="p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                type="text"
                placeholder={searchPlaceholder || "Search items..."}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 shadow-none"
              />
            </div>
            <CommandList className="max-h-80">
              <CommandEmpty>
                {isLoading ? 'Loading...' : 'No items found.'}
              </CommandEmpty>
              
              {filteredItems.length > 0 && (
                <CommandGroup>
                  {filteredItems.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
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
            </CommandList>
          </Command>
        </SelectContent>
      </Select>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedIds.map(itemId => {
            const item = items.find((i) => i.id === itemId);
            if (!item) return null;
            const name = getDisplayName ? getDisplayName(item) : (item.name || item.code || `Item ${item.id}`);
            return (
              <Badge key={itemId} variant="secondary" className="cursor-pointer" onClick={() => {
                onSelectionChange?.(selectedIds.filter(id => id !== itemId));
              }}>
                #{item.id} - {name}
                {item.code && item.name && ` (${item.code})`}
                <span className="ml-1">×</span>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

