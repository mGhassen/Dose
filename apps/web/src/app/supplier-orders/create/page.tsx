"use client";

import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { useCreateSupplierOrder } from "@kit/hooks";
import { SupplierOrderStatus } from "@kit/types";
import { toast } from "sonner";
import { SupplierOrderEditor } from "../_components/supplier-order-editor";

export default function CreateSupplierOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createOrder = useCreateSupplierOrder();
  const supplierIdParam = searchParams.get("supplierId");
  const initialSupplierId = supplierIdParam ? Number(supplierIdParam) : null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create supplier order</h1>
          <p className="text-muted-foreground">Create a new supplier order and line items</p>
        </div>

        <SupplierOrderEditor
          mode="create"
          initialSupplierId={Number.isFinite(initialSupplierId) && initialSupplierId && initialSupplierId > 0 ? initialSupplierId : undefined}
          onCancel={() => router.push("/supplier-orders")}
          onSubmit={async (payload) => {
            if (payload.kind !== "create") return;
            try {
              const wantsDeliver = payload.data.status === SupplierOrderStatus.DELIVERED;
              const dataToSave = wantsDeliver
                ? { ...payload.data, status: SupplierOrderStatus.PENDING }
                : payload.data;
              const created = await createOrder.mutateAsync(dataToSave);
              toast.success("Supplier order created");
              router.push(`/supplier-orders/${created.id}${wantsDeliver ? "?receive=1" : ""}`);
            } catch (error: any) {
              toast.error(error?.message || "Failed to create supplier order");
            }
          }}
          submitLabel={createOrder.isPending ? "Creating..." : "Create order"}
        />
      </div>
    </AppLayout>
  );
}

