"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Badge } from "@kit/ui/badge";
import { Save, X, Trash2, Package, Truck } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useSupplierOrderById, useUpdateSupplierOrder, useDeleteSupplierOrder, useReceiveSupplierOrder } from "@kit/hooks";
import { toast } from "sonner";
import { formatDate } from "@kit/lib/date-format";
import { formatCurrency } from "@kit/lib/config";
import { SupplierOrderStatus } from "@kit/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kit/ui/dialog";

interface SupplierOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SupplierOrderDetailPage({ params }: SupplierOrderDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const { data: order, isLoading } = useSupplierOrderById(resolvedParams?.id || "");
  const updateOrder = useUpdateSupplierOrder();
  const deleteMutation = useDeleteSupplierOrder();
  const receiveOrder = useReceiveSupplierOrder();
  
  const [receiveItems, setReceiveItems] = useState<Array<{ itemId: number; receivedQuantity: number; location: string }>>([]);
  const [actualDeliveryDate, setActualDeliveryDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (order?.items) {
      setReceiveItems(order.items.map(item => ({
        itemId: item.id,
        receivedQuantity: item.receivedQuantity || item.quantity,
        location: "",
      })));
    }
  }, [order]);

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    if (!confirm("Are you sure you want to delete this supplier order?")) return;
    
    try {
      await deleteMutation.mutateAsync(resolvedParams.id);
      toast.success("Supplier order deleted successfully");
      router.push('/supplier-orders');
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete supplier order");
    }
  };

  const handleReceive = async () => {
    if (!resolvedParams?.id) return;
    
    // Validate received quantities
    for (const receiveItem of receiveItems) {
      if (receiveItem.receivedQuantity <= 0) {
        toast.error("All received quantities must be greater than 0");
        return;
      }
    }

    try {
      await receiveOrder.mutateAsync({
        id: resolvedParams.id,
        data: {
          actualDeliveryDate,
          items: receiveItems.map(item => ({
            itemId: item.itemId,
            receivedQuantity: item.receivedQuantity,
            location: item.location || undefined,
          })),
        },
      });
      toast.success("Order received successfully! Stock movements created.");
      setReceiveDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to receive order");
    }
  };

  const getStatusBadge = (status: SupplierOrderStatus) => {
    const variants: Record<SupplierOrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
      [SupplierOrderStatus.PENDING]: "outline",
      [SupplierOrderStatus.CONFIRMED]: "default",
      [SupplierOrderStatus.IN_TRANSIT]: "default",
      [SupplierOrderStatus.DELIVERED]: "default",
      [SupplierOrderStatus.CANCELLED]: "destructive",
    };
    return variants[status] || "secondary";
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading order...</div>
        </div>
      </AppLayout>
    );
  }

  if (!order) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Order not found</div>
        </div>
      </AppLayout>
    );
  }

  const canReceive = order.status === SupplierOrderStatus.PENDING || 
                     order.status === SupplierOrderStatus.CONFIRMED || 
                     order.status === SupplierOrderStatus.IN_TRANSIT;
  const isDelivered = order.status === SupplierOrderStatus.DELIVERED;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {order.orderNumber || `Order #${order.id}`}
            </h1>
            <p className="text-muted-foreground">
              Supplier order details
            </p>
          </div>
          <div className="flex space-x-2">
            {canReceive && (
              <Button
                onClick={() => setReceiveDialogOpen(true)}
              >
                <Truck className="mr-2 h-4 w-4" />
                Receive Order
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Supplier</label>
                <p className="text-base mt-1">{order.supplier?.name || `Supplier #${order.supplierId}`}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={getStatusBadge(order.status)}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Order Date</label>
                <p className="text-base mt-1">{formatDate(order.orderDate)}</p>
              </div>
              {order.expectedDeliveryDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Expected Delivery</label>
                  <p className="text-base mt-1">{formatDate(order.expectedDeliveryDate)}</p>
                </div>
              )}
              {order.actualDeliveryDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Actual Delivery</label>
                  <p className="text-base mt-1">{formatDate(order.actualDeliveryDate)}</p>
                </div>
              )}
              {order.totalAmount && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(order.totalAmount)}</p>
                </div>
              )}
              {order.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="text-base mt-1 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>{order.items?.length || 0} item(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {order.items && order.items.length > 0 ? (
                <div className="space-y-3">
                  {order.items.map((item) => {
                    const isFullyReceived = item.receivedQuantity && item.receivedQuantity >= item.quantity;
                    const isPartiallyReceived = item.receivedQuantity && item.receivedQuantity > 0 && item.receivedQuantity < item.quantity;
                    
                    return (
                      <div key={item.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{item.item?.name || item.ingredient?.name || `Item #${item.itemId || item.ingredientId}`}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Ordered: {item.quantity} {item.unit}
                            </div>
                            {item.receivedQuantity !== undefined && (
                              <div className={`text-sm mt-1 ${isFullyReceived ? 'text-green-600' : isPartiallyReceived ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                Received: {item.receivedQuantity} {item.unit}
                                {isPartiallyReceived && ` (${((item.receivedQuantity / item.quantity) * 100).toFixed(0)}%)`}
                              </div>
                            )}
                            <div className="text-sm text-muted-foreground mt-1">
                              Unit Price: {formatCurrency(item.unitPrice)} • Total: {formatCurrency(item.totalPrice)}
                            </div>
                          </div>
                          {isFullyReceived && (
                            <Badge variant="default" className="ml-2">Received</Badge>
                          )}
                          {isPartiallyReceived && (
                            <Badge variant="outline" className="ml-2">Partial</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No items in this order
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Receive Order Dialog */}
        <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Receive Order</DialogTitle>
              <DialogDescription>
                Mark items as received and create stock movements. This will automatically update stock levels.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="actualDeliveryDate">Actual Delivery Date *</Label>
                <Input
                  id="actualDeliveryDate"
                  type="date"
                  value={actualDeliveryDate}
                  onChange={(e) => setActualDeliveryDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-base font-semibold">Received Items</Label>
                {receiveItems.map((receiveItem, index) => {
                  const orderItem = order.items?.find(item => item.id === receiveItem.itemId);
                  if (!orderItem) return null;
                  
                  return (
                    <div key={receiveItem.itemId} className="p-4 border rounded-lg space-y-3">
                      <div className="font-medium">{orderItem.item?.name || orderItem.ingredient?.name || `Item #${orderItem.itemId || orderItem.ingredientId}`}</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Received Quantity *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={orderItem.quantity}
                            value={receiveItem.receivedQuantity || ""}
                            onChange={(e) => {
                              const updated = [...receiveItems];
                              updated[index].receivedQuantity = parseFloat(e.target.value) || 0;
                              setReceiveItems(updated);
                            }}
                            placeholder={orderItem.quantity.toString()}
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            Ordered: {orderItem.quantity} {orderItem.unit}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Storage Location</Label>
                          <Input
                            value={receiveItem.location}
                            onChange={(e) => {
                              const updated = [...receiveItems];
                              updated[index].location = e.target.value;
                              setReceiveItems(updated);
                            }}
                            placeholder="Main Storage"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setReceiveDialogOpen(false)}
                disabled={receiveOrder.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReceive}
                disabled={receiveOrder.isPending}
              >
                <Package className="mr-2 h-4 w-4" />
                {receiveOrder.isPending ? "Receiving..." : "Receive Order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

