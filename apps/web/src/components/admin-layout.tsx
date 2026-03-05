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
  const isSplitView =
    pathname === "/sales" || pathname === "/sales/create" || /^\/sales\/\d+(\/edit)?$/.test(pathname) ||
    pathname === "/expenses" || pathname === "/expenses/create" || /^\/expenses\/\d+(\/edit)?$/.test(pathname) ||
    pathname === "/variables" || pathname === "/variables/create" || /^\/variables\/\d+(\/edit)?$/.test(pathname);

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