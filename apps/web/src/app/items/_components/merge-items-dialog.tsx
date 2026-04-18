"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@kit/ui/dialog";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { RadioGroup, RadioGroupItem } from "@kit/ui/radio-group";
import { Badge } from "@kit/ui/badge";
import { useCreateItemGroup, useUpdateItemGroup } from "@kit/hooks";
import type { Item } from "@kit/types";

interface MergeItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  onMerged?: (groupId: number) => void;
}

export default function MergeItemsDialog({
  open,
  onOpenChange,
  items,
  onMerged,
}: MergeItemsDialogProps) {
  const createGroup = useCreateItemGroup();
  const updateGroup = useUpdateItemGroup();

  const existingGroupIds = useMemo(
    () => [...new Set(items.map((i) => i.groupId).filter((g): g is number => !!g))],
    [items]
  );
  const hasExistingGroup = existingGroupIds.length > 0;
  const hasMultipleExistingGroups = existingGroupIds.length > 1;

  const defaultCanonical = useMemo(() => {
    const canonical = items.find((i) => i.isCanonical);
    if (canonical) return canonical.id;
    return items[0]?.id ?? null;
  }, [items]);

  const [canonicalId, setCanonicalId] = useState<number | null>(defaultCanonical);
  const canonicalItem = items.find((i) => i.id === canonicalId);
  const [name, setName] = useState<string>("");

  const effectiveName = name.trim() || canonicalItem?.name || "Merged item";

  const reset = () => {
    setCanonicalId(defaultCanonical);
    setName("");
  };

  const handleSubmit = async () => {
    if (canonicalId == null) {
      toast.error("Pick a canonical item");
      return;
    }
    if (hasMultipleExistingGroups) {
      toast.error("Selected items belong to different existing groups. Unmerge one of them first.");
      return;
    }
    try {
      if (hasExistingGroup) {
        const existingGroupId = existingGroupIds[0]!;
        const newMemberIds = items
          .map((i) => i.id)
          .filter((id) => !items.find((it) => it.id === id)?.groupId);
        if (newMemberIds.length > 0) {
          await updateGroup.mutateAsync({
            id: existingGroupId,
            data: { addMemberIds: newMemberIds },
          });
        }
        const currentGroupCanonical = items.find(
          (i) => i.groupId === existingGroupId && i.isCanonical
        );
        if (
          canonicalId !== currentGroupCanonical?.id &&
          items.find((i) => i.id === canonicalId)
        ) {
          await updateGroup.mutateAsync({
            id: existingGroupId,
            data: { canonicalItemId: canonicalId },
          });
        }
        if (name.trim() && name.trim() !== currentGroupCanonical?.groupName) {
          await updateGroup.mutateAsync({
            id: existingGroupId,
            data: { name: name.trim() },
          });
        }
        toast.success("Items absorbed into existing group");
        onMerged?.(existingGroupId);
      } else {
        const group = await createGroup.mutateAsync({
          name: effectiveName,
          canonicalItemId: canonicalId,
          memberItemIds: items.map((i) => i.id),
        });
        toast.success(`Merged ${items.length} items`);
        onMerged?.(group.id);
      }
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to merge items");
    }
  };

  const pending = createGroup.isPending || updateGroup.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge items</DialogTitle>
          <DialogDescription>
            Pick which item stays as the canonical. All selected items keep their own data
            (Square sync, history, stock movements). The canonical item&apos;s detail page
            aggregates data from all members.
          </DialogDescription>
        </DialogHeader>

        {hasMultipleExistingGroups && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Selected items belong to more than one existing group. Unmerge one group before
            merging them together.
          </div>
        )}

        {hasExistingGroup && !hasMultipleExistingGroups && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            One or more items already belong to a group. The others will be absorbed into it.
          </div>
        )}

        <div className="space-y-2">
          <Label>Group name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={canonicalItem?.name || "Group name"}
          />
          <p className="text-xs text-muted-foreground">Defaults to the canonical item&apos;s name.</p>
        </div>

        <div className="space-y-2">
          <Label>Canonical item (kept as the primary)</Label>
          <RadioGroup
            value={canonicalId != null ? String(canonicalId) : ""}
            onValueChange={(v) => setCanonicalId(Number(v))}
          >
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-3 rounded-md border border-border p-2"
              >
                <RadioGroupItem value={String(it.id)} id={`merge-canonical-${it.id}`} />
                <Label
                  htmlFor={`merge-canonical-${it.id}`}
                  className="flex-1 flex items-center gap-2 cursor-pointer"
                >
                  <span className="font-medium">{it.name}</span>
                  {it.sku && <span className="text-xs text-muted-foreground">({it.sku})</span>}
                  {it.groupId && (
                    <Badge variant="outline" className="text-xs">
                      in group {it.groupName || `#${it.groupId}`}
                    </Badge>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pending || canonicalId == null || hasMultipleExistingGroups}
          >
            {pending ? "Merging..." : hasExistingGroup ? "Absorb into group" : "Merge items"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
