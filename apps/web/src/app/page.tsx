"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@kit/hooks";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/auth/login");
    } else {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Dose</h1>
        <p className="text-muted-foreground">Financial planning and budget management application</p>
        <div className="mt-4">
          <span className="text-lg text-muted-foreground">Loading...</span>
        </div>
      </div>
    </div>
  );
}
