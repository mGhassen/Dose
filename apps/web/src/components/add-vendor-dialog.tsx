'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { useCreateInventorySupplier } from '@kit/hooks';
import { toast } from 'sonner';

export interface AddVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (vendor: { id: number; name: string }) => void;
  entityLabel?: string;
  supplierTypes?: ('supplier' | 'vendor' | 'lender' | 'customer')[];
}

export function AddVendorDialog({
  open,
  onOpenChange,
  onCreated,
  entityLabel = 'vendor',
  supplierTypes = ['vendor'],
}: AddVendorDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const createSupplier = useCreateInventorySupplier();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Name is required');
      return;
    }
    try {
      const created = await createSupplier.mutateAsync({
        name: trimmed,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        supplierType: supplierTypes,
        isActive: true,
      });
      toast.success(`${entityLabel[0]?.toUpperCase()}${entityLabel.slice(1)} added`);
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      onOpenChange(false);
      onCreated?.({ id: created.id, name: created.name });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Failed to add ${entityLabel}`);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add new {entityLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-vendor-name">Name *</Label>
            <Input
              id="add-vendor-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${entityLabel[0]?.toUpperCase()}${entityLabel.slice(1)} name`}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-vendor-email">Email</Label>
            <Input
              id="add-vendor-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-vendor-phone">Phone</Label>
            <Input
              id="add-vendor-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-vendor-address">Address</Label>
            <Textarea
              id="add-vendor-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSupplier.isPending || !name.trim()}>
              {createSupplier.isPending ? 'Adding…' : `Add ${entityLabel}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
