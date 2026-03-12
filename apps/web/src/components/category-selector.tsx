'use client';

import { useState, useMemo } from 'react';
import { UnifiedSelector } from '@/components/unified-selector';
import { AddCategoryDialog } from '@/components/add-category-dialog';
import { useMetadataEnum } from '@kit/hooks';
import type { MetadataEnumValue } from '@kit/hooks';

export interface CategorySelectorItem {
  id: string;
  name: string;
  parentId?: number;
}

export interface CategorySelectorProps {
  enumName: string;
  selectedId?: number | string;
  onSelect: (item: { id: number | string; name?: string }) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
}

function buildCategoryItems(values: MetadataEnumValue[]): CategorySelectorItem[] {
  const byId = new Map(values.map((v) => [v.id, v]));
  const sorted = [...values].sort((a, b) => {
    const aTop = a.parentId == null;
    const bTop = b.parentId == null;
    if (aTop && bTop) return (a.label || a.name).localeCompare(b.label || b.name);
    if (aTop) return -1;
    if (bTop) return 1;
    if (a.parentId !== b.parentId) return (a.parentId ?? 0) - (b.parentId ?? 0);
    return (a.label || a.name).localeCompare(b.label || b.name);
  });
  return sorted.map((v) => ({
    id: v.name,
    name: v.label ?? v.name,
    parentId: v.parentId,
  }));
}

function getDisplayName(
  item: CategorySelectorItem,
  values: MetadataEnumValue[]
): string {
  if (item.parentId == null) return item.name;
  const parent = values.find((v) => v.id === item.parentId);
  return parent ? `${parent.label ?? parent.name} > ${item.name}` : item.name;
}

export function CategorySelector({
  enumName,
  selectedId,
  onSelect,
  label,
  required,
  placeholder,
  id,
  className,
}: CategorySelectorProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { data: values = [] } = useMetadataEnum(enumName);

  const categoryItems = useMemo(() => buildCategoryItems(values), [values]);
  const getDisplayNameForItem = (item: CategorySelectorItem) =>
    getDisplayName(item, values);

  return (
    <>
      <UnifiedSelector
        type="category"
        items={categoryItems}
        selectedId={selectedId}
        onSelect={(item) => onSelect(item)}
        onCreateNew={() => setAddDialogOpen(true)}
        label={label}
        required={required}
        placeholder={placeholder ?? 'Select category'}
        id={id}
        className={className}
        getDisplayName={(item) =>
          getDisplayNameForItem(item as CategorySelectorItem)
        }
      />
      <AddCategoryDialog
        enumName={enumName}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreated={(item) => {
          onSelect(item);
          setAddDialogOpen(false);
        }}
      />
    </>
  );
}
