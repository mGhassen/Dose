"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { dateToYYYYMMDD } from "@kit/lib";
import { DatePicker } from "@kit/ui/date-picker";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Textarea } from "@kit/ui/textarea";
import { Badge } from "@kit/ui/badge";
import { Checkbox } from "@kit/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import { Trash2, Package, Truck, Edit, Plus } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useQueryClient } from "@tanstack/react-query";
import { supplierOrdersApi } from "@kit/lib";
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
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { SupplierOrderEditorDrawer } from "../_components/supplier-order-editor-drawer";
import type { SupplierOrderEditorSubmit } from "../_components/supplier-order-editor";
import {
  DocumentPaymentSlicesEditor,
  defaultPaymentSliceRows,
  rowsToPaymentSlices,
  type DocumentPaymentSliceRow,
} from "@/components/document-payment-slices-editor";

interface SupplierOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

type SupplierOrderPaymentsSummary = {
  totalAmount: number;
  totalPaid: number;
  remainingAmount: number;
  payments: Array<{
    id: number;
    amount: number;
    paymentDate: string;
    paidDate?: string | null;
    notes?: string | null;
  }>;
};

export default function SupplierOrderDetailPage({ params }: SupplierOrderDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldAutoReceive = searchParams?.get("receive") === "1";
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [autoReceiveHandled, setAutoReceiveHandled] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [markPaidOnReceive, setMarkPaidOnReceive] = useState(false);
  const [receivePaymentRows, setReceivePaymentRows] = useState<DocumentPaymentSliceRow[]>([]);
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);
  const [addPaymentRows, setAddPaymentRows] = useState<DocumentPaymentSliceRow[]>([]);
  const [savingOrderPayments, setSavingOrderPayments] = useState(false);
  const [orderPayments, setOrderPayments] = useState<SupplierOrderPaymentsSummary | null>(null);
  const [loadingOrderPayments, setLoadingOrderPayments] = useState(false);
  const queryClient = useQueryClient();
  const { data: order, isLoading } = useSupplierOrderById(resolvedParams?.id || "");
  const updateOrder = useUpdateSupplierOrder();
  const deleteMutation = useDeleteSupplierOrder();
  const receiveOrder = useReceiveSupplierOrder();
  
  const [receiveItems, setReceiveItems] = useState<Array<{ itemId: number; receivedQuantity: number; location: string }>>([]);
  const [actualDeliveryDate, setActualDeliveryDate] = useState(dateToYYYYMMDD(new Date()));

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

  useEffect(() => {
    if (!shouldAutoReceive || autoReceiveHandled) return;
    if (!order?.items || order.items.length === 0) return;
    if (order.status === SupplierOrderStatus.DELIVERED) return;
    setAutoReceiveHandled(true);
    setReceiveDialogOpen(true);
    router.replace(`/supplier-orders/${order.id}`);
  }, [shouldAutoReceive, autoReceiveHandled, order, router]);

  const loadSupplierOrderPayments = async () => {
    if (!resolvedParams?.id) return;
    setLoadingOrderPayments(true);
    try {
      const response = await fetch(`/api/supplier-orders/${resolvedParams.id}/payments`);
      if (!response.ok) {
        setOrderPayments(null);
        return;
      }
      const data = (await response.json()) as SupplierOrderPaymentsSummary;
      setOrderPayments(data);
    } catch {
      setOrderPayments(null);
    } finally {
      setLoadingOrderPayments(false);
    }
  };

  const saveSupplierOrderPayments = async (rows: DocumentPaymentSliceRow[]) => {
    if (!resolvedParams?.id) return;
    const slices = rowsToPaymentSlices(rows);
    if (!slices || slices.length === 0) {
      toast.error("Each payment needs a positive amount and date");
      return;
    }
    setSavingOrderPayments(true);
    try {
      const response = await fetch(`/api/supplier-orders/${resolvedParams.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentSlices: slices }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((body as { error?: string; details?: string }).details || (body as { error?: string }).error || "Failed to save payments");
      }
      await loadSupplierOrderPayments();
      toast.success("Payments saved");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save payments");
      throw error;
    } finally {
      setSavingOrderPayments(false);
    }
  };

  useEffect(() => {
    if (!resolvedParams?.id || !order) return;
    if (order.status !== SupplierOrderStatus.DELIVERED) {
      setOrderPayments(null);
      return;
    }
    loadSupplierOrderPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams?.id, order?.status]);

  const handleSaveEdit = async (payload: SupplierOrderEditorSubmit) => {
    if (!resolvedParams?.id) return;
    if (payload.kind !== "update") return;
    try {
      const wantsDeliver =
        payload.data.status === SupplierOrderStatus.DELIVERED &&
        order?.status !== SupplierOrderStatus.DELIVERED;

      const dataToSave = wantsDeliver
        ? { ...payload.data, status: order?.status ?? SupplierOrderStatus.PENDING }
        : payload.data;

      await updateOrder.mutateAsync({ id: resolvedParams.id, data: dataToSave });
      setEditOpen(false);

      if (wantsDeliver) {
        const fresh = await queryClient.fetchQuery({
          queryKey: ["supplier-orders", resolvedParams.id],
          queryFn: () => supplierOrdersApi.getById(resolvedParams.id),
        });
        if (fresh?.items?.length) {
          setReceiveItems(
            fresh.items.map((item) => ({
              itemId: item.id,
              receivedQuantity: item.receivedQuantity || item.quantity,
              location: "",
            }))
          );
        }
        toast.info("Confirm received quantities to mark as delivered");
        setReceiveDialogOpen(true);
      } else {
        toast.success("Supplier order updated");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update supplier order");
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    try {
      await deleteMutation.mutateAsync(resolvedParams.id);
      toast.success("Supplier order deleted successfully");
      setIsDeleteDialogOpen(false);
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
    if (markPaidOnReceive && !rowsToPaymentSlices(receivePaymentRows)) {
      toast.error("Each payment needs a positive amount and date");
      return;
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
      if (markPaidOnReceive) {
        await saveSupplierOrderPayments(receivePaymentRows);
      } else {
        await loadSupplierOrderPayments();
      }
      toast.success("Order received successfully! Stock movements created.");
      setReceiveDialogOpen(false);
      setMarkPaidOnReceive(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to complete order receive flow");
    }
  };

  const openAddPaymentsDialog = () => {
    const defaultDate =
      order?.actualDeliveryDate || order?.orderDate || dateToYYYYMMDD(new Date());
    const suggestedAmount =
      orderPayments && orderPayments.remainingAmount > 0
        ? orderPayments.remainingAmount
        : order?.totalAmount || 0;
    setAddPaymentRows(defaultPaymentSliceRows(suggestedAmount, defaultDate));
    setAddPaymentDialogOpen(true);
  };

  const handleSaveAdditionalPayments = async () => {
    await saveSupplierOrderPayments(addPaymentRows);
    setAddPaymentDialogOpen(false);
  };

  useEffect(() => {
    if (!receiveDialogOpen || !order) return;
    const defaultDate =
      actualDeliveryDate || order.actualDeliveryDate || order.orderDate || dateToYYYYMMDD(new Date());
    const suggestedAmount =
      orderPayments && orderPayments.remainingAmount > 0
        ? orderPayments.remainingAmount
        : order.totalAmount || 0;
    setReceivePaymentRows(defaultPaymentSliceRows(suggestedAmount, defaultDate));
  }, [receiveDialogOpen, order, actualDeliveryDate, orderPayments]);

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
            <Button variant="outline" onClick={() => setEditOpen(true)} disabled={updateOrder.isPending}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            {isDelivered && (
              <Button
                variant="outline"
                onClick={openAddPaymentsDialog}
                disabled={loadingOrderPayments || savingOrderPayments}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            )}
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
              onClick={() => setIsDeleteDialogOpen(true)}
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
              {isDelivered && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Payments</label>
                  {loadingOrderPayments ? (
                    <p className="text-sm text-muted-foreground">Loading payments...</p>
                  ) : orderPayments ? (
                    <>
                      <p className="text-sm">
                        Paid {formatCurrency(orderPayments.totalPaid)} / {formatCurrency(orderPayments.totalAmount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Remaining {formatCurrency(orderPayments.remainingAmount)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No expense payment yet.</p>
                  )}
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
            <CardContent className="p-0">
              {order.items && order.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 pl-4 pr-2 text-xs font-medium text-muted-foreground">
                        Item
                      </TableHead>
                      <TableHead className="h-9 w-[1%] whitespace-nowrap px-2 text-right text-xs font-medium text-muted-foreground">
                        Ordered
                      </TableHead>
                      <TableHead className="h-9 w-[1%] whitespace-nowrap px-2 text-right text-xs font-medium text-muted-foreground">
                        Received
                      </TableHead>
                      <TableHead className="h-9 w-[1%] whitespace-nowrap px-2 text-right text-xs font-medium text-muted-foreground">
                        Unit
                      </TableHead>
                      <TableHead className="h-9 w-[1%] whitespace-nowrap pr-4 pl-2 text-right text-xs font-medium text-muted-foreground">
                        Line
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => {
                      const isFullyReceived =
                        item.receivedQuantity != null && item.receivedQuantity >= item.quantity;
                      const isPartiallyReceived =
                        item.receivedQuantity != null &&
                        item.receivedQuantity > 0 &&
                        item.receivedQuantity < item.quantity;
                      const lineTotal = item.totalPrice + (item.taxAmount ?? 0);
                      const itemId = item.itemId ?? (item as { ingredientId?: number }).ingredientId;
                      const itemName =
                        item.item?.name ||
                        (item as { ingredient?: { name?: string } }).ingredient?.name ||
                        `Item #${itemId}`;

                      return (
                        <TableRow key={item.id} className="text-sm">
                          <TableCell className="max-w-[min(280px,45vw)] py-2 pl-4 pr-2 align-top">
                            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                              <span className="min-w-0 truncate font-medium">
                                {itemId ? (
                                  <Link
                                    href={`/items/${itemId}`}
                                    className="text-primary hover:underline"
                                  >
                                    {itemName}
                                  </Link>
                                ) : (
                                  itemName
                                )}
                              </span>
                              <span className="flex shrink-0 gap-1">
                                {isFullyReceived ? (
                                  <Badge variant="default" className="text-[10px] leading-none">
                                    Received
                                  </Badge>
                                ) : null}
                                {isPartiallyReceived ? (
                                  <Badge variant="outline" className="text-[10px] leading-none">
                                    Partial
                                  </Badge>
                                ) : null}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-2 px-2 text-right tabular-nums text-muted-foreground">
                            {item.quantity} <span className="text-xs">{item.unit}</span>
                          </TableCell>
                          <TableCell
                            className={`whitespace-nowrap py-2 px-2 text-right tabular-nums ${
                              isFullyReceived
                                ? "text-green-600"
                                : isPartiallyReceived
                                  ? "text-orange-600"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {item.receivedQuantity != null ? (
                              <>
                                {item.receivedQuantity}{" "}
                                <span className="text-xs">{item.unit}</span>
                                {isPartiallyReceived ? (
                                  <span className="ml-1 text-[10px] opacity-80">
                                    ({((item.receivedQuantity! / item.quantity) * 100).toFixed(0)}%)
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-2 px-2 text-right align-top tabular-nums">
                            <div>{formatCurrency(item.unitPrice)}</div>
                            {item.taxRatePercent != null && item.taxRatePercent > 0 ? (
                              <div className="text-[11px] leading-tight text-muted-foreground">
                                +{item.taxRatePercent}% tax · {formatCurrency(item.taxAmount ?? 0)}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-2 pr-4 pl-2 text-right font-medium tabular-nums">
                            {formatCurrency(lineTotal)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No items in this order
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {isDelivered && orderPayments && orderPayments.payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                {orderPayments.payments.length} payment slice(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {orderPayments.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium tabular-nums">{formatCurrency(payment.amount)}</span>
                    <span className="text-muted-foreground"> · {formatDate(payment.paymentDate)}</span>
                    {payment.notes ? (
                      <p className="text-xs text-muted-foreground truncate">{payment.notes}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
                <DatePicker
                  id="actualDeliveryDate"
                  value={actualDeliveryDate ? new Date(actualDeliveryDate) : undefined}
                  onChange={(d) => setActualDeliveryDate(d ? dateToYYYYMMDD(d) : "")}
                  placeholder="Pick a date"
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-base font-semibold">Received Items</Label>
                {receiveItems.map((receiveItem, index) => {
                  const orderItem = order.items?.find(item => item.id === receiveItem.itemId);
                  if (!orderItem) return null;
                  
                  return (
                    <div key={receiveItem.itemId} className="p-4 border rounded-lg space-y-3">
                      <div className="font-medium">
                        {(orderItem.itemId ?? (orderItem as { ingredientId?: number }).ingredientId) ? (
                          <Link
                            href={`/items/${orderItem.itemId ?? (orderItem as { ingredientId?: number }).ingredientId}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {orderItem.item?.name || (orderItem as { ingredient?: { name?: string } }).ingredient?.name || `Item #${orderItem.itemId ?? (orderItem as { ingredientId?: number }).ingredientId}`}
                          </Link>
                        ) : (
                          orderItem.item?.name || (orderItem as { ingredient?: { name?: string } }).ingredient?.name || `Item #${orderItem.itemId ?? (orderItem as { ingredientId?: number }).ingredientId}`
                        )}
                      </div>
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

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={markPaidOnReceive}
                    onCheckedChange={(checked) => setMarkPaidOnReceive(checked === true)}
                  />
                  <Label className="text-sm font-medium">Payment is done now</Label>
                </div>
                {markPaidOnReceive ? (
                  <DocumentPaymentSlicesEditor
                    total={order.totalAmount ?? 0}
                    defaultDate={actualDeliveryDate}
                    rows={receivePaymentRows}
                    onRowsChange={setReceivePaymentRows}
                  />
                ) : null}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setReceiveDialogOpen(false)}
                disabled={receiveOrder.isPending || savingOrderPayments}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReceive}
                disabled={receiveOrder.isPending || savingOrderPayments}
              >
                <Package className="mr-2 h-4 w-4" />
                {receiveOrder.isPending || savingOrderPayments ? "Saving..." : "Receive Order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={addPaymentDialogOpen} onOpenChange={setAddPaymentDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add payments</DialogTitle>
              <DialogDescription>
                Record one or multiple payment slices for this supplier order expense.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <DocumentPaymentSlicesEditor
                total={orderPayments?.totalAmount ?? order.totalAmount ?? 0}
                defaultDate={order.actualDeliveryDate || order.orderDate || dateToYYYYMMDD(new Date())}
                rows={addPaymentRows}
                onRowsChange={setAddPaymentRows}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddPaymentDialogOpen(false)}
                disabled={savingOrderPayments}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAdditionalPayments}
                disabled={savingOrderPayments}
              >
                {savingOrderPayments ? "Saving..." : "Save payments"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <ConfirmationDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDelete}
          title="Delete supplier order"
          description="Are you sure you want to delete this supplier order? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          isPending={deleteMutation.isPending}
          variant="destructive"
        />

        <SupplierOrderEditorDrawer
          open={editOpen}
          onOpenChange={setEditOpen}
          order={order}
          onSubmit={handleSaveEdit}
          saving={updateOrder.isPending}
        />
      </div>
    </AppLayout>
  );
}

