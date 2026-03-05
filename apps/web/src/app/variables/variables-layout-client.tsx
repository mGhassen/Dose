"use client";

import { usePathname, useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import VariablesContent from "./variables-content";
import { VariableCreateContent } from "@/app/variables/variable-create-content";
import { VariableDetailContent } from "@/app/variables/variable-detail-content";

export default function VariablesLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isCreate = pathname === "/variables/create";
  const idMatch = pathname.match(/^\/variables\/(\d+)(?:\/edit)?$/);
  const variableId = idMatch ? idMatch[1] : null;
  const isEdit = pathname.endsWith("/edit");
  const isListOrPanel =
    pathname === "/variables" || isCreate || (variableId !== null);
  const showPanel = isCreate || variableId !== null;
  const panelIsCreateOrEdit = isCreate || isEdit;
  const rightWidth = showPanel ? (panelIsCreateOrEdit ? "60%" : "40%") : "0";
  const leftWidth = showPanel ? (panelIsCreateOrEdit ? "40%" : "60%") : "100%";

  const handleDeleted = () => router.push("/variables");

  if (isListOrPanel) {
    return (
      <AppLayout>
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            className={`flex min-w-0 flex-col overflow-hidden pt-4 ${showPanel ? "flex-shrink-0 p-4" : "flex-1 p-4"}`}
            style={showPanel ? { width: leftWidth } : undefined}
          >
            <VariablesContent selectedVariableId={variableId ? Number(variableId) : undefined} />
          </div>
          {showPanel && (
            <div
              className="flex h-full min-w-0 flex-shrink-0 flex-col overflow-hidden border-l border-border bg-card"
              style={{ width: rightWidth }}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-6">
                {isCreate ? (
                  <VariableCreateContent
                    onClose={() => router.push("/variables")}
                    onCreated={(id: number) => router.push(`/variables/${id}`)}
                  />
                ) : variableId ? (
                  <VariableDetailContent
                    variableId={variableId}
                    initialEditMode={isEdit}
                    onClose={() => router.push("/variables")}
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
