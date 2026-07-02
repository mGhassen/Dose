'use client';

import React from 'react';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Checkbox } from '@kit/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

export type StepFilters = {
  status: string;
  phase: string;
  search: string;
  errorsOnly: boolean;
};

type Props = {
  filters: StepFilters;
  onChange: (filters: StepFilters) => void;
};

export function SyncStepsFilterBar({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b bg-background">
      <Input
        placeholder="Search steps…"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="h-8 w-48 text-sm"
      />
      <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v })}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="running">Running</SelectItem>
          <SelectItem value="done">Done</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.phase} onValueChange={(v) => onChange({ ...filters, phase: v })}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder="Phase" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All phases</SelectItem>
          <SelectItem value="fetch">Fetch</SelectItem>
          <SelectItem value="process">Process</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Checkbox
          id="errors-only"
          checked={filters.errorsOnly}
          onCheckedChange={(c) => onChange({ ...filters, errorsOnly: c === true })}
        />
        <Label htmlFor="errors-only" className="text-xs font-normal cursor-pointer">
          Errors only
        </Label>
      </div>
    </div>
  );
}
