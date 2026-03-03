"use client";

import { useState, useEffect } from "react";
import { Button } from "@kit/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { dateToYYYYMMDD } from "@kit/lib";
import { DatePicker } from "@kit/ui/date-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { UnifiedSelector } from "@/components/unified-selector";
import { Badge } from "@kit/ui/badge";
import { Separator } from "@kit/ui/separator";
import { ScrollArea } from "@kit/ui/scroll-area";
import { Skeleton } from "@kit/ui/skeleton";
import {
  Save,
  Trash2,
  MoreHorizontal,
  Edit2,
  Calendar,
  Tag,
  DollarSign,
  Hash,
  Package,
  FileText,
  Receipt,
  ChevronRight,
  X,
} from "lucide-react";
import { useSaleById, useUpdateSale, useDeleteSale, useItems } from "@kit/hooks";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import type { SalesType } from "@kit/types";

interface SaleDetailContentProps {
  saleId: string;
  onClose: () => void;
  onDeleted: () => void;
}

const TYPE_LABELS: Record<SalesType, string> = {
  on_site: "On Site",
  delivery: "Delivery",
  takeaway: "Takeaway",
  catering: "Catering",
  other: "Other",
};

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

export function SaleDetailContent({ saleId, onClose, onDeleted }: SaleDetailContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { data: sale, isLoading } = useSaleById(saleId);
  const { data: itemsResponse } = useItems({ limit: 1000, producedOnly: true });
  const updateSale = useUpdateSale();
  const deleteMutation = useDeleteSale();

  const [formData, setFormData] = useState({
    date: "",
    type: "" as SalesType | "",
    amount: "",
    quantity: "",
    description: "",
    itemId: "",
    unitPrice: "",
    unitCost: "",
  });

  useEffect(() => {
    if (sale) {
      setFormData({
        date: sale.date.split("T")[0],
        type: sale.type,
        amount: sale.amount.toString(),
        quantity: sale.quantity?.toString() || "",
        description: sale.description || "",
        itemId: sale.itemId?.toString() || "",
        unitPrice: sale.unitPrice != null ? sale.unitPrice.toString() : "",
        unitCost: sale.unitCost != null ? sale.unitCost.toString() : "",
      });
    }
  }, [sale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.type || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await updateSale.mutateAsync({
        id: saleId,
        data: {
          date: formData.date,
          type: formData.type as SalesType,
          amount: parseFloat(formData.amount),
          quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
          description: formData.description || undefined,
          itemId: formData.itemId ? parseInt(formData.itemId) : undefined,
          unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : undefined,
          unitCost: formData.unitCost ? parseFloat(formData.unitCost) : undefined,
        },
      });
      toast.success("Sale updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update sale");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm("Are you sure you want to delete this sale? This action cannot be undone.")
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(Number(saleId));
      toast.success("Sale deleted successfully");
      onDeleted();
    } catch (error) {
      toast.error("Failed to delete sale");
      console.error(error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    const updates: Record<string, string | number> = { [field]: value };
    if (field === "itemId" && itemsResponse?.data) {
      const item = value ? itemsResponse.data.find((i: { id: number }) => i.id === (typeof value === "string" ? parseInt(value, 10) : value)) : undefined;
      if (item) {
        updates.unitPrice = (item as { unitPrice?: number }).unitPrice?.toString() ?? "";
        updates.unitCost = (item as { unitCost?: number }).unitCost?.toString() ?? "";
      }
    }
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="space-y-4 px-1">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Receipt className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Sale not found</h2>
          <p className="text-sm text-muted-foreground">
            This sale may have been deleted or doesn't exist.
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Back to sales
        </Button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex h-full flex-col"
      >
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-6 pb-6">
            <div>
              <h2 className="text-lg font-semibold">Edit sale</h2>
              <p className="text-sm text-muted-foreground">
                Update the details below
              </p>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <DatePicker
                  id="date"
                  value={formData.date ? new Date(formData.date) : undefined}
                  onChange={(d) => handleInputChange("date", d ? dateToYYYYMMDD(d) : "")}
                  placeholder="Pick a date"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <UnifiedSelector
                  type="type"
                  required
                  items={[
                    { id: "on_site", name: "On Site" },
                    { id: "delivery", name: "Delivery" },
                    { id: "takeaway", name: "Takeaway" },
                    { id: "catering", name: "Catering" },
                    { id: "other", name: "Other" },
                  ]}
                  selectedId={formData.type || undefined}
                  onSelect={(item) =>
                    handleInputChange("type", item.id === 0 ? "" : String(item.id))
                  }
                  placeholder="Select type"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  placeholder="—"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Sell price</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => handleInputChange("unitPrice", e.target.value)}
                  placeholder="—"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitCost">Cost price</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  value={formData.unitCost}
                  onChange={(e) => handleInputChange("unitCost", e.target.value)}
                  placeholder="—"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Item / Recipe</Label>
                <UnifiedSelector
                  type="item"
                  items={itemsResponse?.data ?? []}
                  selectedId={formData.itemId ? parseInt(formData.itemId) : undefined}
                  onSelect={(item) =>
                    handleInputChange("itemId", item.id === 0 ? "" : String(item.id))
                  }
                  placeholder="Link to item or recipe (optional)"
                  getDisplayName={(i) =>
                    (i as { itemType?: string }).itemType === "recipe"
                      ? `${i.name} (Recipe)`
                      : `${i.name} ${(i as { category?: string }).category ? `(${(i as { category?: string }).category})` : ""}`
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Additional notes"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="sticky bottom-0 -mx-6 mt-auto flex gap-3 border-t bg-background p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={updateSale.isPending} className="flex-1">
            {updateSale.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 space-y-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {formatDate(sale.date)} · {TYPE_LABELS[sale.type] || sale.type}
            </p>
            <h2 className="text-lg font-semibold">Sale details</h2>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit sale
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
        <Separator />
      </div>
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-6 pb-6 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <DollarSign className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                {formatCurrency(sale.amount)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {formatDate(sale.date)}
                </span>
                <Badge variant="secondary" className="font-normal">
                  {TYPE_LABELS[sale.type] || sale.type}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-0">
            <DetailRow icon={Calendar} label="Date">
              {formatDate(sale.date)}
            </DetailRow>
            <Separator />
            <DetailRow icon={Tag} label="Type">
              <Badge variant="outline">{TYPE_LABELS[sale.type] || sale.type}</Badge>
            </DetailRow>
            <Separator />
            <DetailRow icon={DollarSign} label="Amount">
              <span className="tabular-nums">{formatCurrency(sale.amount)}</span>
            </DetailRow>
            <Separator />
            <DetailRow icon={Hash} label="Quantity">
              {sale.quantity ?? <span className="text-muted-foreground">—</span>}
            </DetailRow>
            <Separator />
            <DetailRow icon={DollarSign} label="Selling price (at time of sale)">
              {sale.unitPrice != null ? formatCurrency(sale.unitPrice) : <span className="text-muted-foreground">—</span>}
            </DetailRow>
            <Separator />
            <DetailRow icon={DollarSign} label="Cost price (at time of sale)">
              {sale.unitCost != null ? formatCurrency(sale.unitCost) : <span className="text-muted-foreground">—</span>}
            </DetailRow>
            <Separator />
            <DetailRow icon={Package} label="Item / Recipe">
              {sale.item ? (
                <div className="flex items-center gap-2">
                  <Link
                    href={
                      sale.item.itemType === "recipe"
                        ? `/recipes/${sale.item.id}`
                        : `/items/${sale.item.id}`
                    }
                    className="group inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {sale.item.name}
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                  <div className="flex gap-1">
                    {sale.item.itemType === "recipe" && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        Recipe
                      </Badge>
                    )}
                    {sale.item.category && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {sale.item.category}
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </DetailRow>
            {sale.description && (
              <>
                <Separator />
                <DetailRow icon={FileText} label="Description">
                  <p className="whitespace-pre-wrap text-foreground/90">
                    {sale.description}
                  </p>
                </DetailRow>
              </>
            )}
          </div>

          <Separator />

          <div className="flex gap-6 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Created</span>{" "}
              {formatDate(sale.createdAt)}
            </div>
            <div>
              <span className="font-medium">Updated</span>{" "}
              {formatDate(sale.updatedAt)}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
