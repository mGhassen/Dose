"use client";

import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const isSalesSplitView =
    pathname === "/sales" || /^\/sales\/\d+$/.test(pathname) || 
    pathname === "/expenses" || /^\/expenses\/\d+$/.test(pathname) ||
    pathname === "/variables" || /^\/variables\/\d+$/.test(pathname) || /^\/variables\/\d+\/edit$/.test(pathname) || /^\/variables\/\d+\/create$/.test(pathname);
  const isSplitView = isSalesSplitView;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex h-[calc(100vh-1rem)] flex-col max-w-full overflow-hidden">
        <Navbar />
        <main
          className={`flex-1 min-h-0 flex flex-col max-w-full overflow-hidden ${isSplitView ? "" : "p-4"}`}
        >
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}