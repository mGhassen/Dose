"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EditSalePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    if (id) router.replace(`/sales/${id}`);
  }, [id, router]);

  return null;
}
