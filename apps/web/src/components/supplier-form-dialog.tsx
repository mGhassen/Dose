"use client";

import { useEffect, useState } from "react";
import { Button } from "@kit/ui/button";
import { Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kit/ui/dialog";
import { SupplierForm, SupplierFormValues, emptySupplierFormValues } from "@/components/supplier-form";
import { useCreateInventorySupplier } from "@kit/hooks";
import { toast } from "sonner";

export interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (supplier: { id: number; name: string }) => void;
  defaultSupplierTypes?: string[];
  entityLabel?: string;
  dialogTitle?: string;
}

function capitalize(v: string) {
  return v.length ? v[0]!.toUpperCase() + v.slice(1) : v;
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  onCreated,
  defaultSupplierTypes,
  entityLabel = "supplier",
  dialogTitle,
}: SupplierFormDialogProps) {
  const createSupplier = useCreateInventorySupplier();
  const initialTypes = defaultSupplierTypes && defaultSupplierTypes.length > 0 ? defaultSupplierTypes : ["supplier"];

  const [formData, setFormData] = useState<SupplierFormValues>({
    ...emptySupplierFormValues,
    supplierType: initialTypes,
  });

  useEffect(() => {
    if (open) {
      setFormData({ ...emptySupplierFormValues, supplierType: initialTypes });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setFormData({ ...emptySupplierFormValues, supplierType: initialTypes });
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      toast.error(`Please fill in the ${entityLabel} name`);
      return;
    }

    try {
      const created = await createSupplier.mutateAsync({
        name: trimmedName,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        contactPerson: formData.contactPerson.trim() || undefined,
        paymentTerms: formData.paymentTerms || undefined,
        notes: formData.notes.trim() || undefined,
        supplierType: formData.supplierType,
        isActive: formData.isActive,
      });

      toast.success(`${capitalize(entityLabel)} created successfully`);
      onCreated?.({ id: created.id, name: created.name });
      handleOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : `Failed to create ${entityLabel}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle ?? `Create ${capitalize(entityLabel)}`}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <SupplierForm
            value={formData}
            onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
            idPrefix={`sfd-${entityLabel}`}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={createSupplier.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {createSupplier.isPending ? "Creating..." : `Create ${capitalize(entityLabel)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
