"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { Badge } from "@kit/ui/badge";
import { Edit2, Trash2, MoreVertical } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { useVariableById, useDeleteVariable } from "@kit/hooks";
import { toast } from "sonner";
import { formatDate } from "@kit/lib/date-format";
import type { VariableType } from "@kit/types";

interface VariableDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function VariableDetailPage({ params }: VariableDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const { data: variable, isLoading } = useVariableById(resolvedParams?.id || "");
  const deleteMutation = useDeleteVariable();

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const handleDelete = async () => {
    if (!resolvedParams?.id) return;
    
    if (!confirm("Are you sure you want to delete this variable? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(Number(resolvedParams.id));
      toast.success("Variable deleted successfully");
      router.push('/variables');
    } catch (error) {
      toast.error("Failed to delete variable");
      console.error(error);
    }
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

  if (!variable) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Variable Not Found</h1>
            <p className="text-muted-foreground">The variable you're looking for doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/variables')}>Back to Variables</Button>
        </div>
      </AppLayout>
    );
  }

  const typeLabels: Record<VariableType, string> = {
    cost: "Cost",
    tax: "Tax",
    inflation: "Inflation",
    exchange_rate: "Exchange Rate",
    other: "Other",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{variable.name}</h1>
            <p className="text-muted-foreground">Variable details and information</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/variables/${resolvedParams.id}/edit`)}>
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
        </div>

        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Variable Information</CardTitle>
            <CardDescription>View and manage variable details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-base font-semibold mt-1">{variable.name}</p>
                </div>

                {/* Type */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {typeLabels[variable.type] || variable.type}
                    </Badge>
                  </div>
                </div>

                {/* Value */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Value</label>
                  <p className="text-base font-semibold mt-1">
                    {variable.unit 
                      ? `${variable.value} ${variable.unit === 'percentage' ? '%' : variable.unit}`
                      : variable.value.toString()}
                  </p>
                </div>

                {/* Unit */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unit</label>
                  <p className="text-base mt-1">
                    {variable.unit || <span className="text-muted-foreground">—</span>}
                  </p>
                </div>

                {/* Effective Date */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Effective Date</label>
                  <p className="text-base mt-1">{formatDate(variable.effectiveDate)}</p>
                </div>

                {/* End Date */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">End Date</label>
                  <p className="text-base mt-1">
                    {variable.endDate ? formatDate(variable.endDate) : <span className="text-muted-foreground">—</span>}
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={variable.isActive ? "default" : "secondary"}>
                      {variable.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Description */}
              {variable.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-base mt-1 whitespace-pre-wrap">{variable.description}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Created:</span> {formatDate(variable.createdAt)}
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span> {formatDate(variable.updatedAt)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

