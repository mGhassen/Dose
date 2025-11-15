"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AppLayout from "@/components/app-layout";

export default function PaymentsPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to output payments by default
    router.replace('/payments/output');
  }, [router]);

  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    </AppLayout>
  );
}

