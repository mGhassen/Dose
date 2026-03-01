"use client";

import { AppSidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import {
  SidebarInset,
  SidebarProvider,
} from "@kit/ui/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex h-[calc(100vh-1rem)] flex-col max-w-full overflow-hidden">
        <Navbar />
        <main className="flex-1 min-h-0 flex flex-col p-4 max-w-full overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}