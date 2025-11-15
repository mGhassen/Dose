"use client";

import { useState } from "react";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { TableRow, TableCell } from "@kit/ui/table";
import { Badge } from "@kit/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@kit/ui/dropdown-menu";
import { Edit2, Check, X, MoreVertical } from "lucide-react";
import { useUpdateDepreciationEntry } from "@kit/hooks";
import { toast } from "sonner";
import { formatCurrency } from "@kit/lib/config";
import type { DepreciationEntry } from "@kit/types";

interface EditableDepreciationRowProps {
  entry: DepreciationEntry;
  investmentId: string;
  onUpdate: () => void;
}

export function EditableDepreciationRow({ entry, investmentId, onUpdate }: EditableDepreciationRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    month: entry.month,
    depreciationAmount: entry.depreciationAmount.toString(),
    accumulatedDepreciation: entry.accumulatedDepreciation.toString(),
    bookValue: entry.bookValue.toString(),
  });
  const updateMutation = useUpdateDepreciationEntry();

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        investmentId,
        entryId: String(entry.id),
        data: {
          month: editData.month,
          depreciationAmount: parseFloat(editData.depreciationAmount),
          accumulatedDepreciation: parseFloat(editData.accumulatedDepreciation),
          bookValue: parseFloat(editData.bookValue),
        },
      });
      setIsEditing(false);
      onUpdate();
      toast.success("Depreciation entry updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update depreciation entry");
    }
  };

  if (isEditing) {
    return (
      <TableRow className="bg-muted/50">
        <TableCell className="font-medium">
          <Input
            type="text"
            value={editData.month}
            onChange={(e) => setEditData(prev => ({ ...prev, month: e.target.value }))}
            className="w-32"
            placeholder="YYYY-MM"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            step="0.01"
            value={editData.depreciationAmount}
            onChange={(e) => setEditData(prev => ({ ...prev, depreciationAmount: e.target.value }))}
            className="w-32 text-right"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            step="0.01"
            value={editData.accumulatedDepreciation}
            onChange={(e) => setEditData(prev => ({ ...prev, accumulatedDepreciation: e.target.value }))}
            className="w-32 text-right"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            step="0.01"
            value={editData.bookValue}
            onChange={(e) => setEditData(prev => ({ ...prev, bookValue: e.target.value }))}
            className="w-32 text-right"
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                setEditData({
                  month: entry.month,
                  depreciationAmount: entry.depreciationAmount.toString(),
                  accumulatedDepreciation: entry.accumulatedDepreciation.toString(),
                  bookValue: entry.bookValue.toString(),
                });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  const isProjected = new Date(entry.month + '-01') > new Date();
  const [year, month] = entry.month.split('-');
  const monthDate = new Date(parseInt(year), parseInt(month) - 1);

  return (
    <TableRow className={isProjected ? "bg-muted/50" : ""}>
      <TableCell className="font-medium">
        <div className="flex items-center space-x-2">
          {monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          {isProjected && (
            <Badge variant="secondary" className="text-xs">(Projected)</Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">{formatCurrency(entry.depreciationAmount)}</TableCell>
      <TableCell className="text-right">{formatCurrency(entry.accumulatedDepreciation)}</TableCell>
      <TableCell className="text-right font-semibold">{formatCurrency(entry.bookValue)}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Entry
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

