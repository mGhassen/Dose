"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";

interface ExpenseTimelinePageProps {
  params: Promise<{ id: string }>;
}

export default function ExpenseTimelinePage({ params }: ExpenseTimelinePageProps) {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to subscriptions timeline since expenses don't have timelines anymore
    params.then(() => {
      router.replace('/subscriptions/timeline');
    });
  }, [router, params]);

  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    </AppLayout>
  );
}
