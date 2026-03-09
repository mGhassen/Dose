"use client";

import { usePathname, useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import TaxRulesContent from "./tax-rules-content";
import { TaxRuleCreateContent } from "./tax-rule-create-content";
import { TaxRuleDetailContent } from "./tax-rule-detail-content";

export default function TaxRulesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isCreate = pathname === "/tax-rules/create";
  const idMatch = pathname.match(/^\/tax-rules\/(\d+)(?:\/edit)?$/);
  const ruleId = idMatch ? idMatch[1] : null;
  const isEdit = pathname.endsWith("/edit");
  const isListOrPanel =
    pathname === "/tax-rules" || isCreate || ruleId !== null;
  const showPanel = isCreate || ruleId !== null;
  const panelIsCreateOrEdit = isCreate || isEdit;
  const rightWidth = showPanel ? (panelIsCreateOrEdit ? "50%" : "50%") : "0";
  const leftWidth = showPanel ? (panelIsCreateOrEdit ? "50%" : "50%") : "100%";

  const handleDeleted = () => router.push("/tax-rules");

  if (isListOrPanel) {
    return (
      <AppLayout>
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            className={`flex min-w-0 flex-col overflow-hidden pt-4 ${showPanel ? "flex-shrink-0 p-4" : "flex-1 p-4"}`}
            style={showPanel ? { width: leftWidth } : undefined}
          >
            <TaxRulesContent selectedRuleId={ruleId ? Number(ruleId) : undefined} />
          </div>
          {showPanel && (
            <div
              className="flex h-full min-w-0 flex-shrink-0 flex-col overflow-hidden border-l border-border bg-card"
              style={{ width: rightWidth }}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-6">
                {isCreate ? (
                  <TaxRuleCreateContent
                    onClose={() => router.push("/tax-rules")}
                    onCreated={(id: number) => router.push(`/tax-rules/${id}`)}
                  />
                ) : ruleId ? (
                  <TaxRuleDetailContent
                    ruleId={ruleId}
                    initialEditMode={isEdit}
                    onClose={() => router.push("/tax-rules")}
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
