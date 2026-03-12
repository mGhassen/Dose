'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { useMetadataEnums, useMetadataEnum, useCreateEnumValue } from '@kit/hooks';
import { toast } from 'sonner';

function slugFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enumName: string;
  onCreated: (item: { id: string; name: string }) => void;
}

export function AddCategoryDialog({
  open,
  onOpenChange,
  enumName,
  onCreated,
}: AddCategoryDialogProps) {
  const [label, setLabel] = useState('');
  const [parentId, setParentId] = useState<number | ''>('');

  const { data: enums } = useMetadataEnums();
  const { data: values = [] } = useMetadataEnum(enumName);
  const createMutation = useCreateEnumValue();

  const enumMeta = enums?.find((e) => e.name === enumName);
  const topLevelValues = values.filter((v) => v.parentId == null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed || !enumMeta) return;
    const name = slugFromLabel(trimmed);
    if (!name) {
      toast.error('Label must contain at least one letter or number');
      return;
    }
    try {
      const newValue = await createMutation.mutateAsync({
        enumId: enumMeta.id,
        data: {
          name,
          label: trimmed,
          parentId: parentId === '' ? undefined : parentId,
        },
      });
      toast.success('Category added');
      setLabel('');
      setParentId('');
      onOpenChange(false);
      onCreated({ id: newValue.name, name: newValue.label });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add category');
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setLabel('');
      setParentId('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add new category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-cat-label">Label *</Label>
            <Input
              id="add-cat-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Office supplies"
              required
            />
            <p className="text-xs text-muted-foreground">
              Internal name will be generated from the label (e.g. office_supplies).
            </p>
          </div>
          <div className="space-y-2">
            <Label>Parent category (optional)</Label>
            <Select
              value={parentId === '' ? 'none' : String(parentId)}
              onValueChange={(v) => setParentId(v === 'none' ? '' : Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="None — top-level category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None — top-level category</SelectItem>
                {topLevelValues.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !label.trim()}>
              {createMutation.isPending ? 'Adding…' : 'Add category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
