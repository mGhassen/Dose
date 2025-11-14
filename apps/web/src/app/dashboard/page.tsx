"use client";

import { useAuth } from "@smartlogbook/hooks";
import { useTranslations } from 'next-intl';
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@smartlogbook/ui/card";
import { Home } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const t = useTranslations('dashboard');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName || user?.email || 'User'}!
          </p>
        </div>

        {/* Stats Cards - Placeholder for your metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Add your metrics here
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - Placeholder */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <p className="text-muted-foreground">
            Add your quick action buttons here
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
