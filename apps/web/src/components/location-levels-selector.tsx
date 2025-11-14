"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocationLevels, useLocationLevelChildren, LocationLevel } from "@kit/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { MapPin, ChevronRight, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface LocationLevelsSelectorProps {
  selectedLevelIds?: number[];
  onSelectionChange?: (levelIds: number[]) => void;
  onItemClick?: (level: LocationLevel) => void;
  mode?: 'selection' | 'browse';
}

export function LocationLevelsSelector({ 
  selectedLevelIds = [], 
  onSelectionChange,
  onItemClick,
  mode = 'selection'
}: LocationLevelsSelectorProps) {
  const router = useRouter();
  const { data: allLevelsData } = useLocationLevels();
  const isSelectionMode = mode === 'selection' && onSelectionChange;
  const isProcessingClick = useRef(false);
  
  const allLevels = useMemo(() => {
    if (!allLevelsData) return [];
    if (Array.isArray(allLevelsData)) return allLevelsData;
    if (typeof allLevelsData === 'object' && 'data' in allLevelsData) {
      return Array.isArray((allLevelsData as any).data) ? (allLevelsData as any).data : [];
    }
    return [];
  }, [allLevelsData]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel1, setSelectedLevel1] = useState<number | null>(null);
  const [selectedLevel2, setSelectedLevel2] = useState<number | null>(null);
  const [selectedLevel3, setSelectedLevel3] = useState<number | null>(null);

  // Fetch children using React Query with caching
  // These will use cached data when available (staleTime: 5min, refetchOnMount: false)
  const { data: level2ChildrenData = [], isLoading: isLoadingLevel2 } = useLocationLevelChildren(selectedLevel1 || 0);
  const { data: level3ChildrenData = [], isLoading: isLoadingLevel3 } = useLocationLevelChildren(selectedLevel2 || 0);
  const { data: level4ChildrenData = [], isLoading: isLoadingLevel4 } = useLocationLevelChildren(selectedLevel3 || 0);
  
  // Fallback: derive children from allLevels if React Query data not available yet
  // This prevents loading states when cached data exists
  const level2Children = useMemo(() => {
    if (selectedLevel1 && Array.isArray(level2ChildrenData) && level2ChildrenData.length > 0) {
      return level2ChildrenData;
    }
    if (selectedLevel1) {
      return allLevels.filter((l: LocationLevel) => l.parentLevelId === selectedLevel1);
    }
    return [];
  }, [level2ChildrenData, allLevels, selectedLevel1]);
  
  const level3Children = useMemo(() => {
    if (selectedLevel2 && Array.isArray(level3ChildrenData) && level3ChildrenData.length > 0) {
      return level3ChildrenData;
    }
    if (selectedLevel2) {
      return allLevels.filter((l: LocationLevel) => l.parentLevelId === selectedLevel2);
    }
    return [];
  }, [level3ChildrenData, allLevels, selectedLevel2]);
  
  const level4Children = useMemo(() => {
    if (selectedLevel3 && Array.isArray(level4ChildrenData) && level4ChildrenData.length > 0) {
      return level4ChildrenData;
    }
    if (selectedLevel3) {
      return allLevels.filter((l: LocationLevel) => l.parentLevelId === selectedLevel3);
    }
    return [];
  }, [level4ChildrenData, allLevels, selectedLevel3]);

  // Get the selected item
  const selectedItem = useMemo(() => {
    if (selectedLevel3) return allLevels.find((l: LocationLevel) => l.id === selectedLevel3 && l.level === 3);
    if (selectedLevel2) return allLevels.find((l: LocationLevel) => l.id === selectedLevel2 && l.level === 2);
    if (selectedLevel1) return allLevels.find((l: LocationLevel) => l.id === selectedLevel1 && l.level === 1);
    return null;
  }, [allLevels, selectedLevel1, selectedLevel2, selectedLevel3]);

  // Get parent chain for selected item
  const parentChain = useMemo(() => {
    if (!selectedItem) return { level1Parent: null, level2Parent: null };
    
    if (selectedItem.level === 3) {
      const level2Parent = selectedItem.parentLevelId
        ? allLevels.find((l: LocationLevel) => l.id === selectedItem.parentLevelId)
        : null;
      const level1Parent = level2Parent && level2Parent.parentLevelId
        ? allLevels.find((l: LocationLevel) => l.id === level2Parent.parentLevelId)
        : null;
      return { level1Parent, level2Parent };
    } else if (selectedItem.level === 2) {
      const level1Parent = selectedItem.parentLevelId
        ? allLevels.find((l: LocationLevel) => l.id === selectedItem.parentLevelId)
        : null;
      return { level1Parent, level2Parent: null };
    }
    return { level1Parent: null, level2Parent: null };
  }, [selectedItem, allLevels]);

  const hasLevel2Children = level2Children.length > 0;
  const hasLevel3Children = level3Children.length > 0;
  const hasLevel4Children = level4Children.length > 0;

  // Get all descendant IDs recursively (children, grandchildren, etc.)
  const descendantMap = useMemo(() => {
    const map = new Map<number, number[]>();
    
    const getChildrenRecursive = (parentId: number): number[] => {
      if (map.has(parentId)) {
        return map.get(parentId)!;
      }
      
      const directChildren = allLevels.filter((l: LocationLevel) => l.parentLevelId === parentId);
      const childrenIds = directChildren.map((c: LocationLevel) => c.id);
      const descendantIds = directChildren.flatMap((c: LocationLevel) => getChildrenRecursive(c.id));
      const allDescendants = [...childrenIds, ...descendantIds];
      map.set(parentId, allDescendants);
      return allDescendants;
    };
    
    // Precompute for all levels
    allLevels.forEach((level: LocationLevel) => {
      getChildrenRecursive(level.id);
    });
    
    return map;
  }, [allLevels]);
  
  const getDescendantIds = (parentId: number): number[] => {
    return descendantMap.get(parentId) || [];
  };

  // Helper: Check if an item is relevant in selection mode (selected or is ancestor/descendant of selected item)
  const isItemRelevantForSelection = (item: LocationLevel, level: number): boolean => {
    if (!isSelectionMode || selectedLevelIds.length === 0) return true;
    
    // If item is selected, it's relevant
    if (selectedLevelIds.includes(item.id)) return true;
    
    // Check if item is an ancestor of any selected item
    for (const selectedId of selectedLevelIds) {
      const selectedItem = allLevels.find((l: LocationLevel) => l.id === selectedId);
      if (!selectedItem) continue;
      
      // Check if item is an ancestor of selectedItem
      let current: LocationLevel | undefined = selectedItem;
      while (current?.parentLevelId) {
        if (current.parentLevelId === item.id) return true;
        current = allLevels.find((l: LocationLevel) => l.id === current!.parentLevelId);
      }
      
      // Check if item is a descendant of selectedItem
      const descendants = getDescendantIds(selectedItem.id);
      if (descendants.includes(item.id)) return true;
    }
    
    return false;
  };

  const level1Items = useMemo(() => {
    let allLevel1Items = allLevels.filter((l: LocationLevel) => l.level === 1);
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allLevel1Items = allLevel1Items.filter((item: LocationLevel) => 
        item.name.toLowerCase().includes(query) || 
        item.id.toString().includes(query)
      );
    }
    
    if (selectedLevel2 || selectedLevel3) {
      if (parentChain.level1Parent) {
        return allLevel1Items.map((item: LocationLevel) => ({
          ...item,
          isRelevant: item.id === parentChain.level1Parent!.id,
          isSelected: selectedLevelIds.includes(item.id)
        })).sort((a: LocationLevel & { isRelevant?: boolean }, b: LocationLevel & { isRelevant?: boolean }) => {
          // By relevance
          if (a.isRelevant && !b.isRelevant) return -1;
          if (!a.isRelevant && b.isRelevant) return 1;
          // Then by name
          return a.name.localeCompare(b.name);
        });
      } else {
        return allLevel1Items.map((item: LocationLevel) => ({
          ...item,
          isRelevant: false,
          isSelected: selectedLevelIds.includes(item.id)
        })).sort((a: LocationLevel, b: LocationLevel) => a.name.localeCompare(b.name));
      }
    } else if (selectedLevel1) {
      return allLevel1Items.map((item: LocationLevel) => ({
        ...item,
        isRelevant: true,
        isSelected: selectedLevelIds.includes(item.id)
      })).sort((a: LocationLevel, b: LocationLevel) => a.name.localeCompare(b.name));
    }
    return allLevel1Items.map((item: LocationLevel) => ({
      ...item,
      isRelevant: true,
      isSelected: selectedLevelIds.includes(item.id)
    })).sort((a: LocationLevel, b: LocationLevel) => a.name.localeCompare(b.name));
  }, [allLevels, selectedLevel1, selectedLevel2, selectedLevel3, parentChain, searchQuery, selectedLevelIds]);

  const level2Items = useMemo(() => {
    let allLevel2Items = allLevels.filter((l: LocationLevel) => l.level === 2);
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allLevel2Items = allLevel2Items.filter((item: LocationLevel) => 
        item.name.toLowerCase().includes(query) || 
        item.id.toString().includes(query)
      );
    }
    
    if (selectedLevel1) {
      const children = level2Children;
      const childrenIds = new Set(children.map((c: LocationLevel) => c.id));
      // Sort: children first, then others, by name
      return allLevel2Items
        .map((item: LocationLevel) => ({
          ...item,
          isRelevant: isSelectionMode 
            ? isItemRelevantForSelection(item, 2)
            : childrenIds.has(item.id),
          isChild: childrenIds.has(item.id),
          isSelected: selectedLevelIds.includes(item.id)
        }))
        .sort((a: LocationLevel & { isChild?: boolean }, b: LocationLevel & { isChild?: boolean }) => {
          // Children first
          if (a.isChild && !b.isChild) return -1;
          if (!a.isChild && b.isChild) return 1;
          // Then sort by name
          return a.name.localeCompare(b.name);
        });
    } else if (selectedLevel3) {
      if (parentChain.level2Parent) {
        return allLevel2Items.map((item: LocationLevel) => ({
          ...item,
          isRelevant: item.id === parentChain.level2Parent!.id,
          isSelected: selectedLevelIds.includes(item.id)
        })).sort((a: LocationLevel & { isRelevant?: boolean }, b: LocationLevel & { isRelevant?: boolean }) => {
          if (a.isRelevant && !b.isRelevant) return -1;
          if (!a.isRelevant && b.isRelevant) return 1;
          return a.name.localeCompare(b.name);
        });
      } else {
        return allLevel2Items.map((item: LocationLevel) => ({
          ...item,
          isRelevant: isSelectionMode 
            ? isItemRelevantForSelection(item, 2)
            : false,
          isSelected: selectedLevelIds.includes(item.id)
        })).sort((a: LocationLevel, b: LocationLevel) => a.name.localeCompare(b.name));
      }
    } else if (selectedLevel2) {
      return allLevel2Items.map((item: LocationLevel) => ({
        ...item,
        isRelevant: isSelectionMode 
          ? isItemRelevantForSelection(item, 2)
          : true,
        isSelected: selectedLevelIds.includes(item.id)
      })).sort((a: LocationLevel, b: LocationLevel) => a.name.localeCompare(b.name));
    }
    return allLevel2Items.map((item: LocationLevel) => ({
      ...item,
      isRelevant: isSelectionMode 
        ? isItemRelevantForSelection(item, 2)
        : true,
      isSelected: selectedLevelIds.includes(item.id)
    })).sort((a: LocationLevel, b: LocationLevel) => a.name.localeCompare(b.name));
  }, [allLevels, selectedLevel1, selectedLevel2, selectedLevel3, level2Children, parentChain, searchQuery, selectedLevelIds, isSelectionMode]);

  const level3Items = useMemo(() => {
    let allLevel3Items = allLevels.filter((l: LocationLevel) => l.level === 3);
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allLevel3Items = allLevel3Items.filter((item: LocationLevel) => 
        item.name.toLowerCase().includes(query) || 
        item.id.toString().includes(query)
      );
    }
    
    if (selectedLevel2) {
      const children = level3Children;
      if (children.length === 0) {
        return [];
      }
      const childrenIds = new Set(children.map((c: LocationLevel) => c.id));
      // Sort: children first, then others, by name
      return allLevel3Items
        .map((item: LocationLevel) => ({
          ...item,
          isRelevant: isSelectionMode 
            ? isItemRelevantForSelection(item, 3)
            : childrenIds.has(item.id),
          isChild: childrenIds.has(item.id),
          isSelected: selectedLevelIds.includes(item.id)
        }))
        .sort((a: LocationLevel & { isChild?: boolean }, b: LocationLevel & { isChild?: boolean }) => {
          // Children first
          if (a.isChild && !b.isChild) return -1;
          if (!a.isChild && b.isChild) return 1;
          // Then sort by name
          return a.name.localeCompare(b.name);
        });
    } else if (selectedLevel1 && !hasLevel2Children) {
      return [];
    } else if (selectedLevel3) {
      return allLevel3Items.map((item: LocationLevel) => ({
        ...item,
        isRelevant: isSelectionMode 
          ? isItemRelevantForSelection(item, 3)
          : true,
        isSelected: selectedLevelIds.includes(item.id)
      })).sort((a: LocationLevel, b: LocationLevel) => a.name.localeCompare(b.name));
    } else if (selectedLevel1 && !selectedLevel2) {
      // Level 1 selected but level 2 not selected - dim level 3 items
      return allLevel3Items.map((item: LocationLevel) => ({
        ...item,
        isRelevant: false, // Always false when level 2 is not selected
        isSelected: selectedLevelIds.includes(item.id)
      })).sort((a: LocationLevel, b: LocationLevel) => a.name.localeCompare(b.name));
    } else if (selectedLevel1) {
      return allLevel3Items.map((item: LocationLevel) => ({
        ...item,
        isRelevant: isSelectionMode 
          ? isItemRelevantForSelection(item, 3)
          : false,
        isSelected: selectedLevelIds.includes(item.id)
      })).sort((a: LocationLevel, b: LocationLevel) => a.name.localeCompare(b.name));
    }
    return allLevel3Items.map((item: LocationLevel) => ({
      ...item,
      isRelevant: isSelectionMode 
        ? isItemRelevantForSelection(item, 3)
        : true,
      isSelected: selectedLevelIds.includes(item.id)
    })).sort((a: LocationLevel, b: LocationLevel) => a.name.localeCompare(b.name));
  }, [allLevels, selectedLevel1, selectedLevel2, selectedLevel3, level3Children, hasLevel2Children, searchQuery, selectedLevelIds, isSelectionMode]);

  const level4Items = useMemo(() => {
    let allLevel4Items = allLevels.filter((l: LocationLevel) => l.level === 4);
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allLevel4Items = allLevel4Items.filter((item: LocationLevel) => 
        item.name.toLowerCase().includes(query) || 
        item.id.toString().includes(query)
      );
    }
    
    if (selectedLevel3) {
      const children = level4Children;
      if (children.length === 0) {
        return [];
      }
      const childrenIds = new Set(children.map((c: LocationLevel) => c.id));
      // Sort: children first, then others, by name
      return allLevel4Items
        .map((item: LocationLevel) => ({
          ...item,
          isRelevant: childrenIds.has(item.id),
          isChild: childrenIds.has(item.id),
          isSelected: selectedLevelIds.includes(item.id)
        }))
        .sort((a: LocationLevel & { isChild?: boolean }, b: LocationLevel & { isChild?: boolean }) => {
          // Children first
          if (a.isChild && !b.isChild) return -1;
          if (!a.isChild && b.isChild) return 1;
          // Then sort by name
          return a.name.localeCompare(b.name);
        });
    } else if (selectedLevel2 && !hasLevel3Children) {
      return [];
    } else if (selectedLevel1 && !hasLevel2Children) {
      return [];
    } else if (selectedLevel2) {
      return allLevel4Items.map((item: LocationLevel) => ({
        ...item,
        isRelevant: false,
        isSelected: selectedLevelIds.includes(item.id)
      })).sort((a: LocationLevel, b: LocationLevel) => a.name.localeCompare(b.name));
    } else if (selectedLevel1) {
      return allLevel4Items.map((item: LocationLevel) => ({
        ...item,
        isRelevant: false,
        isSelected: selectedLevelIds.includes(item.id)
      })).sort((a: LocationLevel, b: LocationLevel) => a.name.localeCompare(b.name));
    }
    return allLevel4Items.map((item: LocationLevel) => ({
      ...item,
      isRelevant: true,
      isSelected: selectedLevelIds.includes(item.id)
    })).sort((a: LocationLevel, b: LocationLevel) => a.name.localeCompare(b.name));
  }, [allLevels, selectedLevel1, selectedLevel2, selectedLevel3, level4Children, hasLevel2Children, hasLevel3Children, searchQuery, selectedLevelIds]);

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 2: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:bg-orange-300';
      case 3: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 4: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const handleItemClick = (item: LocationLevel, level: number) => {
    // Prevent duplicate clicks
    if (isProcessingClick.current) return;
    isProcessingClick.current = true;
    setTimeout(() => {
      isProcessingClick.current = false;
    }, 100);
    
    // In browse mode, handle navigation - ALL levels work the same way
    if (!isSelectionMode) {
    if (level === 1) {
      if (selectedLevel1 === item.id) {
        setSelectedLevel1(null);
        setSelectedLevel2(null);
        setSelectedLevel3(null);
      } else {
        setSelectedLevel1(item.id);
        setSelectedLevel2(null);
        setSelectedLevel3(null);
      }
    } else if (level === 2) {
      if (selectedLevel2 === item.id) {
        setSelectedLevel2(null);
        setSelectedLevel3(null);
      } else {
        setSelectedLevel2(item.id);
        setSelectedLevel3(null);
      }
    } else if (level === 3) {
      if (selectedLevel3 === item.id) {
        setSelectedLevel3(null);
      } else {
        setSelectedLevel3(item.id);
        }
      } else if (level === 4) {
        // Level 4 works EXACTLY the same - toggle navigation state
        // Set level 3 to show this item's parent context
        if (item.parentLevelId) {
          if (selectedLevel3 === item.parentLevelId) {
            setSelectedLevel3(null);
          } else {
            setSelectedLevel3(item.parentLevelId);
          }
        }
      }
      return;
    }

    // Selection mode: toggle selection with hierarchical behavior
    if (!onSelectionChange) return;
    
    const isSelected = selectedLevelIds.includes(item.id);
    
    let newSelection: number[];
    
    // ============================================================================
    // SELECTION LOGIC - Complete rewrite with clear steps
    // ============================================================================
    
    // Get all descendants of the item (for deselection when selecting parent)
    const descendantIds = getDescendantIds(item.id);
    
    if (isSelected) {
      // ========================================================================
      // CASE 1: Item is already selected - DESELECT it
      // ========================================================================
      // When clicking an already selected item, deselect:
      // - The item itself
      // - All its children (descendants)
      // - NOT its ancestors (they stay selected if other items need them)
      const idsToRemove = new Set([item.id, ...descendantIds]);
      newSelection = selectedLevelIds.filter(id => !idsToRemove.has(id));
      
    } else {
      // ========================================================================
      // CASE 2: Item is NOT selected - SELECT it and its ancestors
      // ========================================================================
      
      // STEP 1: Find ALL ancestors of the item being selected
      // Traverse up the hierarchy to get the complete parent chain
      const ancestorIds: number[] = [];
      let currentItem: LocationLevel | undefined = item;
      while (currentItem?.parentLevelId) {
        const parent = allLevels.find((l: LocationLevel) => l.id === currentItem!.parentLevelId);
        if (parent) {
          ancestorIds.push(parent.id);
          currentItem = parent;
        } else {
          break;
        }
      }
      
      // STEP 2: Build lookup maps for easy access
      // Map of correct ancestors by level (what SHOULD be selected)
      const ancestorsByLevel = new Map<number, number>();
      ancestorIds.forEach(ancestorId => {
        const ancestor = allLevels.find((l: LocationLevel) => l.id === ancestorId);
        if (ancestor) {
          // Store ancestor by its level - this is the CORRECT ancestor for this level
          ancestorsByLevel.set(ancestor.level, ancestorId);
        }
      });
      
      // Map of currently selected items by level (what IS currently selected)
      const currentlySelectedByLevel = new Map<number, number>();
      selectedLevelIds.forEach(id => {
        const selectedItem = allLevels.find((l: LocationLevel) => l.id === id);
        if (selectedItem) {
          currentlySelectedByLevel.set(selectedItem.level, id);
        }
      });
      
      // STEP 3: Build set of all IDs to deselect
      const allLevelsToDeselect = new Set<number>();
      
      // STEP 3.1: Deselect WRONG ancestors at each level
      // This is CRITICAL - if a level 3 item belongs to a different level 1/2 hierarchy,
      // we MUST deselect ALL wrong ancestors and their descendants, then select the correct ones
      
      // For Level 1: Get correct and currently selected
      const correctLevel1 = ancestorsByLevel.get(1);
      const selectedLevel1 = currentlySelectedByLevel.get(1);
      
      if (item.level === 1) {
        // Selecting level 1 directly: deselect ALL other level 1 items and their descendants
        selectedLevelIds.forEach(id => {
          const selectedItem = allLevels.find((l: LocationLevel) => l.id === id);
          if (selectedItem && selectedItem.level === 1 && selectedItem.id !== item.id) {
            allLevelsToDeselect.add(id);
            const descendants = getDescendantIds(id);
            descendants.forEach(descId => allLevelsToDeselect.add(descId));
          }
        });
      } else {
        // Selecting level 2/3/4: Deselect ANY level 1 that doesn't match the correct one
        // RESET: Find ALL selected level 1 items and deselect wrong ones
        // IMPORTANT: Always iterate through ALL selected items, not just the map lookup
        // For level 2/3/4 items, we MUST have a level 1 ancestor - deselect any level 1 that's not it
        // CRITICAL FIX: Always deselect ALL level 1 items if correctLevel1 exists and they don't match
        selectedLevelIds.forEach(id => {
            const selectedItem = allLevels.find((l: LocationLevel) => l.id === id);
            if (selectedItem && selectedItem.level === 1) {
              // If we found a correct level 1 ancestor for this item
              if (ancestorsByLevel.has(1)) {
                // We have a correct level 1 - deselect this one if it doesn't match
                const correctL1 = ancestorsByLevel.get(1);
                if (id !== correctL1) {
                  // This is a WRONG level 1 - deselect it and all descendants
                  allLevelsToDeselect.add(id);
                  const descendants = getDescendantIds(id);
                  descendants.forEach(descId => allLevelsToDeselect.add(descId));
                }
                // If id === correctL1, we keep it (don't add to deselection)
              } else {
                // No correct level 1 ancestor found (shouldn't happen for level 2/3/4)
                // Deselect any selected level 1 as safety measure
                allLevelsToDeselect.add(id);
                const descendants = getDescendantIds(id);
                descendants.forEach(descId => allLevelsToDeselect.add(descId));
              }
          }
        });
      }
      
      // For Level 2: Get correct and currently selected
      const correctLevel2 = ancestorsByLevel.get(2);
      const selectedLevel2 = currentlySelectedByLevel.get(2);
      
      if (item.level === 2) {
        // Selecting level 2 directly: deselect ALL other level 2 items and their descendants
        selectedLevelIds.forEach(id => {
          const selectedItem = allLevels.find((l: LocationLevel) => l.id === id);
          if (selectedItem && selectedItem.level === 2 && selectedItem.id !== item.id) {
            allLevelsToDeselect.add(id);
            const descendants = getDescendantIds(id);
            descendants.forEach(descId => allLevelsToDeselect.add(descId));
          }
        });
      } else if (item.level > 2) {
        // Selecting level 3/4: Deselect ANY level 2 that doesn't match the correct one
        // RESET: Find ALL selected level 2 items and deselect wrong ones
        selectedLevelIds.forEach(id => {
            const selectedItem = allLevels.find((l: LocationLevel) => l.id === id);
            if (selectedItem && selectedItem.level === 2) {
              if (correctLevel2) {
                // We have a correct level 2 - deselect if this one doesn't match
                if (selectedItem.id !== correctLevel2) {
                  allLevelsToDeselect.add(id);
                  const descendants = getDescendantIds(id);
                  descendants.forEach(descId => allLevelsToDeselect.add(descId));
                }
              } else {
                // No correct level 2 ancestor - deselect any selected level 2
                allLevelsToDeselect.add(id);
                const descendants = getDescendantIds(id);
                descendants.forEach(descId => allLevelsToDeselect.add(descId));
              }
          }
        });
      }
      
      // Check Level 3 ancestors - SIMPLIFIED LOGIC
      const selectedLevel3 = currentlySelectedByLevel.get(3);
      const correctLevel3 = ancestorsByLevel.get(3);
      
      if (item.level === 3) {
        // Selecting level 3 directly: deselect any OTHER level 3 that's selected
        if (selectedLevel3 && selectedLevel3 !== item.id) {
          allLevelsToDeselect.add(selectedLevel3);
          const descendants = getDescendantIds(selectedLevel3);
          descendants.forEach(descId => allLevelsToDeselect.add(descId));
        }
      } else if (item.level === 4) {
        // Selecting level 4:
        // If there's a selected level 3 AND it's not the correct one, deselect it
        // OR if there's no correct level 3 but one is selected, deselect it
        if (selectedLevel3) {
          if (!correctLevel3 || selectedLevel3 !== correctLevel3) {
            // WRONG level 3 selected or no correct ancestor - deselect it and ALL its descendants
            allLevelsToDeselect.add(selectedLevel3);
            const descendants = getDescendantIds(selectedLevel3);
            descendants.forEach(descId => allLevelsToDeselect.add(descId));
          }
        }
      }
      
      // STEP 3.2: Deselect other items from the same level as the item being selected
      // Only ONE item per level can be selected at a time
      const otherItemsFromSameLevel = allLevels.filter(
        (l: LocationLevel) => l.level === item.level && l.id !== item.id
      );
      otherItemsFromSameLevel.forEach((l: LocationLevel) => {
        allLevelsToDeselect.add(l.id);
        // Also deselect ALL descendants of items we're deselecting
        const descendants = getDescendantIds(l.id);
        descendants.forEach(descId => allLevelsToDeselect.add(descId));
      });
      
      // STEP 3.3: Deselect any items from ancestor levels that are NOT the correct ancestors
      // This ensures that if level 1 has items A and B, and we select a child of A,
      // we deselect B (and all its descendants)
      // NOTE: This should not conflict with STEP 3.1 since STEP 3.1 already handles wrong ancestors
      // But we do this here as a safety net to catch any items we might have missed
      ancestorIds.forEach(ancestorId => {
        const ancestor = allLevels.find((l: LocationLevel) => l.id === ancestorId);
        if (ancestor) {
          // Find all OTHER items from the same level as this ancestor that are currently selected
          selectedLevelIds.forEach(selectedId => {
            const selectedItem = allLevels.find((l: LocationLevel) => l.id === selectedId);
            if (selectedItem && selectedItem.level === ancestor.level && selectedId !== ancestorId) {
              // This is a wrong ancestor at this level - deselect it and all descendants
              allLevelsToDeselect.add(selectedId);
              const descendants = getDescendantIds(selectedId);
              descendants.forEach(descId => allLevelsToDeselect.add(descId));
            }
          });
        }
      });
      
      // STEP 3.4: ALWAYS deselect all children of the item being selected
      // When selecting a parent, we don't want any of its children selected
      descendantIds.forEach(id => allLevelsToDeselect.add(id));
      
      // STEP 4: Build the new selection - CRITICAL FIX
      // Step 4.1: Remove all items that should be deselected
      newSelection = selectedLevelIds.filter(id => !allLevelsToDeselect.has(id));
      
      // Step 4.2: Build final selection using Set to avoid duplicates
      const finalSelectionSet = new Set<number>(newSelection);
      
      // Step 4.3: ALWAYS explicitly add the correct ancestors
      // This is CRITICAL - we must ensure correct ancestors are in the final selection
      // Even if they were filtered out above, we add them here to guarantee they're selected
      ancestorIds.forEach(ancestorId => {
        // The ancestor IDs we have are the CORRECT ones - always add them
        finalSelectionSet.add(ancestorId);
      });
      
      // Step 4.4: Add the item itself
      finalSelectionSet.add(item.id);
      
      // Step 4.5: Convert to array - this is our final selection
      newSelection = Array.from(finalSelectionSet);
      
      // VERIFICATION: Double-check that correct ancestors are in the final selection
      // For level 2/3/4 items, verify level 1 ancestor is present
      if (item.level > 1 && ancestorsByLevel.has(1)) {
        const expectedLevel1 = ancestorsByLevel.get(1);
        const hasLevel1 = newSelection.includes(expectedLevel1!);
        if (!hasLevel1) {
          // Safety net: if for some reason the correct level 1 is missing, add it
          newSelection.push(expectedLevel1!);
        }
      }
      // For level 3/4 items, verify level 2 ancestor is present
      if (item.level > 2 && ancestorsByLevel.has(2)) {
        const expectedLevel2 = ancestorsByLevel.get(2);
        const hasLevel2 = newSelection.includes(expectedLevel2!);
        if (!hasLevel2) {
          // Safety net: if for some reason the correct level 2 is missing, add it
          newSelection.push(expectedLevel2!);
        }
      }
    }
    
    // CRITICAL: Ensure no duplicates and verify the selection is valid
    const uniqueSelection = Array.from(new Set(newSelection));
    
    // Update selection state
    onSelectionChange(uniqueSelection);
    
    // In selection mode, update navigation state when clicking a DIFFERENT item
    // to show its children. This uses cached React Query data (staleTime configured)
    // so it won't trigger unnecessary refetches.
    // ALL levels work the same way - update navigation state
    if (level === 1 && selectedLevel1 !== item.id) {
      setSelectedLevel1(item.id);
      setSelectedLevel2(null);
      setSelectedLevel3(null);
    } else if (level === 2 && selectedLevel2 !== item.id) {
      setSelectedLevel2(item.id);
      setSelectedLevel3(null);
    } else if (level === 3 && selectedLevel3 !== item.id) {
      setSelectedLevel3(item.id);
    } else if (level === 4) {
      // Level 4 works the same - update level 3 navigation
      if (item.parentLevelId) {
        setSelectedLevel3(item.parentLevelId);
      }
    }
    // If clicking the same item, don't change navigation - uses cached data
  };

  const handleItemDoubleClick = (item: LocationLevel, level: number) => {
    // In browse mode, double-click navigates to detail page for any level
    if (!isSelectionMode) {
      if (onItemClick) {
        onItemClick(item);
    } else {
        router.push(`/location-levels/${item.id}`);
      }
    }
  };


  const handleClearSelection = (level: number) => {
    if (level === 1) {
      setSelectedLevel1(null);
      setSelectedLevel2(null);
      setSelectedLevel3(null);
    } else if (level === 2) {
      setSelectedLevel2(null);
      setSelectedLevel3(null);
    } else if (level === 3) {
      setSelectedLevel3(null);
    }
  };

  const handleResetAll = () => {
    setSelectedLevel1(null);
    setSelectedLevel2(null);
    setSelectedLevel3(null);
  };

  // Refs for scrollable containers to auto-scroll to selected items
  const level1ScrollRef = useRef<HTMLDivElement>(null);
  const level2ScrollRef = useRef<HTMLDivElement>(null);
  const level3ScrollRef = useRef<HTMLDivElement>(null);
  const level4ScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected items when selection changes
  useEffect(() => {
    if (!isSelectionMode || !onSelectionChange) return;
    
    const scrollRefs = [
      { ref: level1ScrollRef, level: 1 },
      { ref: level2ScrollRef, level: 2 },
      { ref: level3ScrollRef, level: 3 },
      { ref: level4ScrollRef, level: 4 }
    ];
    
    // Use a small timeout to ensure DOM is updated
    setTimeout(() => {
      scrollRefs.forEach(({ ref, level }) => {
        if (!ref.current) return;
        
        // Find all selected items in this level
        const selectedElements = Array.from(
          ref.current.querySelectorAll('[data-is-checked="true"]')
        ) as HTMLElement[];
        
        if (selectedElements.length > 0) {
          // Scroll the first selected item into view - show it anywhere it fits (nearest visible position)
          selectedElements[0].scrollIntoView({ 
            behavior: 'auto', 
            block: 'nearest',
            inline: 'nearest'
          });
        }
      });
    }, 100);
  }, [selectedLevelIds, isSelectionMode, onSelectionChange]);

  const renderLevelColumn = (
    items: Array<LocationLevel & { isRelevant?: boolean }>,
    level: number,
    selectedId: number | null,
    isLoading?: boolean
  ) => {
    const scrollRef = level === 1 ? level1ScrollRef : level === 2 ? level2ScrollRef : level === 3 ? level3ScrollRef : level4ScrollRef;
    
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Badge className={`${getLevelColor(level)} px-2 py-0.5`}>L{level}</Badge>
              <span className="text-sm font-normal text-muted-foreground">
                ({items.length})
              </span>
            </CardTitle>
            <div className="flex items-center gap-1">
              {selectedId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleClearSelection(level)}
                  className="h-6 px-2"
                >
                  Clear
                </Button>
              )}
              {level === 1 && (selectedLevel1 || selectedLevel2 || selectedLevel3) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetAll}
                  className="h-6 px-2"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent 
          ref={scrollRef}
          className="flex-1 px-2 pb-2 space-y-1 max-h-[400px] overflow-y-auto"
        >
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-3">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-3">
              No items
            </div>
          ) : (
            items.map((item) => {
              const isRelevant = item.isRelevant !== false;
              const isSelected = selectedId === item.id; // Navigation state (for browsing)
              const isChecked = isSelectionMode && selectedLevelIds.includes(item.id); // Selection state (for selection mode)
              // In selection mode, only check isChecked for dimming (ignore navigation state)
              // In browse mode, use both isSelected and isRelevant
              const isDimmed = isSelectionMode 
                ? !isRelevant && !isChecked
                : !isRelevant && !isSelected;

              return (
                <div
                  key={item.id}
                  data-item-id={item.id}
                  data-is-checked={isChecked ? "true" : "false"}
                  onClick={(e) => {
                    // Don't trigger if clicking on chevron button
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('button') ||
                      target.tagName === 'BUTTON'
                    ) {
                      return;
                    }
                    
                    // Prevent clicking dimmed level 3 items when level 2 is not selected
                    if (level === 3 && selectedLevel1 && !selectedLevel2 && isDimmed) {
                      return;
                    }
                    
                    handleItemClick(item, level);
                  }}
                  onDoubleClick={() => {
                    if (!isSelectionMode) {
                      handleItemDoubleClick(item, level);
                    }
                  }}
                  className={`
                    p-1.5 rounded border transition-all
                    ${isChecked
                      ? 'border-primary bg-primary/10'
                      : isSelected && !isSelectionMode
                      ? 'border-primary bg-primary/10'
                      : isDimmed
                      ? 'border-border/20 bg-muted/10 opacity-40'
                      : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
                    }
                    cursor-pointer
                  `}
                  title={!isSelectionMode ? (level === 4 ? 'Click to view details' : 'Double-click to view details') : isDimmed ? 'Not a child of selected item (still selectable)' : isChecked ? 'Selected - click again to deselect' : 'Click to filter or select'}
                >
                  <div className="flex items-center gap-1.5">
                    {!isSelectionMode && (
                      <MapPin className={`h-4 w-4 shrink-0 ${isDimmed ? 'text-muted-foreground/40' : 'text-muted-foreground'}`} />
                    )}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium truncate ${isDimmed ? 'text-muted-foreground/60' : ''}`}>
                          {item.name}
                        </span>
                          {!isSelectionMode && (
                            <div className={`flex items-center gap-2 text-xs mt-0.5 ${isDimmed ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                              <span>ID: {item.id}</span>
                              {item.parentLevelId && (
                                <>
                                  <span>•</span>
                                  <span>Parent: {item.parentLevelId}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        {isRelevant && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              // Navigate to detail page when clicking chevron
                              if (onItemClick) {
                                onItemClick(item);
                              } else {
                                router.push(`/location-levels/${item.id}`);
                              }
                            }}
                            className="p-1 hover:bg-muted/50 rounded transition-colors"
                            title="Click to view details"
                          >
                          <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isDimmed ? 'text-muted-foreground/40' : 'text-muted-foreground'}`} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      {/* Search */}
        <div className="relative w-fit">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search levels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-9 w-96"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="absolute right-0 top-0 h-9 w-9 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
        )}
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {renderLevelColumn(level1Items, 1, selectedLevel1 || parentChain.level1Parent?.id || null)}
        {renderLevelColumn(
          level2Items,
          2,
          selectedLevel2 || parentChain.level2Parent?.id || null,
          selectedLevel1 !== null && isLoadingLevel2
        )}
        {renderLevelColumn(
          level3Items,
          3,
          selectedLevel3,
          selectedLevel2 !== null && isLoadingLevel3
        )}
        {renderLevelColumn(
          level4Items,
          4,
          null,
          selectedLevel3 !== null && isLoadingLevel4
        )}
      </div>

      {/* Selected Summary - only show in selection mode */}
      {isSelectionMode && selectedLevelIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded border">
          <span className="text-sm font-medium text-muted-foreground">Selected ({selectedLevelIds.length}):</span>
          <div className="flex flex-wrap gap-1.5">
            {selectedLevelIds.map((levelId) => {
              const level = allLevels.find((l: LocationLevel) => l.id === levelId);
              return level ? (
                <Badge key={levelId} variant="secondary" className="px-2 py-0.5">
                  L{level.level}: {level.name}
                </Badge>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

