"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useIngredients, useRecipes, useStockLevels, useStockMovements, useSupplierOrders, useInventorySuppliers } from "@kit/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { formatDate } from "@kit/lib/date-format";
import { formatCurrency } from "@kit/lib/config";
import { 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  ShoppingCart,
  ChefHat,
  ArrowRight,
  Building2,
  Clock,
  Truck
} from "lucide-react";
import Link from "next/link";
import { SupplierOrderStatus } from "@kit/types";

export default function InventoryDashboardContent() {
  const router = useRouter();
  
  const { data: ingredientsResponse } = useIngredients({ limit: 1000 });
  const { data: recipesResponse } = useRecipes({ limit: 1000 });
  const { data: stockLevelsResponse } = useStockLevels({ limit: 1000 });
  const { data: movementsResponse } = useStockMovements({ limit: 20 });
  const { data: ordersResponse } = useSupplierOrders({ limit: 10 });
  const { data: suppliersResponse } = useInventorySuppliers({ limit: 1000 });

  const ingredients = ingredientsResponse?.data || [];
  const recipes = recipesResponse?.data || [];
  const stockLevels = stockLevelsResponse?.data || [];
  const movements = movementsResponse?.data || [];
  const orders = ordersResponse?.data || [];
  const suppliers = suppliersResponse?.data || [];

  // Calculate low stock items
  const lowStockItems = useMemo(() => {
    return stockLevels
      .filter(level => {
        if (!level.minimumStockLevel) return false;
        return level.quantity <= level.minimumStockLevel;
      })
      .slice(0, 5);
  }, [stockLevels]);

  // Calculate out of stock items
  const outOfStockItems = useMemo(() => {
    return stockLevels
      .filter(level => level.quantity <= 0)
      .slice(0, 5);
  }, [stockLevels]);

  // Recent stock movements
  const recentMovements = useMemo(() => {
    return movements.slice(0, 10);
  }, [movements]);

  // Pending orders
  const pendingOrders = useMemo(() => {
    return orders.filter(o => o.status === SupplierOrderStatus.PENDING || o.status === SupplierOrderStatus.IN_TRANSIT);
  }, [orders]);

  // Calculate summary stats
  const totalIngredients = ingredients.length;
  const activeRecipes = recipes.filter(r => r.isActive).length;
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.isActive).length;
  const totalStockItems = stockLevels.length;
  const lowStockCount = lowStockItems.length;
  const outOfStockCount = outOfStockItems.length;

  // Get ingredient names for display
  const ingredientMap = useMemo(() => {
    const map = new Map<number, string>();
    ingredients.forEach(ing => map.set(ing.id, ing.name));
    return map;
  }, [ingredients]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of your coffee shop inventory management
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingredients</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIngredients}</div>
            <p className="text-xs text-muted-foreground">
              Ingredients in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Recipes</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRecipes}</div>
            <p className="text-xs text-muted-foreground">
              {recipes.length} total recipes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              {totalSuppliers} total suppliers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Items tracked
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Low Stock Alerts */}
        <Card className={lowStockCount > 0 ? "border-orange-200" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${lowStockCount > 0 ? "text-orange-600" : "text-muted-foreground"}`} />
              Low Stock Alerts
              {lowStockCount > 0 && (
                <Badge variant="outline" className="ml-auto border-orange-500 text-orange-600">
                  {lowStockCount}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockCount === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                All stock levels are adequate
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map((level) => {
                  const ingredientName = ingredientMap.get(level.ingredientId) || 'Unknown';
                  return (
                    <div key={level.id} className="flex items-center justify-between p-2 rounded-md bg-orange-50 border border-orange-200">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{ingredientName}</div>
                        <div className="text-xs text-muted-foreground">
                          {level.quantity} {level.unit} / Min: {level.minimumStockLevel} {level.unit}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/stock-levels/${level.id}`)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                {lowStockCount > 5 && (
                  <Link href="/stock-levels">
                    <Button variant="outline" className="w-full mt-2">
                      View All Low Stock Items
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Out of Stock */}
        <Card className={outOfStockCount > 0 ? "border-red-200" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${outOfStockCount > 0 ? "text-red-600" : "text-muted-foreground"}`} />
              Out of Stock
              {outOfStockCount > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {outOfStockCount}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outOfStockCount === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                No items out of stock
              </div>
            ) : (
              <div className="space-y-2">
                {outOfStockItems.map((level) => {
                  const ingredientName = ingredientMap.get(level.ingredientId) || 'Unknown';
                  return (
                    <div key={level.id} className="flex items-center justify-between p-2 rounded-md bg-red-50 border border-red-200">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{ingredientName}</div>
                        <div className="text-xs text-muted-foreground">
                          {level.location || 'No location'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/stock-levels/${level.id}`)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                {outOfStockCount > 5 && (
                  <Link href="/stock-levels">
                    <Button variant="outline" className="w-full mt-2">
                      View All Out of Stock
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              Pending Orders
              {pendingOrders.length > 0 && (
                <Badge variant="outline" className="ml-auto">
                  {pendingOrders.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingOrders.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                No pending orders
              </div>
            ) : (
              <div className="space-y-2">
                {pendingOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-2 rounded-md border">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {order.orderNumber || `Order #${order.id}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(order.orderDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={order.status === SupplierOrderStatus.PENDING ? "outline" : "default"}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/supplier-orders/${order.id}`)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingOrders.length > 5 && (
                  <Link href="/supplier-orders">
                    <Button variant="outline" className="w-full mt-2">
                      View All Orders
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Stock Movements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              Recent Stock Movements
            </CardTitle>
            <Link href="/stock-movements">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentMovements.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No stock movements recorded yet
            </div>
          ) : (
            <div className="space-y-2">
              {recentMovements.map((movement) => {
                const ingredientName = ingredientMap.get(movement.ingredientId) || 'Unknown';
                const isIn = movement.movementType === 'in';
                return (
                  <div key={movement.id} className="flex items-center justify-between p-3 rounded-md border">
                    <div className="flex items-center gap-3 flex-1">
                      {isIn ? (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-blue-500" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-sm">{ingredientName}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(movement.movementDate)} • {movement.location || 'No location'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={isIn ? "default" : "outline"}>
                        {movement.movementType.toUpperCase()}
                      </Badge>
                      <div className="text-sm font-medium">
                        {isIn ? '+' : '-'}{movement.quantity} {movement.unit}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/stock-movements/${movement.id}`)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/ingredients/create">
              <Button variant="outline" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" />
                Add Ingredient
              </Button>
            </Link>
            <Link href="/recipes/create">
              <Button variant="outline" className="w-full justify-start">
                <ChefHat className="h-4 w-4 mr-2" />
                Create Recipe
              </Button>
            </Link>
            <Link href="/supplier-orders/create">
              <Button variant="outline" className="w-full justify-start">
                <ShoppingCart className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </Link>
            <Link href="/stock-movements/create">
              <Button variant="outline" className="w-full justify-start">
                <ArrowRight className="h-4 w-4 mr-2" />
                Record Movement
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

