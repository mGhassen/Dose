"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import SalesContent from "./sales-content";
import { SaleDetailContent } from "./sale-detail-content";
import { SaleCreateContent } from "./sale-create-content";

const SalesPanelViewContext = createContext<{
  setIsFormView: (v: boolean) => void;
}>({ setIsFormView: () => {} });

export function useSalesPanelFormView() {
  return useContext(SalesPanelViewContext);
}

export default function SalesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isFormView, setIsFormView] = useState(false);
  const isCreate = pathname === "/sales/create";
  const isListOrDetail =
    pathname === "/sales" || /^\/sales\/\d+$/.test(pathname) || isCreate;
  const saleIdMatch = pathname.match(/^\/sales\/(\d+)$/);
  const saleId = saleIdMatch ? saleIdMatch[1] : null;

  useEffect(() => {
    if (saleId && !isCreate) setIsFormView(false);
  }, [saleId, isCreate]);
  const showSidebar = !!saleId || isCreate;

  const rightWidth = showSidebar && (isCreate || isFormView) ? "60%" : "40%";
  const leftWidth = showSidebar ? (rightWidth === "60%" ? "40%" : "60%") : "100%";

  const handleDeleted = () => router.push("/sales");
  const setIsFormViewCb = useCallback((v: boolean) => setIsFormView(v), []);

  if (isListOrDetail) {
    return (
      <SalesPanelViewContext.Provider
        value={{ setIsFormView: setIsFormViewCb }}
      >
        <AppLayout>
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <div
              className={`flex min-w-0 flex-col overflow-hidden pt-4 ${showSidebar ? "flex-shrink-0 p-4" : "flex-1 p-4"}`}
              style={showSidebar ? { width: leftWidth } : undefined}
            >
              <SalesContent selectedSaleId={saleId ? Number(saleId) : undefined} />
            </div>
            {showSidebar && (
              <div
                className="flex h-full min-w-0 flex-shrink-0 flex-col overflow-hidden border-l border-border bg-card"
                style={{ width: rightWidth }}
              >
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-6">
                  {isCreate ? (
                    <SaleCreateContent
                      onClose={() => router.push("/sales")}
                      onCreated={(id) => router.push(`/sales/${id}`)}
                    />
                  ) : (
                    <SaleDetailContent
                      saleId={saleId!}
                      onClose={() => router.push("/sales")}
                      onDeleted={handleDeleted}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </AppLayout>
      </SalesPanelViewContext.Provider>
    );
  }

  return <>{children}</>;
}
