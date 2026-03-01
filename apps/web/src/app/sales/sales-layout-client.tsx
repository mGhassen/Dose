"use client";

import { usePathname, useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import SalesContent from "./sales-content";
import { SaleDetailContent } from "./sale-detail-content";

export default function SalesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isListOrDetail =
    pathname === "/sales" || /^\/sales\/\d+$/.test(pathname);
  const saleIdMatch = pathname.match(/^\/sales\/(\d+)$/);
  const saleId = saleIdMatch ? saleIdMatch[1] : null;

  const handleDeleted = () => router.push("/sales");

  if (isListOrDetail) {
    return (
      <AppLayout>
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            className={`flex-1 min-w-0 overflow-hidden pt-4 ${saleId ? "pr-6" : ""}`}
          >
            <SalesContent selectedSaleId={saleId ? Number(saleId) : undefined} />
          </div>
          {saleId && (
            <div className="flex w-full flex-shrink-0 flex-col overflow-hidden border-l border-border bg-card sm:w-[420px] lg:w-[480px]">
              <div className="flex flex-1 flex-col overflow-hidden px-6 py-6">
                <SaleDetailContent
                  saleId={saleId}
                  onClose={() => router.push("/sales")}
                  onDeleted={handleDeleted}
                />
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  return <>{children}</>;
}
