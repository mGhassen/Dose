"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kit/ui/select";
import { Badge } from "@kit/ui/badge";
import { Save, X, Trash2, MoreVertical, Edit2 } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useSaleById, useUpdateSale, useDeleteSale, useItems } from "@kit/hooks";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";
import type { SalesType } from "@kit/types";

interface SaleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SaleDetailPage({ params }: SaleDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: sale, isLoading } = useSaleById(resolvedParams?.id || "");
  const { data: itemsResponse } = useItems({ limit: 1000 });
  const updateSale = useUpdateSale();
  const deleteMutation = useDeleteSale();
  
  const [formData, setFormData] = useState({
    date: "",
    type: "" as SalesType | "",
    amount: "",
    quantity: "",
    description: "",
    itemId: "",
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (sale) {
      setFormData({
        date: sale.date.split('T')[0],
        type: sale.type,
        amount: sale.amount.toString(),
        quantity: sale.quantity?.toString() || "",
        description: sale.description || "",
        itemId: sale.itemId?.toString() || "",
      });
    }
  }, [sale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.type || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateSale.mutateAsync({
        id: resolvedParams.id,
        data: {
          date: formData.date,
          type: formData.type as SalesType,
          amount: parseFloat(formData.amount),
          quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
          description: formData.description || undefined,
          itemId: formData.itemId ? parseInt(formData.itemId) : undefined,
        },
      });
      toast.success("Sale updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update sale");
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    
    if (!confirm("Are you sure you want to delete this sale? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(Number(resolvedParams.id));
      toast.success("Sale deleted successfully");
      router.push('/sales');
    } catch (error) {
      toast.error("Failed to delete sale");
      console.error(error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading || !resolvedParams) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!sale) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Sale Not Found</h1>
            <p className="text-muted-foreground">The sale you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/sales')}>Back to Sales</Button>
        </div>
      </AppLayout>
    );
  }

  const typeLabels: Record<SalesType, string> = {
    on_site: "On Site",
    delivery: "Delivery",
    takeaway: "Takeaway",
    catering: "Catering",
    other: "Other",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Sale" : `Sale - ${formatDate(sale.date)}`}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update sale information" : "Sale details and information"}
            </p>
          </div>
          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Form/Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Sale" : "Sale Information"}</CardTitle>
            <CardDescription>
              {isEditing ? "Update the details for this sale" : "View and manage sale details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      required
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => handleInputChange('type', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on_site">On Site</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="takeaway">Takeaway</SelectItem>
                        <SelectItem value="catering">Catering</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => handleInputChange('quantity', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  {/* Item/Recipe */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="itemId">Item/Recipe</Label>
                    <Select
                      value={formData.itemId || "none"}
                      onValueChange={(value) => handleInputChange('itemId', value === "none" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item or recipe (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {itemsResponse?.data?.filter(i => i.itemType === 'item').map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name} {item.category ? `(${item.category})` : ''}
                          </SelectItem>
                        ))}
                        {itemsResponse?.data?.filter(i => i.itemType === 'recipe').map((recipe) => (
                          <SelectItem key={recipe.id} value={recipe.id.toString()}>
                            {recipe.name} (Recipe)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Link this sale to a specific item or recipe
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Additional notes about this sale"
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateSale.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateSale.isPending ? "Updating..." : "Update Sale"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Date */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date</label>
                    <p className="text-base font-semibold mt-1">{formatDate(sale.date)}</p>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {typeLabels[sale.type] || sale.type}
                      </Badge>
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Amount</label>
                    <p className="text-base font-semibold mt-1">{formatCurrency(sale.amount)}</p>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                    <p className="text-base mt-1">
                      {sale.quantity || <span className="text-muted-foreground">—</span>}
                    </p>
                  </div>

                  {/* Item/Recipe */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Item/Recipe</label>
                    <div className="mt-1">
                      {sale.item ? (
                        <div className="flex items-center gap-2">
                          <Link href={sale.item.itemType === 'recipe' ? `/recipes/${sale.item.id}` : `/items/${sale.item.id}`}>
                            <Button variant="link" className="p-0 h-auto font-semibold">
                              {sale.item.name}
                            </Button>
                          </Link>
                          {sale.item.itemType === 'recipe' && (
                            <Badge variant="secondary" className="text-xs">Recipe</Badge>
                          )}
                          {sale.item.category && (
                            <Badge variant="outline" className="text-xs">{sale.item.category}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {sale.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-base mt-1 whitespace-pre-wrap">{sale.description}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(sale.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span> {formatDate(sale.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

