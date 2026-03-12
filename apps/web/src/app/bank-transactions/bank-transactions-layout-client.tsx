"use client";

import { usePathname, useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import BankTransactionsContent from "./bank-transactions-content";
import { BankTransactionDetailContent } from "./bank-transaction-detail-content";

export default function BankTransactionsLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const idMatch = pathname.match(/^\/bank-transactions\/(\d+)$/);
  const txId = idMatch ? idMatch[1] : null;

  const isListOrPanel = pathname === "/bank-transactions" || txId !== null;
  const showPanel = txId !== null;
  const rightWidth = showPanel ? "50%" : "0";
  const leftWidth = showPanel ? "50%" : "100%";

  if (isListOrPanel) {
    return (
      <AppLayout>
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            className={`flex min-w-0 flex-col overflow-hidden pt-4 ${
              showPanel ? "flex-shrink-0 p-4" : "flex-1 p-4"
            }`}
            style={showPanel ? { width: leftWidth } : undefined}
          >
            <BankTransactionsContent
              selectedTransactionId={txId ? Number(txId) : undefined}
            />
          </div>
          {showPanel && (
            <div
              className="flex h-full min-w-0 flex-shrink-0 flex-col overflow-hidden border-l border-border bg-card"
              style={{ width: rightWidth }}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-6">
                {txId ? (
                  <BankTransactionDetailContent
                    transactionId={txId}
                    onClose={() => router.push("/bank-transactions")}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  return <>{children}</>;
}

