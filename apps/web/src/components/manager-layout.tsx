"use client";

import { ManagerSidebar } from "@/components/manager-sidebar";
import { Navbar } from "@/components/navbar";
import {
  SidebarInset,
  SidebarProvider,
} from "@kit/ui/sidebar";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <ManagerSidebar />
      <SidebarInset className="flex h-[calc(100vh-1rem)] flex-col max-w-full overflow-hidden">
        <Navbar />
        <main className="flex-1 min-h-0 flex flex-col p-4 max-w-full overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-auto">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
