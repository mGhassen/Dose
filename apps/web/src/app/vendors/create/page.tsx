"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateVendorPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to suppliers page (vendors have been merged into suppliers)
    router.replace("/inventory-suppliers/create");
  }, [router]);

  return null;
}
