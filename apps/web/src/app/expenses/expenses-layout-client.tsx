"use client";

import { usePathname, useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import ExpensesContent from "./expenses-content";
import { ExpenseDetailContent } from "./[id]/expense-details-content";
import { ExpenseCreateContent } from "./expense-create-content";

export default function ExpensesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isCreate = pathname === "/expenses/create";
  const idMatch = pathname.match(/^\/expenses\/(\d+)(?:\/edit)?$/);
  const expenseId = idMatch ? idMatch[1] : null;
  const isEdit = pathname.endsWith("/edit");
  const isListOrPanel =
    pathname === "/expenses" || isCreate || expenseId !== null;
  const showPanel = isCreate || expenseId !== null;
  const rightWidth = showPanel ? "40%" : "0";
  const leftWidth = showPanel ? "60%" : "100%";

  const handleDeleted = () => router.push("/expenses");

  if (isListOrPanel) {
    return (
      <AppLayout>
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            className={`flex min-w-0 flex-col overflow-hidden pt-4 ${showPanel ? "flex-shrink-0 p-4" : "flex-1 p-4"}`}
            style={showPanel ? { width: leftWidth } : undefined}
          >
            <ExpensesContent selectedExpenseId={expenseId ? Number(expenseId) : undefined} />
          </div>
          {showPanel && (
            <div
              className="flex h-full min-w-0 flex-shrink-0 flex-col overflow-hidden border-l border-border bg-card"
              style={{ width: rightWidth }}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-6">
                {isCreate ? (
                  <ExpenseCreateContent
                    onClose={() => router.push("/expenses")}
                    onCreated={(id) => router.push(`/expenses/${id}`)}
                  />
                ) : expenseId ? (
                  <ExpenseDetailContent
                    expenseId={expenseId}
                    initialEditMode={isEdit}
                    onClose={() => router.push("/expenses")}
                    onDeleted={handleDeleted}
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
