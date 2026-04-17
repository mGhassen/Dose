'use client';

import { useMemo, useState } from 'react';
import { UnifiedSelector } from '@/components/unified-selector';
import { AddItemCategoryDialog } from '@/components/add-item-category-dialog';
import { useItemCategories } from '@kit/hooks';

export interface ItemCategorySelectorProps {
  selectedId?: number | null;
  onSelect: (category: { id: number; name: string; label: string } | null) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function ItemCategorySelector({
  selectedId,
  onSelect,
  label,
  required,
  placeholder,
  id,
  className,
  disabled,
}: ItemCategorySelectorProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { data: categories = [] } = useItemCategories();

  const items = useMemo(
    () =>
      categories.map((c) => ({
        id: c.id,
        name: c.label,
        description: c.description ?? undefined,
      })),
    [categories]
  );

  return (
    <>
      <UnifiedSelector
        type="category"
        items={items}
        selectedId={selectedId ?? undefined}
        onSelect={(item) => {
          const cat = categories.find((c) => c.id === Number(item.id));
          if (cat) onSelect({ id: cat.id, name: cat.name, label: cat.label });
        }}
        onCreateNew={() => setAddDialogOpen(true)}
        label={label}
        required={required}
        placeholder={placeholder ?? 'Select category'}
        id={id}
        className={className}
        disabled={disabled}
        getDisplayName={(item) => String(item.name ?? '')}
      />
      <AddItemCategoryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreated={(cat) => {
          onSelect({ id: cat.id, name: cat.name, label: cat.label });
          setAddDialogOpen(false);
        }}
      />
    </>
  );
}
