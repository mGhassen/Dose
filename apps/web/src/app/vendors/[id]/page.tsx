"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function VendorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    // Redirect to supplier page (vendors have been merged into suppliers)
    if (id) {
      router.replace(`/inventory-suppliers/${id}`);
    } else {
      router.replace("/inventory-suppliers");
    }
  }, [router, id]);

  return null;
}
