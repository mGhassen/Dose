"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Badge } from "@kit/ui/badge";
import { Label } from "@kit/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kit/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@kit/ui/radio-group";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useItemGroup, useUpdateItemGroup, useDeleteItemGroup } from "@kit/hooks";
import { Users, Crown, Link as LinkIcon, Trash2, Edit3, X } from "lucide-react";

interface MergedItemsCardProps {
  groupId: number;
}

export default function MergedItemsCard({ groupId }: MergedItemsCardProps) {
  const { data: group, isLoading } = useItemGroup(groupId);
  const updateGroup = useUpdateItemGroup();
  const deleteGroup = useDeleteItemGroup();

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [canonicalOpen, setCanonicalOpen] = useState(false);
  const [newCanonicalId, setNewCanonicalId] = useState<number | null>(null);
  const [unmergeAllOpen, setUnmergeAllOpen] = useState(false);
  const [removeMemberId, setRemoveMemberId] = useState<number | null>(null);

  if (isLoading || !group) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Merged items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const members = group.members || [];

  const handleRename = async () => {
    const name = renameValue.trim();
    if (!name) return;
    try {
      await updateGroup.mutateAsync({ id: groupId, data: { name } });
      toast.success("Group renamed");
      setRenameOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to rename group");
    }
  };

  const handleChangeCanonical = async () => {
    if (newCanonicalId == null) return;
    try {
      await updateGroup.mutateAsync({
        id: groupId,
        data: { canonicalItemId: newCanonicalId },
      });
      toast.success("Canonical item updated");
      setCanonicalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to change canonical");
    }
  };

  const handleRemoveMember = async () => {
    if (removeMemberId == null) return;
    try {
      await updateGroup.mutateAsync({
        id: groupId,
        data: { removeMemberIds: [removeMemberId] },
      });
      toast.success("Item removed from group");
      setRemoveMemberId(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove item");
    }
  };

  const handleUnmergeAll = async () => {
    try {
      await deleteGroup.mutateAsync(groupId);
      toast.success("Group unmerged");
      setUnmergeAllOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to unmerge group");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Merged duplicates
              </CardTitle>
              <CardDescription>
                {members.length} items are treated as the same logical product. Each keeps its own
                data and Square sync; this page aggregates them.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRenameValue(group.name);
                  setRenameOpen(true);
                }}
              >
                <Edit3 className="mr-2 h-3 w-3" />
                Rename
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewCanonicalId(group.canonicalItemId);
                  setCanonicalOpen(true);
                }}
              >
                <Crown className="mr-2 h-3 w-3" />
                Change canonical
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setUnmergeAllOpen(true)}
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Unmerge all
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Group name: <span className="font-medium text-foreground">{group.name}</span>
          </div>
          <div className="divide-y divide-border rounded-md border border-border">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  {m.id === group.canonicalItemId ? (
                    <Badge variant="default" className="text-xs gap-1">
                      <Crown className="h-3 w-3" />
                      Canonical
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs gap-1">
                      <LinkIcon className="h-3 w-3" />
                      Merged
                    </Badge>
                  )}
                  <Link
                    href={`/items/${m.id}`}
                    className="font-medium hover:underline"
                  >
                    {m.name}
                  </Link>
                  {m.sku && (
                    <span className="text-xs text-muted-foreground">({m.sku})</span>
                  )}
                </div>
                {m.id !== group.canonicalItemId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoveMemberId(m.id)}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Unmerge
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename group</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Group name</Label>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={updateGroup.isPending || !renameValue.trim()}>
              {updateGroup.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={canonicalOpen} onOpenChange={setCanonicalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change canonical item</DialogTitle>
            <DialogDescription>
              Pick which item becomes the primary one. The detail page aggregation follows the
              canonical.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={newCanonicalId != null ? String(newCanonicalId) : ""}
            onValueChange={(v) => setNewCanonicalId(Number(v))}
          >
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-md border border-border p-2"
              >
                <RadioGroupItem value={String(m.id)} id={`new-canonical-${m.id}`} />
                <Label
                  htmlFor={`new-canonical-${m.id}`}
                  className="flex-1 cursor-pointer flex items-center gap-2"
                >
                  <span className="font-medium">{m.name}</span>
                  {m.id === group.canonicalItemId && (
                    <Badge variant="outline" className="text-xs">current</Badge>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCanonicalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleChangeCanonical}
              disabled={
                updateGroup.isPending ||
                newCanonicalId == null ||
                newCanonicalId === group.canonicalItemId
              }
            >
              {updateGroup.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={unmergeAllOpen}
        onOpenChange={setUnmergeAllOpen}
        title="Unmerge all items?"
        description={`This will dissolve the group. The ${members.length} items will become independent again. No item data will be deleted.`}
        confirmText="Unmerge"
        onConfirm={handleUnmergeAll}
        isPending={deleteGroup.isPending}
        variant="destructive"
      />

      <ConfirmationDialog
        open={removeMemberId != null}
        onOpenChange={(v) => !v && setRemoveMemberId(null)}
        title="Remove this item from the group?"
        description="The item becomes independent again. No data is deleted."
        confirmText="Unmerge"
        onConfirm={handleRemoveMember}
        isPending={updateGroup.isPending}
        variant="destructive"
      />
    </>
  );
}
