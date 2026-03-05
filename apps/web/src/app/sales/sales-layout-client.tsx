"use client";

import { usePathname, useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import SalesContent from "./sales-content";
import { SaleDetailContent } from "./sale-detail-content";
import { SaleCreateContent } from "./sale-create-content";

export default function SalesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isCreate = pathname === "/sales/create";
  const idMatch = pathname.match(/^\/sales\/(\d+)(?:\/edit)?$/);
  const saleId = idMatch ? idMatch[1] : null;
  const isEdit = pathname.endsWith("/edit");
  const isListOrPanel =
    pathname === "/sales" || isCreate || saleId !== null;
  const showPanel = isCreate || saleId !== null;
  const rightWidth = showPanel ? "40%" : "0";
  const leftWidth = showPanel ? "60%" : "100%";

  const handleDeleted = () => router.push("/sales");

  if (isListOrPanel) {
    return (
      <AppLayout>
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            className={`flex min-w-0 flex-col overflow-hidden pt-4 ${showPanel ? "flex-shrink-0 p-4" : "flex-1 p-4"}`}
            style={showPanel ? { width: leftWidth } : undefined}
          >
            <SalesContent selectedSaleId={saleId ? Number(saleId) : undefined} />
          </div>
          {showPanel && (
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
                ) : saleId ? (
                  <SaleDetailContent
                    saleId={saleId}
                    initialEditMode={isEdit}
                    onClose={() => router.push("/sales")}
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
