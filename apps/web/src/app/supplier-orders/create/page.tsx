"use client";

import { useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { useCreateSupplierOrder } from "@kit/hooks";
import { toast } from "sonner";
import { SupplierOrderEditor } from "../_components/supplier-order-editor";

export default function CreateSupplierOrderPage() {
  const router = useRouter();
  const createOrder = useCreateSupplierOrder();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create supplier order</h1>
          <p className="text-muted-foreground">Create a new supplier order and line items</p>
        </div>

        <SupplierOrderEditor
          mode="create"
          onCancel={() => router.push("/supplier-orders")}
          onSubmit={async (payload) => {
            if (payload.kind !== "create") return;
            try {
              const created = await createOrder.mutateAsync(payload.data);
              toast.success("Supplier order created");
              router.push(`/supplier-orders/${created.id}`);
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

