"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Badge } from "@kit/ui/badge";
import { Trash2, TrendingUp, TrendingDown, Package, MoreVertical } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useStockMovementById, useDeleteStockMovement } from "@kit/hooks";
import { toast } from "sonner";
import { formatDate } from "@kit/lib/date-format";
import { StockMovementType } from "@kit/types";
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

interface StockMovementDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function StockMovementDetailPage({ params }: StockMovementDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { data: movement, isLoading } = useStockMovementById(resolvedParams?.id || "");
  const deleteMutation = useDeleteStockMovement();

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;

    try {
      await deleteMutation.mutateAsync(resolvedParams.id);
      toast.success("Stock movement deleted successfully");
      router.push('/stock-movements');
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete stock movement");
    }
  };

  const getMovementTypeBadge = (type: StockMovementType) => {
    const variants: Record<StockMovementType, "default" | "secondary" | "destructive" | "outline"> = {
      [StockMovementType.IN]: "default",
      [StockMovementType.OUT]: "destructive",
      [StockMovementType.ADJUSTMENT]: "outline",
      [StockMovementType.TRANSFER]: "secondary",
      [StockMovementType.WASTE]: "destructive",
      [StockMovementType.EXPIRED]: "destructive",
    };
    return variants[type] || "secondary";
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

  if (!movement) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Stock Movement Not Found</h1>
            <p className="text-muted-foreground">The stock movement you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/stock-movements')}>Back to Stock Movements</Button>
        </div>
      </AppLayout>
    );
  }

  const isIn = movement.movementType === StockMovementType.IN;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stock Movement #{movement.id}</h1>
            <p className="text-muted-foreground">
              Movement details and information
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Movement Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Item</label>
                <div className="mt-1">
                  <Link href={`/ingredients/${movement.itemId}`}>
                    <Button variant="link" className="p-0 h-auto font-semibold">
                      {movement.item?.name || `Item #${movement.itemId}`}
                    </Button>
                  </Link>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Movement Type</label>
                <div className="mt-1">
                  <Badge variant={getMovementTypeBadge(movement.movementType)}>
                    {movement.movementType.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                <div className="flex items-center gap-2 mt-1">
                  {isIn ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-blue-500" />
                  )}
                  <p className={`text-2xl font-bold ${isIn ? 'text-green-600' : 'text-blue-600'}`}>
                    {isIn ? '+' : '-'}{movement.quantity} {movement.unit}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Location</label>
                <p className="text-base mt-1">{movement.location || "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Movement Date</label>
                <p className="text-base mt-1">{formatDate(movement.movementDate)}</p>
              </div>
              {movement.referenceType && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reference</label>
                  <p className="text-base mt-1">
                    {movement.referenceType.replace('_', ' ')} #{movement.referenceId || 'N/A'}
                  </p>
                </div>
              )}
              {movement.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="text-base mt-1 whitespace-pre-wrap">{movement.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-base mt-1">{formatDate(movement.createdAt)}</p>
              </div>
              {movement.referenceType === 'supplier_order' && movement.referenceId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Supplier Order</label>
                  <div className="mt-1">
                    <Link href={`/supplier-orders/${movement.referenceId}`}>
                      <Button variant="link" className="p-0 h-auto">
                        View Order #{movement.referenceId}
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
              {movement.referenceType === 'recipe' && movement.referenceId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Recipe</label>
                  <div className="mt-1">
                    <Link href={`/recipes/${movement.referenceId}`}>
                      <Button variant="link" className="p-0 h-auto">
                        View Recipe #{movement.referenceId}
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Stock</label>
                <div className="mt-1">
                  <Link href={`/stock-levels?itemId=${movement.itemId}`}>
                    <Button variant="outline" size="sm">
                      <Package className="mr-2 h-4 w-4" />
                      View Stock Levels
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

