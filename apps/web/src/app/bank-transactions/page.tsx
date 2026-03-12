"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTablePage from "@/components/data-table-page";
import { useBankTransactions } from "@kit/hooks";
import type { BankTransaction } from "@kit/lib";
import AppLayout from "@/components/app-layout";

export default function BankTransactionsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading } = useBankTransactions({ page, limit: pageSize });

  const list = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const totalCount = paginationMeta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank transactions</h1>
          <p className="text-muted-foreground mt-2">
            Imported from Pennylane. Reconcile with sales, expenses, or other entities.
          </p>
        </div>
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
        />
      </div>
    </AppLayout>
  );
}
