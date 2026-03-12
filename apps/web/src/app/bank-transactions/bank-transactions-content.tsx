"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useBankTransactions } from "@kit/hooks";
import type { BankTransaction } from "@kit/lib";
import { Card, CardContent } from "@kit/ui/card";
import { useDashboardPeriod } from "@/components/dashboard-period-provider";

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

  useEffect(() => {
    setPage(1);
  }, [dateRange.startDate, dateRange.endDate]);

  const { data, isLoading } = useBankTransactions({
    page,
    limit: pageSize,
    from_date: dateRange.startDate,
    to_date: dateRange.endDate,
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
        cell: ({ row }) => row.original.execution_date,
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
          activeRowId={selectedTransactionId}
        />
      </div>
    </div>
  );
}

