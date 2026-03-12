"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
        <Image src="/logo_light.png" alt="Dose" width={160} height={52} className="mx-auto mb-2 h-12 w-auto dark:hidden" priority />
        <Image src="/logo_dark.png" alt="Dose" width={160} height={52} className="mx-auto mb-2 h-12 w-auto hidden dark:block" priority />
        <p className="text-muted-foreground">Financial planning and budget management application</p>
        <div className="mt-4">
          <span className="text-lg text-muted-foreground">Loading...</span>
        </div>
      </div>
    </div>
  );
}
