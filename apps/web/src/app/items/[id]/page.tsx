"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Checkbox } from "@kit/ui/checkbox";
import { Badge } from "@kit/ui/badge";
import { StockMovementType } from "@kit/types";
import { Save, X, Trash2, MoreVertical, Edit2, Package, TrendingUp, TrendingDown, AlertTriangle, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kit/ui/tabs";
import { Separator } from "@kit/ui/separator";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import AppLayout from "@/components/app-layout";
import { useItemById, useUpdateItem, useDeleteItem, useVendors, useStockMovements } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import { formatDate } from "@kit/lib/date-format";

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ItemDetailPage({ params }: ItemDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: item, isLoading } = useItemById(resolvedParams?.id || "");
  const { data: vendorsResponse } = useVendors({ limit: 1000 });
  const { data: stockMovementsResponse } = useStockMovements({ itemId: resolvedParams?.id || "", limit: 1000 });
  const updateItem = useUpdateItem();
  const deleteMutation = useDeleteItem();
  
  // Calculate stock level from movements (running balance)
  const calculatedStock = useMemo(() => {
    if (!stockMovementsResponse?.data) return { total: 0, byLocation: new Map() };
    
    // Sort movements by date (oldest first) to calculate running balance
    const sortedMovements = [...stockMovementsResponse.data].sort((a, b) => 
      new Date(a.movementDate).getTime() - new Date(b.movementDate).getTime()
    );
    
    const byLocation = new Map<string, number>();
    let total = 0;
    
    sortedMovements.forEach(movement => {
      const location = movement.location || 'Default';
      const currentLocation = byLocation.get(location) || 0;
      
      if (movement.movementType === StockMovementType.IN) {
        byLocation.set(location, currentLocation + movement.quantity);
        total += movement.quantity;
      } else if (movement.movementType === StockMovementType.OUT || 
                 movement.movementType === StockMovementType.WASTE || 
                 movement.movementType === StockMovementType.EXPIRED) {
        const newLocationValue = Math.max(0, currentLocation - movement.quantity);
        byLocation.set(location, newLocationValue);
        total = Math.max(0, total - movement.quantity);
      } else if (movement.movementType === StockMovementType.ADJUSTMENT) {
        // Adjustment sets the value directly (positive or negative)
        byLocation.set(location, movement.quantity);
        total = movement.quantity; // For total, we'd need to know if it's a total adjustment or per-location
      } else if (movement.movementType === StockMovementType.TRANSFER) {
        // Transfer moves stock between locations, doesn't change total
        // This is complex - for now, treat as OUT from source location
        const newLocationValue = Math.max(0, currentLocation - movement.quantity);
        byLocation.set(location, newLocationValue);
      }
    });
    
    // Recalculate total from all locations
    const recalculatedTotal = Array.from(byLocation.values()).reduce((sum, qty) => sum + qty, 0);
    
    return { total: Math.max(0, recalculatedTotal), byLocation };
  }, [stockMovementsResponse?.data]);
  
  // Chart data: Daily movements over time
  const dailyChartData = useMemo(() => {
    if (!stockMovementsResponse?.data) return [];
    
    const dailyMap = new Map<string, { date: string; in: number; out: number }>();
    
    stockMovementsResponse.data.forEach(m => {
      const date = new Date(m.movementDate).toISOString().split('T')[0];
      const dayData = dailyMap.get(date) || { date, in: 0, out: 0 };
      
      if (m.movementType === StockMovementType.IN) {
        dayData.in += m.quantity;
      } else if (m.movementType === StockMovementType.OUT) {
        dayData.out += m.quantity;
      }
      
      dailyMap.set(date, dayData);
    });
    
    return Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days
  }, [stockMovementsResponse?.data]);
  
  // Chart data: Movement types distribution
  const movementTypeData = useMemo(() => {
    if (!stockMovementsResponse?.data) return [];
    
    const typeMap = new Map<string, number>();
    
    stockMovementsResponse.data.forEach(m => {
      const count = typeMap.get(m.movementType) || 0;
      typeMap.set(m.movementType, count + 1);
    });
    
    return Array.from(typeMap.entries()).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
    }));
  }, [stockMovementsResponse?.data]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    sku: "",
    unit: "",
    unitPrice: "",
    vendorId: "",
    notes: "",
    isActive: true,
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        description: item.description || "",
        category: item.category || "",
        sku: item.sku || "",
        unit: item.unit || "",
        unitPrice: item.unitPrice?.toString() || "",
        vendorId: item.vendorId?.toString() || "",
        notes: item.notes || "",
        isActive: item.isActive,
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please fill in the item name");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateItem.mutateAsync({
        id: resolvedParams.id,
        data: {
          name: formData.name,
          description: formData.description || undefined,
          category: formData.category || undefined,
          sku: formData.sku || undefined,
          unit: formData.unit || undefined,
          unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : undefined,
          vendorId: formData.vendorId ? parseInt(formData.vendorId) : undefined,
          notes: formData.notes || undefined,
          isActive: formData.isActive,
        },
      });
      toast.success("Item updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update item");
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    
    if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(resolvedParams.id);
      toast.success("Item deleted successfully");
      router.push('/items');
    } catch (error) {
      toast.error("Failed to delete item");
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

  if (!item) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Item Not Found</h1>
            <p className="text-muted-foreground">The item you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/items')}>Back to Items</Button>
        </div>
      </AppLayout>
    );
  }

  const vendorName = item.vendorId && vendorsResponse?.data?.find(v => v.id === item.vendorId)?.name;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Item" : item.name}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update item information" : "Item details and information"}
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

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Item</CardTitle>
              <CardDescription>Update the details for this item</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>

                  {/* SKU */}
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                    />
                  </div>

                  {/* Unit */}
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => handleInputChange('unit', e.target.value)}
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Unit Price</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      value={formData.unitPrice}
                      onChange={(e) => handleInputChange('unitPrice', e.target.value)}
                    />
                  </div>

                  {/* Vendor */}
                  <div className="space-y-2">
                    <Label htmlFor="vendorId">Vendor</Label>
                    <Select
                      value={formData.vendorId || "none"}
                      onValueChange={(value) => handleInputChange('vendorId', value === "none" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {vendorsResponse?.data?.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id.toString()}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Is Active */}
                  <div className="space-y-2 flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
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
                  <Button type="submit" disabled={updateItem.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateItem.isPending ? "Updating..." : "Update Item"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Main Content (8 columns) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Hero Stock Card - Large Prominent Display */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg mb-1">Current Stock</CardTitle>
                      <CardDescription>Real-time inventory level</CardDescription>
                    </div>
                    <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                        {calculatedStock.total.toFixed(2)}
                      </div>
                      <div className="text-lg text-muted-foreground">{item.unit || 'units'}</div>
                      <div className="text-sm text-muted-foreground mt-2">
                        From {stockMovementsResponse?.data?.length || 0} movements
                      </div>
                    </div>
                    <div className="text-right">
                      {calculatedStock.total === 0 ? (
                        <Badge variant="destructive" className="text-base px-4 py-2">Out of Stock</Badge>
                      ) : (
                        <Badge variant="default" className="text-base px-4 py-2 bg-green-600">In Stock</Badge>
                      )}
                      <div className="mt-3">
                        <Link href={`/stock-movements/create?itemId=${item.id}`}>
                          <Button size="sm" className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Record Movement
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                  {calculatedStock.byLocation.size > 0 && (
                    <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-800">
                      <div className="text-sm font-medium mb-3">Stock by Location</div>
                      <div className="grid grid-cols-2 gap-3">
                        {Array.from(calculatedStock.byLocation.entries()).map(([location, quantity]) => (
                          <div key={location} className="flex justify-between items-center p-3 bg-background/60 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                            <span className="text-sm font-medium">{location}</span>
                            <span className="text-sm font-bold">{quantity.toFixed(2)} {item.unit || 'units'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Total Movements</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stockMovementsResponse?.data?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Stock In</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {stockMovementsResponse?.data?.filter(m => m.movementType === StockMovementType.IN).reduce((sum, m) => sum + m.quantity, 0).toFixed(2) || '0'}
                    </div>
                    <p className="text-xs text-muted-foreground">Received</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Stock Out</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {stockMovementsResponse?.data?.filter(m => m.movementType === StockMovementType.OUT).reduce((sum, m) => sum + m.quantity, 0).toFixed(2) || '0'}
                    </div>
                    <p className="text-xs text-muted-foreground">Used</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Grid */}
              {stockMovementsResponse?.data && stockMovementsResponse.data.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Daily Movements (30 Days)</CardTitle>
                      <CardDescription className="text-xs">Stock in vs out trends</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {dailyChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart data={dailyChartData}>
                            <defs>
                              <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              style={{ fontSize: '12px' }}
                            />
                            <YAxis style={{ fontSize: '12px' }} />
                            <Tooltip 
                              formatter={(value: number) => value.toFixed(2)}
                              labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            />
                            <Legend />
                            <Area type="monotone" dataKey="in" stroke="#22c55e" fillOpacity={1} fill="url(#colorIn)" name="Stock In" />
                            <Area type="monotone" dataKey="out" stroke="#ef4444" fillOpacity={1} fill="url(#colorOut)" name="Stock Out" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                          No data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Movement Types</CardTitle>
                      <CardDescription className="text-xs">Distribution by type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {movementTypeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={movementTypeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                            <YAxis style={{ fontSize: '12px' }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#3b82f6" name="Count" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                          No data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Recent Movements */}
              {stockMovementsResponse?.data && stockMovementsResponse.data.length > 0 ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Recent Movements</CardTitle>
                        <CardDescription>Latest stock activity</CardDescription>
                      </div>
                      <Link href={`/stock-movements?itemId=${item.id}`}>
                        <Button variant="outline" size="sm">
                          View All
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {stockMovementsResponse.data.slice(0, 10).map((movement) => {
                        const isIn = movement.movementType === StockMovementType.IN;
                        const isOut = movement.movementType === StockMovementType.OUT;
                        return (
                          <div key={movement.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isIn ? (
                                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                  </div>
                                ) : isOut ? (
                                  <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <TrendingDown className="h-5 w-5 text-red-600" />
                                  </div>
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">
                                    {isIn ? '+' : '-'}{movement.quantity} {movement.unit}
                                  </div>
                                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Badge variant={isIn ? "default" : "destructive"} className="text-xs">
                                      {movement.movementType.toUpperCase()}
                                    </Badge>
                                    {movement.location && <span>• {movement.location}</span>}
                                  </div>
                                  {movement.notes && (
                                    <div className="text-xs text-muted-foreground mt-1">{movement.notes}</div>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatDate(movement.movementDate)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Stock Movements</CardTitle>
                    <CardDescription>No movements recorded yet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No stock movements have been recorded for this item.</p>
                      <Link href={`/stock-movements/create?itemId=${item.id}`}>
                        <Button variant="outline" size="sm" className="mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          Record First Movement
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Sidebar (4 columns) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Item Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Item Details</CardTitle>
                  <CardDescription>Basic information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Name</label>
                    <p className="text-base font-semibold mt-1">{item.name}</p>
                  </div>

                  <Separator />

                  {/* Status */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {/* SKU */}
                  {item.sku && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">SKU</label>
                        <p className="text-sm mt-1 font-mono">{item.sku}</p>
                      </div>
                    </>
                  )}

                  {/* Category */}
                  {item.category && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Category</label>
                        <p className="text-sm mt-1">{item.category}</p>
                      </div>
                    </>
                  )}

                  {/* Unit */}
                  {item.unit && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Unit</label>
                        <p className="text-sm mt-1">{item.unit}</p>
                      </div>
                    </>
                  )}

                  {/* Unit Price */}
                  {item.unitPrice !== undefined && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Unit Price</label>
                        <p className="text-base font-semibold mt-1">{formatCurrency(item.unitPrice)}</p>
                      </div>
                    </>
                  )}

                  {/* Vendor */}
                  {vendorName && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Vendor</label>
                        <div className="mt-1">
                          <Badge variant="outline">{vendorName}</Badge>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Produced From Recipe */}
                  {item.producedFromRecipeId && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Source Recipe</label>
                        <div className="mt-2">
                          <Link href={`/recipes/${item.producedFromRecipeId}`}>
                            <Button variant="outline" size="sm" className="w-full">
                              View Recipe
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Metadata */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(item.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span> {formatDate(item.updatedAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description & Notes */}
              {(item.description || item.notes) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {item.description && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-2 block">Description</label>
                        <p className="text-sm whitespace-pre-wrap">{item.description}</p>
                      </div>
                    )}
                    {item.notes && (
                      <>
                        {item.description && <Separator />}
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-2 block">Notes</label>
                          <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

