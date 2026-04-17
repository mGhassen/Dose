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
import { useCreateItemCategory, type ItemCategory } from '@kit/hooks';
import { toast } from 'sonner';

export interface AddItemCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (category: ItemCategory) => void;
}

export function AddItemCategoryDialog({ open, onOpenChange, onCreated }: AddItemCategoryDialogProps) {
  const [label, setLabel] = useState('');
  const createMutation = useCreateItemCategory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    try {
      const newCat = await createMutation.mutateAsync({ label: trimmed });
      toast.success('Category added');
      setLabel('');
      onOpenChange(false);
      onCreated(newCat);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add category');
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setLabel('');
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
            <Label htmlFor="add-item-cat-label">Label *</Label>
            <Input
              id="add-item-cat-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Beverages"
              required
            />
            <p className="text-xs text-muted-foreground">
              Internal name will be generated from the label (e.g. beverages).
            </p>
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
