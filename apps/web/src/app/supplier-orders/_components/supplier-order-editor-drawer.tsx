"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import type { SupplierOrder } from "@kit/types";
import { SupplierOrderEditor, type SupplierOrderEditorSubmit } from "./supplier-order-editor";

export function SupplierOrderEditorDrawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: SupplierOrder;
  onSubmit: (payload: SupplierOrderEditorSubmit) => Promise<void> | void;
  saving?: boolean;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className="max-w-none w-[96vw] sm:w-[760px] md:w-[920px] h-[100vh] sm:h-[100vh] p-0 overflow-hidden sm:rounded-none sm:!left-auto sm:!right-0 sm:!translate-x-0"
      >
        <div className="h-full flex flex-col">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Edit supplier order</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <SupplierOrderEditor
              mode="edit"
              initialOrder={props.order}
              onCancel={() => props.onOpenChange(false)}
              onSubmit={props.onSubmit}
              submitLabel={props.saving ? "Saving..." : "Save changes"}
              className="pb-10"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

