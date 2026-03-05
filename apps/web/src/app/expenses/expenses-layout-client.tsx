"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import ExpensesContent from "./expenses-content";
import { ExpenseDetailContent } from "./[id]/expense-details-content";
import { ExpenseCreateContent } from "./expense-create-content";

const ExpensesPanelViewContext = createContext<{
  setIsFormView: (v: boolean) => void;
}>({ setIsFormView: () => {} });

export function useExpensesPanelFormView() {
  return useContext(ExpensesPanelViewContext);
}

export default function ExpensesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isFormView, setIsFormView] = useState(false);
  const isCreate = pathname === "/expenses/create";
  const isListOrDetail =
    pathname === "/expenses" || /^\/expenses\/\d+$/.test(pathname) || isCreate;
  const expenseIdMatch = pathname.match(/^\/expenses\/(\d+)$/);
  const expenseId = expenseIdMatch ? expenseIdMatch[1] : null;

  useEffect(() => {
    if (expenseId && !isCreate) setIsFormView(false);
  }, [expenseId, isCreate]);
  const showSidebar = !!expenseId || isCreate;

  const rightWidth = showSidebar && (isCreate || isFormView) ? "60%" : "40%";
  const leftWidth = showSidebar ? (rightWidth === "60%" ? "40%" : "60%") : "100%";
  const handleDeleted = () => router.push("/expenses");

  if (isListOrDetail) {
    return (
      <ExpensesPanelViewContext.Provider
        value={{ setIsFormView: useCallback((v: boolean) => setIsFormView(v), []) }}
      >
        <AppLayout>
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <div
              className={`flex min-w-0 flex-col overflow-hidden pt-4 ${showSidebar ? "flex-shrink-0 p-4" : "flex-1 p-4"}`}
              style={showSidebar ? { width: leftWidth } : undefined}
            >
              <ExpensesContent selectedExpenseId={expenseId ? Number(expenseId) : undefined} />
            </div>
            {showSidebar && (
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
      </ExpensesPanelViewContext.Provider>
    );
  }

  return <>{children}</>;
}
