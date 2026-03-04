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
  const isListOrDetail =
    pathname === "/expenses" || /^\/expenses\/\d+$/.test(pathname) || isCreate;
  const expenseIdMatch = pathname.match(/^\/expenses\/(\d+)$/);
  const expenseId = expenseIdMatch ? expenseIdMatch[1] : null;
  const showSidebar = !!expenseId || isCreate;

  const handleDeleted = () => router.push("/expenses");

  if (isListOrDetail) {
    return (
      <AppLayout>
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            className={`flex flex-1 min-w-0 flex-col overflow-hidden pt-4 ${showSidebar ? "p-6" : ""}`}
          >
            <ExpensesContent selectedExpenseId={expenseId ? Number(expenseId) : undefined} />
          </div>
          {showSidebar && (
            <div className="flex h-full w-[420px] min-w-[320px] max-w-[min(480px,40vw)] flex-shrink-0 flex-col overflow-hidden border-l border-border bg-card lg:w-[480px]">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-6">
                {isCreate ? (
                  <ExpenseCreateContent
                    onClose={() => router.push("/expenses")}
                    onCreated={(id) => router.push(`/expenses/${id}`)}
                  />
                ) : (
                  <ExpenseDetailContent
                    expenseId={expenseId!}
                    onClose={() => router.push("/expenses")}
                    onDeleted={handleDeleted}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  return <>{children}</>;
}
