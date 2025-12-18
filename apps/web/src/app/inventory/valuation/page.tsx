"use client";

import { useState, useEffect } from "react";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Badge } from "@kit/ui/badge";
import { DollarSign, Package, AlertCircle } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import Link from "next/link";

interface ValuationItem {
  stockLevelId: number;
  ingredientId: number;
  ingredientName: string;
  location: string | null;
  quantity: number;
  unit: string;
  averageUnitPrice: number;
  totalValue: number;
  hasPrice: boolean;
}

interface ValuationData {
  totalValue: number;
  itemCount: number;
  itemsWithPrice: number;
  itemsWithoutPrice: number;
  items: ValuationItem[];
}

export default function InventoryValuationPage() {
  const [valuation, setValuation] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/inventory/valuation')
      .then(res => res.json())
      .then(data => {
        setValuation(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching valuation:', err);
        toast.error('Failed to load inventory valuation');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  if (!valuation) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Valuation Data</h3>
            <p className="text-muted-foreground">
              Unable to calculate inventory valuation.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const itemsWithPrice = valuation.items.filter(i => i.hasPrice);
  const itemsWithoutPrice = valuation.items.filter(i => !i.hasPrice);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory Valuation</h1>
          <p className="text-muted-foreground">
            Total value of inventory based on average ingredient costs
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(valuation.totalValue)}</div>
              <p className="text-xs text-muted-foreground">
                Based on average prices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{valuation.itemCount}</div>
              <p className="text-xs text-muted-foreground">
                Stock items tracked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">With Price Data</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{valuation.itemsWithPrice}</div>
              <p className="text-xs text-muted-foreground">
                Items with pricing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Without Price</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{valuation.itemsWithoutPrice}</div>
              <p className="text-xs text-muted-foreground">
                Need price data
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Items with Price */}
        {itemsWithPrice.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Items with Price Data</CardTitle>
              <CardDescription>
                {itemsWithPrice.length} items with calculated values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {itemsWithPrice
                  .sort((a, b) => b.totalValue - a.totalValue)
                  .map((item) => (
                    <div key={item.stockLevelId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.ingredientName}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.location || "No location"} • {item.quantity} {item.unit}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Avg: {formatCurrency(item.averageUnitPrice)}/{item.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{formatCurrency(item.totalValue)}</div>
                        <div className="text-xs text-muted-foreground">
                          {((item.totalValue / valuation.totalValue) * 100).toFixed(1)}% of total
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items without Price */}
        {itemsWithoutPrice.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Items Without Price Data
              </CardTitle>
              <CardDescription>
                {itemsWithoutPrice.length} items need supplier order history to calculate value
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {itemsWithoutPrice.map((item) => (
                  <div key={item.stockLevelId} className="flex items-center justify-between p-3 border rounded-lg border-orange-200 bg-orange-50">
                    <div className="flex-1">
                      <div className="font-medium">{item.ingredientName}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.location || "No location"} • {item.quantity} {item.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-orange-500 text-orange-600">
                        No price data
                      </Badge>
                      <Link href={`/supplier-orders/create?ingredientId=${item.ingredientId}`}>
                        <Button variant="outline" size="sm">
                          Add Order
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}



