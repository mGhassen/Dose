"use client";

import { useMemo, useState } from "react";
import { Button } from "@kit/ui/button";
import { Checkbox } from "@kit/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@kit/ui/dialog";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { useCreateItem, useInventorySuppliers, useUnits } from "@kit/hooks";
import type { Item, ItemType } from "@kit/types";
import { toast } from "sonner";
import { CategorySelector } from "@/components/category-selector";
import { UnifiedSelector } from "@/components/unified-selector";
import { AddVendorDialog } from "@/components/add-vendor-dialog";
import { Save, X } from "lucide-react";

export function CreateItemMultiStepDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultItemType?: Exclude<ItemType, "recipe">;
  onCreated?: (item: Item) => void;
}) {
  const createItem = useCreateItem();
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });
  const { data: unitsData } = useUnits();

  const unitItems = useMemo(
    () => (unitsData || []).map((u: any) => ({ id: u.id, name: `${u.symbol} (${u.name})` })),
    [unitsData]
  );

  const itemTypeItems: { id: ItemType; name: string }[] = [
    { id: "item", name: "Item" },
    { id: "product", name: "Product" },
    { id: "item_and_product", name: "Item and product" },
  ];

  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    category: string;
    sku: string;
    unitId: number | null;
    vendorId: string;
    notes: string;
    isActive: boolean;
    itemType: ItemType;
  }>(() => ({
    name: "",
    description: "",
    category: "",
    sku: "",
    unitId: null,
    vendorId: "",
    notes: "",
    isActive: true,
    itemType: props.defaultItemType ?? "item",
  }));

  const reset = () => {
    setAddVendorOpen(false);
    setFormData({
      name: "",
      description: "",
      category: "",
      sku: "",
      unitId: null,
      vendorId: "",
      notes: "",
      isActive: true,
      itemType: props.defaultItemType ?? "item",
    });
  };

  const close = () => props.onOpenChange(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) reset();
    props.onOpenChange(open);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please fill in the item name");
      return;
    }

    try {
      const created = (await createItem.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category || undefined,
        sku: formData.sku || undefined,
        unitId: formData.unitId ?? undefined,
        vendorId: formData.vendorId ? parseInt(formData.vendorId) : undefined,
        notes: formData.notes || undefined,
        isActive: formData.isActive,
        itemType: formData.itemType as "item" | "product" | "item_and_product",
      })) as Item;
      toast.success("Item created successfully");
      props.onCreated?.(created);
      close();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create item");
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Item name"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange("sku", e.target.value)}
                placeholder="SKU-001"
              />
            </div>

            <div className="space-y-2">
              <CategorySelector
                enumName="ItemCategory"
                label="Category"
                selectedId={formData.category || undefined}
                onSelect={(item) => handleInputChange("category", item.id === 0 ? "" : String(item.id))}
                placeholder="Select category"
              />
            </div>

            <div className="space-y-2">
              <UnifiedSelector
                label="Item type"
                type="type"
                items={itemTypeItems}
                selectedId={formData.itemType}
                onSelect={(item) => handleInputChange("itemType", item.id as ItemType)}
                placeholder="Select type"
              />
            </div>

            <div className="space-y-2">
              <UnifiedSelector
                label="Unit"
                type="unit"
                items={unitItems}
                selectedId={formData.unitId ?? undefined}
                onSelect={(item) => handleInputChange("unitId", item.id === 0 ? null : (item.id as number))}
                placeholder="Select unit"
                manageLink={{ href: "/variables", text: "Variables" }}
              />
            </div>

            <div className="space-y-2">
              <UnifiedSelector
                label="Vendor"
                type="vendor"
                items={suppliersResponse?.data ?? []}
                selectedId={formData.vendorId ? parseInt(formData.vendorId) : undefined}
                onSelect={(item) => handleInputChange("vendorId", item.id === 0 ? "" : String(item.id))}
                onCreateNew={() => setAddVendorOpen(true)}
                placeholder="Select vendor"
              />
              <AddVendorDialog
                open={addVendorOpen}
                onOpenChange={setAddVendorOpen}
                onCreated={(v) => handleInputChange("vendorId", String(v.id))}
              />
            </div>

            <div className="space-y-2 flex items-center space-x-2 pt-6">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange("isActive", checked)}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Item description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Additional notes about this item"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <Button type="button" variant="outline" onClick={close}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={createItem.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {createItem.isPending ? "Creating..." : "Create Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

