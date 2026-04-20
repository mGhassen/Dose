"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useItems, useDeleteItem, useInventorySuppliers } from "@kit/hooks";
import type { Item, ItemKind } from "@kit/types";
import MergeItemsDialog from "@/app/items/_components/merge-items-dialog";
import { Link as LinkIcon, Package, PackageX, ChefHat } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@kit/ui/tooltip";

const KIND_LABEL: Record<ItemKind, string> = {
  item: "Item",
  product: "Product",
  modifier: "Modifier",
  ingredient: "Ingredient",
};
const KIND_BADGE_CLASS: Record<ItemKind, string> = {
  item: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  product:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  modifier:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  ingredient:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
};
import { Badge } from "@kit/ui/badge";
import { Label } from "@kit/ui/label";
import { Switch } from "@kit/ui/switch";
import { StatusPin } from "@/components/status-pin";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import { toast } from "sonner";

export default function ItemsContent() {
  const router = useRouter();
  const [showCatalogGroups, setShowCatalogGroups] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeItems, setMergeItems] = useState<Item[]>([]);

  const { data: itemsResponse, isLoading } = useItems({
    limit: 1000,
    excludeCatalogParents: !showCatalogGroups,
  });
  
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });
  const supplierMap = useMemo(() => {
    if (!suppliersResponse?.data) return new Map<number, string>();
    return new Map(suppliersResponse.data.map(s => [s.id, s.name]));
  }, [suppliersResponse?.data]);
  
  const filteredItems = useMemo(() => {
    if (!itemsResponse?.data) return [];
    return itemsResponse.data.map((it) => ({
      ...it,
      categoryLabel: it.category?.label ?? it.category?.name ?? '',
    }));
  }, [itemsResponse?.data]);
  const deleteMutation = useDeleteItem();

  const columns: ColumnDef<Item>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StatusPin active={row.original.isActive} size="sm" />
            <div className="flex shrink-0 items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-default">
                    {row.original.affectsStock !== false ? (
                      <Package className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    ) : (
                      <PackageX className="h-3.5 w-3.5 text-muted-foreground opacity-70" aria-hidden />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {row.original.affectsStock !== false
                    ? "Affects stock (deduct on sale)"
                    : "Does not affect stock"}
                </TooltipContent>
              </Tooltip>
              {row.original.produceOnSale === true && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-default text-amber-600 dark:text-amber-400">
                      <ChefHat className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    Produced on sale
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="font-medium truncate">{row.original.name}</div>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
            {"instructions" in row.original &&
              (row.original as { instructions?: string }).instructions != null && (
                <Badge variant="secondary" className="text-xs">
                  Recipe
                </Badge>
              )}
            {row.original.itemTypes?.map((k) => (
              <Badge
                key={k}
                variant="outline"
                className={`text-xs ${KIND_BADGE_CLASS[k]}`}
              >
                {KIND_LABEL[k]}
              </Badge>
            ))}
            {row.original.isCatalogParent && (
              <Badge variant="outline" className="text-xs">
                Catalog group
              </Badge>
            )}
            {row.original.groupId && row.original.isCanonical && (
              <Badge variant="outline" className="text-xs gap-1">
                <LinkIcon className="h-3 w-3" />
                  {row.original.groupName}
              </Badge>
            )}
            {row.original.groupId && !row.original.isCanonical && (
              <Badge
                variant="outline"
                className="text-xs gap-1 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (row.original.canonicalItemId) {
                    router.push(`/items/${row.original.canonicalItemId}`);
                  }
                }}
              >
                <LinkIcon className="h-3 w-3" />
                merged → {row.original.canonicalItemName}
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => row.original.sku || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "categoryLabel",
      header: "Category",
      cell: ({ row }) => {
        const c = row.original.category;
        const display = c?.label ?? c?.name;
        return display || <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => row.original.unit || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "unitPrice",
      header: "Selling price",
      cell: ({ row }) => {
        if ("instructions" in row.original && (row.original as { instructions?: string }).instructions != null) {
          const outputQuantity = row.original.outputQuantity ?? row.original.servingSize;
          return outputQuantity
            ? `${outputQuantity} ${row.original.unit || "unit"}`
            : <span className="text-muted-foreground">—</span>;
        }
        return row.original.unitPrice != null ? formatCurrency(row.original.unitPrice) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "vendorId",
      header: "Vendor",
      cell: ({ row }) => {
        const vendorId = row.original.vendorId;
        if (vendorId && supplierMap.has(vendorId)) {
          return (
            <Badge variant="outline">
              {supplierMap.get(vendorId)}
            </Badge>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ], [supplierMap, router]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id.toString());
      toast.success("Item deleted successfully");
    } catch (error) {
      toast.error("Failed to delete item");
      console.error(error);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id.toString())));
      toast.success(`${ids.length} item(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete items");
      console.error(error);
    }
  };

  const handleBulkCopy = (data: Item[], type: 'selected' | 'all') => {
    const itemsToCopy = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'SKU', 'Category', 'Unit', 'Unit Price', 'Vendor', 'Description', 'Status'].join(','),
      ...itemsToCopy.map(item => [
        item.name,
        item.sku || '',
        item.category?.label ?? item.category?.name ?? '',
        item.unit || '',
        item.unitPrice || '',
        item.vendorId ? supplierMap.get(item.vendorId) || '' : '',
        item.description || '',
        item.isActive ? 'Active' : 'Inactive',
      ].join(','))
    ].join('\n');

    navigator.clipboard.writeText(csv);
    toast.success(`${itemsToCopy.length} item(s) copied to clipboard`);
  };

  const handleBulkExport = (data: Item[], type: 'selected' | 'all') => {
    const itemsToExport = type === 'selected' ? data : data;
    
    const csv = [
      ['Name', 'SKU', 'Category', 'Unit', 'Unit Price', 'Vendor', 'Description', 'Status'].join(','),
      ...itemsToExport.map(item => [
        item.name,
        item.sku || '',
        item.category?.label ?? item.category?.name ?? '',
        item.unit || '',
        item.unitPrice || '',
        item.vendorId ? supplierMap.get(item.vendorId) || '' : '',
        item.description || '',
        item.isActive ? 'Active' : 'Inactive',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `items-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${itemsToExport.length} item(s) exported`);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 flex flex-col gap-4 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Items</h1>
          <p className="text-muted-foreground mt-2">
            Manage your inventory items and products
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 shrink-0">
          <Switch
            id="show-catalog-groups"
            checked={showCatalogGroups}
            onCheckedChange={setShowCatalogGroups}
          />
          <Label htmlFor="show-catalog-groups" className="text-sm font-normal cursor-pointer">
            Show catalog groups
          </Label>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DataTablePage
          title=""
          description=""
          createHref="/items/create"
          data={filteredItems}
          columns={columns}
          loading={isLoading}
          onRowClick={(item) => {
            const target = !item.isCanonical && item.canonicalItemId ? item.canonicalItemId : item.id;
            router.push(`/items/${target}`);
          }}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkCopy={handleBulkCopy}
          onBulkExport={handleBulkExport}
          onBulkMerge={(selected) => {
            setMergeItems(selected as Item[]);
            setMergeOpen(true);
          }}
          filterColumns={[
            { value: "name", label: "Name" },
            { value: "sku", label: "SKU" },
            { value: "itemTypes", label: "Type", type: "select", options: [{ value: "item", label: "Item" }, { value: "product", label: "Product" }, { value: "modifier", label: "Modifier" }, { value: "ingredient", label: "Ingredient" }] },
            { value: "categoryLabel", label: "Category", type: "select" },
            { value: "unit", label: "Unit", type: "select" },
            { value: "unitPrice", label: "Selling price" },
            { value: "vendorId", label: "Vendor", type: "select" },
            { value: "isActive", label: "Status", type: "select", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] },
            { value: "createdAt", label: "Created" },
          ]}
          sortColumns={[
            { value: "name", label: "Name", type: "character varying" },
            { value: "sku", label: "SKU", type: "character varying" },
            { value: "itemTypes", label: "Type", type: "character varying" },
            { value: "categoryLabel", label: "Category", type: "character varying" },
            { value: "unit", label: "Unit", type: "character varying" },
            { value: "unitPrice", label: "Selling price", type: "numeric" },
            { value: "vendorId", label: "Vendor", type: "numeric" },
            { value: "createdAt", label: "Created", type: "timestamp" },
          ]}
          localStoragePrefix="items"
          searchFields={["name", "sku", "categoryLabel", "description"]}
        />
      </div>

      <MergeItemsDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        items={mergeItems}
      />
    </div>
  );
}

