"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Badge } from "@kit/ui/badge";
import { Save, X, Trash2, AlertTriangle, TrendingUp, TrendingDown, MoreVertical, Edit2, Plus } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useStockLevelById, useUpdateStockLevel, useDeleteStockLevel, useStockMovements } from "@kit/hooks";
import { toast } from "sonner";
import { formatDate } from "@kit/lib/date-format";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@kit/ui/alert-dialog";

interface StockLevelDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function StockLevelDetailPage({ params }: StockLevelDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: stockLevel, isLoading } = useStockLevelById(resolvedParams?.id || "");
  const { data: movementsResponse } = useStockMovements({ 
    itemId: stockLevel?.itemId?.toString(),
    limit: 10 
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const updateStockLevel = useUpdateStockLevel();
  const deleteMutation = useDeleteStockLevel();
  
  const [formData, setFormData] = useState({
    quantity: "",
    unit: "",
    location: "",
    minimumStockLevel: "",
    maximumStockLevel: "",
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (stockLevel) {
      setFormData({
        quantity: stockLevel.quantity.toString(),
        unit: stockLevel.unit,
        location: stockLevel.location || "",
        minimumStockLevel: stockLevel.minimumStockLevel?.toString() || "",
        maximumStockLevel: stockLevel.maximumStockLevel?.toString() || "",
      });
    }
  }, [stockLevel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.quantity || !formData.unit) {
      toast.error("Please fill in quantity and unit");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateStockLevel.mutateAsync({
        id: resolvedParams.id,
        data: {
          quantity: parseFloat(formData.quantity),
          unit: formData.unit,
          location: formData.location || undefined,
          minimumStockLevel: formData.minimumStockLevel ? parseFloat(formData.minimumStockLevel) : undefined,
          maximumStockLevel: formData.maximumStockLevel ? parseFloat(formData.maximumStockLevel) : undefined,
        },
      });
      toast.success("Stock level updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update stock level");
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;

    try {
      await deleteMutation.mutateAsync(resolvedParams.id);
      toast.success("Stock level deleted successfully");
      router.push('/stock-levels');
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete stock level");
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

  if (!stockLevel) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Stock Level Not Found</h1>
            <p className="text-muted-foreground">The stock level you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/stock-levels')}>Back to Stock Levels</Button>
        </div>
      </AppLayout>
    );
  }

  const isLowStock = stockLevel.minimumStockLevel && stockLevel.quantity <= stockLevel.minimumStockLevel;
  const isOutOfStock = stockLevel.quantity <= 0;
  const recentMovements = movementsResponse?.data || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Stock Level" : stockLevel.item?.name || `Stock Level #${stockLevel.id}`}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update stock level information" : "Stock level details and history"}
            </p>
          </div>
          {!isEditing && (
            <div className="flex space-x-2">
              <Link href={`/stock-movements/create?itemId=${stockLevel.itemId}&location=${encodeURIComponent(stockLevel.location || '')}`}>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Record Movement
                </Button>
              </Link>
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
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={deleteMutation.isPending}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Stock Information</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Current Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.quantity}
                        onChange={(e) => handleInputChange('quantity', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit *</Label>
                      <Input
                        id="unit"
                        value={formData.unit}
                        onChange={(e) => handleInputChange('unit', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="Storage location"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minimumStockLevel">Minimum Stock Level</Label>
                      <Input
                        id="minimumStockLevel"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.minimumStockLevel}
                        onChange={(e) => handleInputChange('minimumStockLevel', e.target.value)}
                        placeholder="Reorder point"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maximumStockLevel">Maximum Stock Level</Label>
                      <Input
                        id="maximumStockLevel"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.maximumStockLevel}
                        onChange={(e) => handleInputChange('maximumStockLevel', e.target.value)}
                        placeholder="Max capacity"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateStockLevel.isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      {updateStockLevel.isPending ? "Updating..." : "Update"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Item</label>
                    <div className="mt-1">
                      <Link href={`/items/${stockLevel.itemId}`}>
                        <Button variant="link" className="p-0 h-auto font-semibold">
                          {stockLevel.item?.name || `Item #${stockLevel.itemId}`}
                        </Button>
                      </Link>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current Quantity</label>
                    <p className={`text-2xl font-bold mt-1 ${isOutOfStock ? 'text-destructive' : isLowStock ? 'text-orange-600' : ''}`}>
                      {stockLevel.quantity} {stockLevel.unit}
                    </p>
                    {isOutOfStock && (
                      <Badge variant="destructive" className="mt-2">Out of Stock</Badge>
                    )}
                    {!isOutOfStock && isLowStock && (
                      <Badge variant="outline" className="mt-2 border-orange-500 text-orange-600">Low Stock</Badge>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                    <p className="text-base mt-1">{stockLevel.location || "—"}</p>
                  </div>
                  {stockLevel.minimumStockLevel && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Minimum Stock Level</label>
                      <p className={`text-base mt-1 ${isLowStock ? 'text-orange-600 font-medium' : ''}`}>
                        {stockLevel.minimumStockLevel} {stockLevel.unit}
                      </p>
                    </div>
                  )}
                  {stockLevel.maximumStockLevel && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Maximum Stock Level</label>
                      <p className="text-base mt-1">{stockLevel.maximumStockLevel} {stockLevel.unit}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-base mt-1">{formatDate(stockLevel.lastUpdated)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Movements</CardTitle>
              <CardDescription>Latest stock movements for this item</CardDescription>
            </CardHeader>
            <CardContent>
              {recentMovements.length > 0 ? (
                <div className="space-y-2">
                  {recentMovements.map((movement) => {
                    const isIn = movement.movementType === 'in';
                    return (
                      <div key={movement.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {isIn ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-blue-500" />
                          )}
                          <div>
                            <div className="text-sm font-medium">{movement.movementType.toUpperCase()}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(movement.movementDate)}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-medium">
                          {isIn ? '+' : '-'}{movement.quantity} {movement.unit}
                        </div>
                      </div>
                    );
                  })}
                      <Link href={`/stock-movements?itemId=${stockLevel.itemId}`}>
                        <Button variant="outline" className="w-full mt-2">
                          View All Movements
                        </Button>
                      </Link>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No movements recorded yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {isLowStock && !isOutOfStock && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                This item is below the minimum stock level. Consider placing a supplier order.
              </p>
              <Link href="/supplier-orders/create">
                <Button variant="outline" size="sm">
                  Create Supplier Order
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

