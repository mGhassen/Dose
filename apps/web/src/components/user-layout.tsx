"use client";

import { UserSidebar } from "@/components/user-sidebar";
import { Navbar } from "@/components/navbar";
import {
  SidebarInset,
  SidebarProvider,
} from "@kit/ui/sidebar";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <UserSidebar />
      <SidebarInset className="flex flex-col min-h-screen max-w-full overflow-hidden">
        <Navbar />
        <main className="flex-1 p-6 max-w-full overflow-hidden">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
