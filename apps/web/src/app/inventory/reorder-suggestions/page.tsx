"use client";

import { useState, useEffect } from "react";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Badge } from "@kit/ui/badge";
import { AlertTriangle, ShoppingCart, ArrowRight } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { toast } from "sonner";
import Link from "next/link";
import { formatCurrency } from "@kit/lib/config";

interface ReorderSuggestion {
  stockLevelId: number;
  ingredientId: number;
  ingredientName: string;
  unit: string;
  location: string | null;
  currentQuantity: number;
  minimumStockLevel: number;
  maximumStockLevel: number | null;
  deficit: number;
  suggestedReorderQuantity: number;
  urgency: 'critical' | 'high' | 'medium';
}

export default function ReorderSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/inventory/reorder-suggestions')
      .then(res => res.json())
      .then(data => {
        setSuggestions(data.suggestions || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching reorder suggestions:', err);
        toast.error('Failed to load reorder suggestions');
        setLoading(false);
      });
  }, []);

  const criticalItems = suggestions.filter(s => s.urgency === 'critical');
  const highItems = suggestions.filter(s => s.urgency === 'high');
  const mediumItems = suggestions.filter(s => s.urgency === 'medium');

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge variant="outline" className="border-orange-500 text-orange-600">High</Badge>;
      case 'medium':
        return <Badge variant="outline">Medium</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reorder Suggestions</h1>
            <p className="text-muted-foreground">
              Items that need to be reordered based on minimum stock levels
            </p>
          </div>
          <Link href="/supplier-orders/create">
            <Button>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          </Link>
        </div>

        {suggestions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2">All Stock Levels Adequate</h3>
              <p className="text-muted-foreground">
                No items need to be reordered at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {criticalItems.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Critical ({criticalItems.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {criticalItems.map((suggestion) => (
                    <Card key={suggestion.stockLevelId} className="border-red-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{suggestion.ingredientName}</CardTitle>
                          {getUrgencyBadge(suggestion.urgency)}
                        </div>
                        <CardDescription>{suggestion.location || "No location"}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Current</div>
                              <div className="font-semibold text-red-600">
                                {suggestion.currentQuantity} {suggestion.unit}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Minimum</div>
                              <div className="font-semibold">
                                {suggestion.minimumStockLevel} {suggestion.unit}
                              </div>
                            </div>
                            {suggestion.maximumStockLevel && (
                              <div>
                                <div className="text-muted-foreground">Maximum</div>
                                <div className="font-semibold">
                                  {suggestion.maximumStockLevel} {suggestion.unit}
                                </div>
                              </div>
                            )}
                            <div>
                              <div className="text-muted-foreground">Deficit</div>
                              <div className="font-semibold">
                                {suggestion.deficit} {suggestion.unit}
                              </div>
                            </div>
                          </div>
                          <div className="pt-2 border-t">
                            <div className="text-sm text-muted-foreground mb-1">Suggested Order Quantity</div>
                            <div className="text-lg font-bold">
                              {suggestion.suggestedReorderQuantity} {suggestion.unit}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/stock-levels/${suggestion.stockLevelId}`} className="flex-1">
                              <Button variant="outline" className="w-full">
                                View Stock
                              </Button>
                            </Link>
                            <Link href={`/supplier-orders/create?ingredientId=${suggestion.ingredientId}&quantity=${suggestion.suggestedReorderQuantity}`} className="flex-1">
                              <Button className="w-full">
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Order
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {highItems.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  High Priority ({highItems.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {highItems.map((suggestion) => (
                    <Card key={suggestion.stockLevelId} className="border-orange-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{suggestion.ingredientName}</CardTitle>
                          {getUrgencyBadge(suggestion.urgency)}
                        </div>
                        <CardDescription>{suggestion.location || "No location"}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Current</div>
                              <div className="font-semibold text-orange-600">
                                {suggestion.currentQuantity} {suggestion.unit}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Minimum</div>
                              <div className="font-semibold">
                                {suggestion.minimumStockLevel} {suggestion.unit}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Deficit</div>
                              <div className="font-semibold">
                                {suggestion.deficit} {suggestion.unit}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Suggested</div>
                              <div className="font-semibold">
                                {suggestion.suggestedReorderQuantity} {suggestion.unit}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/stock-levels/${suggestion.stockLevelId}`} className="flex-1">
                              <Button variant="outline" className="w-full">
                                View Stock
                              </Button>
                            </Link>
                            <Link href={`/supplier-orders/create?ingredientId=${suggestion.ingredientId}&quantity=${suggestion.suggestedReorderQuantity}`} className="flex-1">
                              <Button variant="outline" className="w-full">
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Order
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {mediumItems.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Medium Priority ({mediumItems.length})</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {mediumItems.map((suggestion) => (
                    <Card key={suggestion.stockLevelId}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{suggestion.ingredientName}</CardTitle>
                          {getUrgencyBadge(suggestion.urgency)}
                        </div>
                        <CardDescription>{suggestion.location || "No location"}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Current</div>
                              <div className="font-semibold">
                                {suggestion.currentQuantity} {suggestion.unit}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Minimum</div>
                              <div className="font-semibold">
                                {suggestion.minimumStockLevel} {suggestion.unit}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Deficit</div>
                              <div className="font-semibold">
                                {suggestion.deficit} {suggestion.unit}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Suggested</div>
                              <div className="font-semibold">
                                {suggestion.suggestedReorderQuantity} {suggestion.unit}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/stock-levels/${suggestion.stockLevelId}`} className="flex-1">
                              <Button variant="outline" className="w-full">
                                View Stock
                              </Button>
                            </Link>
                            <Link href={`/supplier-orders/create?ingredientId=${suggestion.ingredientId}&quantity=${suggestion.suggestedReorderQuantity}`} className="flex-1">
                              <Button variant="outline" className="w-full">
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Order
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

