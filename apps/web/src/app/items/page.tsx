"use client";

import AppLayout from "@/components/app-layout";
import ItemsContent from "./items-content";

export default function ItemsPage() {
  return (
    <AppLayout>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
          <ItemsContent />
        </div>
      </div>
    </AppLayout>
  );
}

