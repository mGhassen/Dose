"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useBankTransactions, useDebounce } from "@kit/hooks";
import type { BankTransaction } from "@kit/lib";
import { formatDate } from "@kit/lib/date-format";
import { Card, CardContent } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/select";
import { useDashboardPeriod } from "@/components/dashboard-period-provider";

type ReconciledFilter = "all" | "true" | "false";
type SortColumn = "execution_date" | "amount" | "label" | "counterparty_name";
const SORT_OPTIONS: { value: string; by: SortColumn; order: "asc" | "desc"; label: string }[] = [
  { value: "date_desc", by: "execution_date", order: "desc", label: "Date (newest first)" },
  { value: "date_asc", by: "execution_date", order: "asc", label: "Date (oldest first)" },
  { value: "amount_desc", by: "amount", order: "desc", label: "Amount (high to low)" },
  { value: "amount_asc", by: "amount", order: "asc", label: "Amount (low to high)" },
  { value: "label_asc", by: "label", order: "asc", label: "Label (A–Z)" },
  { value: "label_desc", by: "label", order: "desc", label: "Label (Z–A)" },
  { value: "counterparty_asc", by: "counterparty_name", order: "asc", label: "Counterparty (A–Z)" },
  { value: "counterparty_desc", by: "counterparty_name", order: "desc", label: "Counterparty (Z–A)" },
];

interface BankTransactionsContentProps {
  selectedTransactionId?: number;
}

export default function BankTransactionsContent({
  selectedTransactionId,
}: BankTransactionsContentProps) {
  const router = useRouter();
  const { dateRange } = useDashboardPeriod();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [reconciledFilter, setReconciledFilter] = useState<ReconciledFilter>("all");
  const [sortValue, setSortValue] = useState("date_desc");
  const [listSearch, setListSearch] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [linkedEntityType, setLinkedEntityType] = useState<string>("all");
  const debouncedListSearch = useDebounce(listSearch, 400);

  useEffect(() => {
    setPage(1);
  }, [
    dateRange.startDate,
    dateRange.endDate,
    reconciledFilter,
    sortValue,
    debouncedListSearch,
    minAmount,
    maxAmount,
    linkedEntityType,
  ]);

  const sortOption = SORT_OPTIONS.find((o) => o.value === sortValue) ?? SORT_OPTIONS[0];
  const { data, isLoading } = useBankTransactions({
    page,
    limit: pageSize,
    from_date: dateRange.startDate,
    to_date: dateRange.endDate,
    reconciled: reconciledFilter === "all" ? undefined : reconciledFilter,
    sort_by: sortOption.by,
    sort_order: sortOption.order,
    q: debouncedListSearch.trim() || undefined,
    min_amount: minAmount.trim() || undefined,
    max_amount: maxAmount.trim() || undefined,
    reconciled_entity_type:
      linkedEntityType === "all" || !linkedEntityType ? undefined : linkedEntityType,
  });

  const list = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const totalCount = paginationMeta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const stats = useMemo(() => {
    let credits = 0;
    let debits = 0;
    let net = 0;

    for (const t of list) {
      const amount = Number(t.amount) || 0;
      net += amount;
      if (amount > 0) credits += amount;
      if (amount < 0) debits += amount;
    }

    const formatAmount = (value: number) =>
      value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      totalCount,
      credits: formatAmount(credits),
      debits: formatAmount(Math.abs(debits)),
      net: formatAmount(net),
    };
  }, [list, totalCount]);

  const columns: ColumnDef<BankTransaction>[] = useMemo(
    () => [
      {
        accessorKey: "execution_date",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.execution_date),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className={Number(row.original.amount) >= 0 ? "text-green-600" : "text-red-600"}>
            {Number(row.original.amount).toFixed(2)} {row.original.currency}
          </span>
        ),
      },
      { accessorKey: "label", header: "Label", cell: ({ row }) => row.original.label ?? "—" },
      {
        accessorKey: "counterparty_name",
        header: "Counterparty",
        cell: ({ row }) => row.original.counterparty_name ?? "—",
      },
      {
        accessorKey: "reconciled_entity_type",
        header: "Reconciled",
        cell: ({ row }) => {
          const r = row.original;
          if (!r.reconciled_entity_type) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-muted-foreground">
              {r.reconciled_entity_type} #{r.reconciled_entity_id}
            </span>
          );
        },
      },
    ],
    []
  );

  const filterColumns = useMemo(
    () => [
      { value: "execution_date", label: "Date", type: "date" as const },
      { value: "amount", label: "Amount", type: "number" as const },
      { value: "label", label: "Label", type: "text" as const },
      { value: "counterparty_name", label: "Counterparty", type: "text" as const },
      { value: "reconciled_entity_type", label: "Reconciled", type: "text" as const },
    ],
    []
  );

  const sortColumns = useMemo(
    () => [
      { value: "execution_date", label: "Date", type: "date" },
      { value: "amount", label: "Amount", type: "number" },
      { value: "label", label: "Label", type: "text" },
      { value: "counterparty_name", label: "Counterparty", type: "text" },
      { value: "reconciled_entity_type", label: "Reconciled", type: "text" },
    ],
    []
  );

  const pagination = useMemo(
    () => ({
      page,
      pageSize,
      totalCount,
      totalPages,
      onPageChange: setPage,
      onPageSizeChange: (size: number) => {
        setPageSize(size);
        setPage(1);
      },
    }),
    [page, pageSize, totalCount, totalPages]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-shrink-0 flex flex-col gap-4 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank transactions</h1>
          <p className="text-muted-foreground mt-2">
            Imported from Pennylane. Reconcile with sales, expenses, or other entities.
          </p>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">Transactions (period)</p>
              <p className="text-lg font-semibold">{stats.totalCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">Total credit</p>
              <p className="text-lg font-semibold text-green-600">{stats.credits}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">Total debit</p>
              <p className="text-lg font-semibold text-red-600">{stats.debits}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">Net</p>
              <p className="text-lg font-semibold">{stats.net}</p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="py-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Search label / counterparty</Label>
              <Input
                className="h-9"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Server filter (debounced)…"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Min amount</Label>
              <Input
                className="h-9"
                type="number"
                step="0.01"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="e.g. -500"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Max amount</Label>
              <Input
                className="h-9"
                type="number"
                step="0.01"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="e.g. -10"
              />
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-4">
              <Label className="text-xs text-muted-foreground">Linked document type</Label>
              <Select value={linkedEntityType} onValueChange={setLinkedEntityType}>
                <SelectTrigger className="h-9 w-full max-w-xs">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="sale">sale</SelectItem>
                  <SelectItem value="expense">expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DataTablePage
          title=""
          description=""
          data={list}
          columns={columns}
          loading={isLoading}
          onRowClick={(row) => router.push(`/bank-transactions/${row.id}`)}
          pagination={pagination}
          localStoragePrefix="bankTransactions"
          searchFields={["label", "counterparty_name"]}
          filterColumns={filterColumns}
          sortColumns={sortColumns}
          activeRowId={selectedTransactionId}
        />
      </div>
    </div>
  );
}

