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
  const isListOrDetail =
    pathname === "/sales" || /^\/sales\/\d+$/.test(pathname) || isCreate;
  const saleIdMatch = pathname.match(/^\/sales\/(\d+)$/);
  const saleId = saleIdMatch ? saleIdMatch[1] : null;
  const showSidebar = !!saleId || isCreate;

  const handleDeleted = () => router.push("/sales");

  if (isListOrDetail) {
    return (
      <AppLayout>
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            className={`flex flex-1 min-w-0 flex-col overflow-hidden pt-4 ${showSidebar ? "p-4" : "p-4"}`}
          >
            <SalesContent selectedSaleId={saleId ? Number(saleId) : undefined} />
          </div>
          {showSidebar && (
            <div className="flex h-full w-[420px] min-w-[320px] max-w-[min(480px,40vw)] flex-shrink-0 flex-col overflow-hidden border-l border-border bg-card lg:w-[480px]">
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
    );
  }

  return <>{children}</>;
}
