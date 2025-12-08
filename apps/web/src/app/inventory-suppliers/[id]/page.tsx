"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Checkbox } from "@kit/ui/checkbox";
import { Badge } from "@kit/ui/badge";
import { Separator } from "@kit/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { Save, X, Trash2, MoreVertical, Edit2, ShoppingCart, DollarSign, Package, TrendingUp, Building2, Plus } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useInventorySupplierById, useUpdateInventorySupplier, useDeleteInventorySupplier, useSupplierOrders, useItems, useStockMovements, useExpenses, useSubscriptions, useLeasing, useLoans } from "@kit/hooks";
import { toast } from "sonner";
import { formatDate } from "@kit/lib/date-format";
import { formatCurrency } from "@kit/lib/config";
import { SupplierOrderStatus, StockMovementType } from "@kit/types";

interface SupplierDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: supplier, isLoading } = useInventorySupplierById(resolvedParams?.id || "");
  const { data: ordersResponse } = useSupplierOrders({ supplierId: resolvedParams?.id || "", limit: 1000 });
  const { data: itemsResponse } = useItems({ limit: 1000 });
  const { data: stockMovementsResponse } = useStockMovements({ limit: 1000 });
  const { data: expensesResponse } = useExpenses({ limit: 1000 });
  const { data: subscriptionsResponse } = useSubscriptions({ limit: 1000 });
  const { data: loansResponse } = useLoans();
  const { data: leasingResponse } = useLeasing();
  const updateSupplier = useUpdateInventorySupplier();
  const deleteMutation = useDeleteInventorySupplier();

  // Check if supplier is a vendor
  const isVendor = useMemo(() => {
    return supplier?.supplierType?.includes('vendor') || false;
  }, [supplier?.supplierType]);

  // Filter vendor-related data
  const vendorExpenses = useMemo(() => {
    if (!expensesResponse?.data || !resolvedParams?.id) return [];
    return expensesResponse.data.filter(e => e.supplierId === Number(resolvedParams.id));
  }, [expensesResponse?.data, resolvedParams?.id]);

  const vendorSubscriptions = useMemo(() => {
    if (!subscriptionsResponse?.data || !resolvedParams?.id) return [];
    return subscriptionsResponse.data.filter(s => s.supplierId === Number(resolvedParams.id));
  }, [subscriptionsResponse?.data, resolvedParams?.id]);

  const vendorLoans = useMemo(() => {
    if (!loansResponse || !resolvedParams?.id) return [];
    return loansResponse.filter(l => l.supplierId === Number(resolvedParams.id));
  }, [loansResponse, resolvedParams?.id]);

  const vendorLeasing = useMemo(() => {
    if (!leasingResponse || !resolvedParams?.id) return [];
    return leasingResponse.filter(l => l.supplierId === Number(resolvedParams.id));
  }, [leasingResponse, resolvedParams?.id]);

  // Calculate vendor statistics
  const vendorStats = useMemo(() => {
    const expensesTotal = vendorExpenses.reduce((sum, e) => sum + e.amount, 0);
    const subscriptionsTotal = vendorSubscriptions.reduce((sum, s) => sum + s.amount, 0);
    const loansTotal = vendorLoans.reduce((sum, l) => sum + l.principalAmount, 0);
    const leasingTotal = vendorLeasing.reduce((sum, l) => sum + (l.totalAmount || l.amount || 0), 0);
    
    return {
      expensesTotal,
      subscriptionsTotal,
      loansTotal,
      leasingTotal,
      totalVendorSpending: expensesTotal + subscriptionsTotal + loansTotal + leasingTotal,
      expensesCount: vendorExpenses.length,
      subscriptionsCount: vendorSubscriptions.length,
      loansCount: vendorLoans.length,
      leasingCount: vendorLeasing.length,
    };
  }, [vendorExpenses, vendorSubscriptions, vendorLoans, vendorLeasing]);

  // Get items linked to this supplier (via vendorId)
  const supplierItems = useMemo(() => {
    if (!itemsResponse?.data || !resolvedParams?.id) return [];
    return itemsResponse.data.filter(i => i.vendorId === Number(resolvedParams.id));
  }, [itemsResponse?.data, resolvedParams?.id]);

  // Calculate statistics
  const stats = useMemo(() => {
    const orders = ordersResponse?.data || [];
    const totalAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrders = orders.length;
    
    // Get unique items bought from this supplier
    const itemIds = new Set<number>();
    const itemQuantities = new Map<number, number>();
    
    orders.forEach(order => {
      order.items?.forEach(item => {
        if (item.itemId) {
          itemIds.add(item.itemId);
          const current = itemQuantities.get(item.itemId) || 0;
          itemQuantities.set(item.itemId, current + item.quantity);
        }
      });
    });
    
    const uniqueItems = Array.from(itemIds).length;
    const totalItemsQuantity = Array.from(itemQuantities.values()).reduce((sum, qty) => sum + qty, 0);
    
    return {
      totalAmount,
      totalOrders,
      uniqueItems,
      totalItemsQuantity,
      itemIds: Array.from(itemIds),
      itemQuantities,
    };
  }, [ordersResponse?.data]);

  // Get items with stock levels
  const itemsWithStock = useMemo(() => {
    if (!itemsResponse?.data || !stockMovementsResponse?.data) return [];
    
    return stats.itemIds.map(itemId => {
      const item = itemsResponse.data.find(i => i.id === itemId);
      if (!item) return null;
      
      // Calculate stock from movements
      const movements = stockMovementsResponse.data.filter(m => m.itemId === itemId);
      const stock = movements.reduce((sum, m) => {
        if (m.movementType === StockMovementType.IN || m.movementType === StockMovementType.ADJUSTMENT) {
          return sum + m.quantity;
        } else {
          return sum - m.quantity;
        }
      }, 0);
      
      return {
        ...item,
        stock: Math.max(0, stock),
        totalBought: stats.itemQuantities.get(itemId) || 0,
      };
    }).filter(Boolean);
  }, [itemsResponse?.data, stockMovementsResponse?.data, stats.itemIds, stats.itemQuantities]);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
    paymentTerms: "",
    notes: "",
    supplierType: ['supplier'] as ('supplier' | 'vendor')[],
    isActive: true,
  });

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        contactPerson: supplier.contactPerson || "",
        paymentTerms: supplier.paymentTerms || "",
        notes: supplier.notes || "",
        supplierType: supplier.supplierType || ['supplier'],
        isActive: supplier.isActive,
      });
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please fill in the supplier name");
      return;
    }

    if (!resolvedParams?.id) return;

    try {
      await updateSupplier.mutateAsync({
        id: resolvedParams.id,
          data: {
            name: formData.name,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
            contactPerson: formData.contactPerson || undefined,
            paymentTerms: formData.paymentTerms || undefined,
            notes: formData.notes || undefined,
            supplierType: formData.supplierType,
            isActive: formData.isActive,
          },
      });
      toast.success("Supplier updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update supplier");
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    
    if (!confirm("Are you sure you want to delete this supplier? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(resolvedParams.id);
      toast.success("Supplier deleted successfully");
      router.push('/inventory-suppliers');
    } catch (error) {
      toast.error("Failed to delete supplier");
      console.error(error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: SupplierOrderStatus) => {
    const variants: Record<SupplierOrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
      [SupplierOrderStatus.PENDING]: "outline",
      [SupplierOrderStatus.CONFIRMED]: "default",
      [SupplierOrderStatus.IN_TRANSIT]: "default",
      [SupplierOrderStatus.DELIVERED]: "default",
      [SupplierOrderStatus.CANCELLED]: "destructive",
    };
    return variants[status] || "outline";
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

  if (!supplier) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Supplier Not Found</h1>
            <p className="text-muted-foreground">The supplier you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/inventory-suppliers')}>Back to Suppliers</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Supplier" : supplier.name}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update supplier information" : "Supplier details and information"}
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
              <CardTitle>Edit Supplier</CardTitle>
              <CardDescription>Update the details for this supplier</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Input
                      id="paymentTerms"
                      value={formData.paymentTerms}
                      onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <Label>Supplier Type</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="type-supplier"
                          checked={formData.supplierType.includes('supplier')}
                          onCheckedChange={(checked) => {
                            const newTypes = checked
                              ? [...formData.supplierType.filter(t => t !== 'supplier'), 'supplier']
                              : formData.supplierType.filter(t => t !== 'supplier');
                            handleInputChange('supplierType', newTypes.length > 0 ? newTypes : ['vendor']);
                          }}
                        />
                        <Label htmlFor="type-supplier" className="font-normal cursor-pointer">
                          Supplier (for items/inventory)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="type-vendor"
                          checked={formData.supplierType.includes('vendor')}
                          onCheckedChange={(checked) => {
                            const newTypes = checked
                              ? [...formData.supplierType.filter(t => t !== 'vendor'), 'vendor']
                              : formData.supplierType.filter(t => t !== 'vendor');
                            handleInputChange('supplierType', newTypes.length > 0 ? newTypes : ['supplier']);
                          }}
                        />
                        <Label htmlFor="type-vendor" className="font-normal cursor-pointer">
                          Vendor (for expenses/subscriptions/loans/leasing)
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                    />
                    <Label htmlFor="isActive" className="font-normal cursor-pointer">
                      Active
                    </Label>
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
                  <Button type="submit" disabled={updateSupplier.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {updateSupplier.isPending ? "Updating..." : "Update Supplier"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Main Content (8 columns) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Hero Total Amount Card */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg mb-1">Total Amount Bought</CardTitle>
                      <CardDescription>All-time spending with this supplier</CardDescription>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-5xl font-bold text-green-600 dark:text-green-400 mb-2">
                        {formatCurrency(stats.totalAmount)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        From {stats.totalOrders} order{stats.totalOrders !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <Link href={`/supplier-orders/create?supplierId=${supplier.id}`}>
                        <Button size="sm" className="w-full">
                          <Plus className="mr-2 h-4 w-4" />
                          New Order
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Total Orders</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalOrders}</div>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Unique Items</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.uniqueItems}</div>
                    <p className="text-xs text-muted-foreground">Items bought</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium">Total Quantity</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalItemsQuantity.toFixed(0)}</div>
                    <p className="text-xs text-muted-foreground">Units purchased</p>
                  </CardContent>
                </Card>
              </div>

              {/* Orders List */}
              {ordersResponse?.data && ordersResponse.data.length > 0 ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Recent Orders</CardTitle>
                        <CardDescription>All orders from this supplier</CardDescription>
                      </div>
                      <Link href={`/supplier-orders?supplierId=${supplier.id}`}>
                        <Button variant="outline" size="sm">
                          View All
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {ordersResponse.data.slice(0, 10).map((order) => (
                        <Link key={order.id} href={`/supplier-orders/${order.id}`}>
                          <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {order.orderNumber || `Order #${order.id}`}
                                  </div>
                                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                    <Badge variant={getStatusBadge(order.status)} className="text-xs">
                                      {order.status.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                    <span>• {order.items?.length || 0} items</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{order.totalAmount ? formatCurrency(order.totalAmount) : '—'}</div>
                                <div className="text-sm text-muted-foreground">
                                  {formatDate(order.orderDate)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Orders</CardTitle>
                    <CardDescription>No orders recorded yet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No orders have been placed with this supplier.</p>
                      <Link href={`/supplier-orders/create?supplierId=${supplier.id}`}>
                        <Button variant="outline" size="sm" className="mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          Create First Order
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items Bought with Stock */}
              {itemsWithStock.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Items Bought & Stock Levels</CardTitle>
                    <CardDescription>All items purchased from this supplier with current stock</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {itemsWithStock.map((item: any) => (
                        <Link key={item.id} href={`/items/${item.id}`}>
                          <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                  item.stock > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                                }`}>
                                  <Package className={`h-5 w-5 ${item.stock > 0 ? 'text-green-600' : 'text-red-600'}`} />
                                </div>
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                    <span>Bought: {item.totalBought.toFixed(2)} {item.unit || 'units'}</span>
                                    <span>•</span>
                                    <span>Stock: {item.stock.toFixed(2)} {item.unit || 'units'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                {item.stock > 0 ? (
                                  <Badge variant="default" className="bg-green-600">In Stock</Badge>
                                ) : (
                                  <Badge variant="destructive">Out of Stock</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Vendor-related sections (only if supplier is a vendor) */}
              {isVendor && (
                <>
                  {/* Vendor Spending Summary */}
                  {vendorStats.totalVendorSpending > 0 && (
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg mb-1">Total Vendor Spending</CardTitle>
                            <CardDescription>All expenses, subscriptions, loans, and leasing</CardDescription>
                          </div>
                          <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                          {formatCurrency(vendorStats.totalVendorSpending)}
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Expenses</div>
                            <div className="text-lg font-semibold">{formatCurrency(vendorStats.expensesTotal)}</div>
                            <div className="text-xs text-muted-foreground">{vendorStats.expensesCount} items</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Subscriptions</div>
                            <div className="text-lg font-semibold">{formatCurrency(vendorStats.subscriptionsTotal)}</div>
                            <div className="text-xs text-muted-foreground">{vendorStats.subscriptionsCount} active</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Loans</div>
                            <div className="text-lg font-semibold">{formatCurrency(vendorStats.loansTotal)}</div>
                            <div className="text-xs text-muted-foreground">{vendorStats.loansCount} loans</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Leasing</div>
                            <div className="text-lg font-semibold">{formatCurrency(vendorStats.leasingTotal)}</div>
                            <div className="text-xs text-muted-foreground">{vendorStats.leasingCount} leases</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Expenses */}
                  {vendorExpenses.length > 0 && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Expenses</CardTitle>
                            <CardDescription>Expenses linked to this vendor</CardDescription>
                          </div>
                          <Link href={`/expenses?supplierId=${supplier.id}`}>
                            <Button variant="outline" size="sm">View All</Button>
                          </Link>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {vendorExpenses.slice(0, 10).map((expense) => (
                            <Link key={expense.id} href={`/expenses/${expense.id}`}>
                              <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{expense.name}</div>
                                    <div className="text-sm text-muted-foreground">{formatDate(expense.expenseDate)}</div>
                                  </div>
                                  <div className="text-right font-semibold">{formatCurrency(expense.amount)}</div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Subscriptions */}
                  {vendorSubscriptions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Subscriptions</CardTitle>
                            <CardDescription>Active subscriptions with this vendor</CardDescription>
                          </div>
                          <Link href={`/subscriptions?supplierId=${supplier.id}`}>
                            <Button variant="outline" size="sm">View All</Button>
                          </Link>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {vendorSubscriptions.slice(0, 10).map((subscription) => (
                            <Link key={subscription.id} href={`/subscriptions/${subscription.id}`}>
                              <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{subscription.name}</div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                      <span>{subscription.recurrence}</span>
                                      {subscription.isActive && <Badge variant="default" className="text-xs">Active</Badge>}
                                    </div>
                                  </div>
                                  <div className="text-right font-semibold">{formatCurrency(subscription.amount)}</div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Loans */}
                  {vendorLoans.length > 0 && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Loans</CardTitle>
                            <CardDescription>Loans from this vendor</CardDescription>
                          </div>
                          <Link href={`/loans?supplierId=${supplier.id}`}>
                            <Button variant="outline" size="sm">View All</Button>
                          </Link>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {vendorLoans.slice(0, 10).map((loan) => (
                            <Link key={loan.id} href={`/loans/${loan.id}`}>
                              <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{loan.name}</div>
                                    <div className="text-sm text-muted-foreground">{loan.loanNumber} • {formatCurrency(loan.principalAmount)}</div>
                                  </div>
                                  <Badge variant="outline">{loan.status}</Badge>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Leasing */}
                  {vendorLeasing.length > 0 && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Leasing</CardTitle>
                            <CardDescription>Leasing agreements with this vendor</CardDescription>
                          </div>
                          <Link href={`/leasing?supplierId=${supplier.id}`}>
                            <Button variant="outline" size="sm">View All</Button>
                          </Link>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {vendorLeasing.slice(0, 10).map((leasing) => (
                            <Link key={leasing.id} href={`/leasing/${leasing.id}`}>
                              <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{leasing.name}</div>
                                    <div className="text-sm text-muted-foreground">{leasing.frequency} • {formatCurrency(leasing.amount)}</div>
                                  </div>
                                  {leasing.isActive && <Badge variant="default">Active</Badge>}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Items linked via vendorId */}
              {supplierItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Items Linked to Vendor</CardTitle>
                    <CardDescription>Items that reference this supplier as vendor</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {supplierItems.map((item) => (
                        <Link key={item.id} href={`/items/${item.id}`}>
                          <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{item.name}</div>
                              <Badge variant="outline">{item.category || 'No category'}</Badge>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Sidebar (4 columns) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Supplier Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Supplier Details</CardTitle>
                  <CardDescription>Basic information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Name</label>
                    <p className="text-base font-semibold mt-1">{supplier.name}</p>
                  </div>

                  <Separator />

                  {/* Status */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge variant={supplier.isActive ? "default" : "secondary"}>
                        {supplier.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {/* Supplier Type */}
                  <Separator />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Type</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {supplier.supplierType?.includes('supplier') && (
                        <Badge variant="outline">Supplier</Badge>
                      )}
                      {supplier.supplierType?.includes('vendor') && (
                        <Badge variant="outline">Vendor</Badge>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  {supplier.email && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Email</label>
                        <p className="text-sm mt-1">{supplier.email}</p>
                      </div>
                    </>
                  )}

                  {/* Phone */}
                  {supplier.phone && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Phone</label>
                        <p className="text-sm mt-1">{supplier.phone}</p>
                      </div>
                    </>
                  )}

                  {/* Contact Person */}
                  {supplier.contactPerson && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Contact Person</label>
                        <p className="text-sm mt-1">{supplier.contactPerson}</p>
                      </div>
                    </>
                  )}

                  {/* Payment Terms */}
                  {supplier.paymentTerms && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Payment Terms</label>
                        <p className="text-sm mt-1">{supplier.paymentTerms}</p>
                      </div>
                    </>
                  )}

                  {/* Address */}
                  {supplier.address && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Address</label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{supplier.address}</p>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Metadata */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Created:</span> {formatDate(supplier.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span> {formatDate(supplier.updatedAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {supplier.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
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

