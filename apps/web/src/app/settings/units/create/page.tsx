"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/app-layout";
import { UnifiedSelector } from "@/components/unified-selector";
import { useCreateUnit, useUnits } from "@kit/hooks";
import { toast } from "sonner";

const DIMENSIONS = [
  { id: "mass", name: "Mass" },
  { id: "volume", name: "Volume" },
  { id: "count", name: "Count" },
  { id: "other", name: "Other" },
];

export default function CreateUnitPage() {
  const router = useRouter();
  const createUnit = useCreateUnit();
  const { data: units } = useUnits();
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    dimension: "other",
    baseUnitId: null as number | null,
    factorToBase: "1",
  });

  const baseUnitOptions = (units || []).filter((u) => u.dimension === formData.dimension && !u.baseUnitId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.symbol?.trim()) {
      toast.error("Name and symbol are required");
      return;
    }
    const factor = parseFloat(formData.factorToBase);
    if (isNaN(factor) || factor <= 0) {
      toast.error("Factor must be a positive number");
      return;
    }
    try {
      await createUnit.mutateAsync({
        name: formData.name.trim(),
        symbol: formData.symbol.trim(),
        dimension: formData.dimension,
        baseUnitId: formData.baseUnitId,
        factorToBase: factor,
      });
      toast.success("Unit created");
      router.push("/settings/units");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create unit");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings/units">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Add unit</h1>
            <p className="text-muted-foreground">Define a new unit and its relation to a base unit</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Unit</CardTitle>
            <CardDescription>Symbol must be unique. Base unit and factor define conversion (e.g. 1 kg = 1000 g).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Kilogram" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol *</Label>
                  <Input id="symbol" value={formData.symbol} onChange={(e) => setFormData((p) => ({ ...p, symbol: e.target.value }))} placeholder="e.g. kg" required />
                </div>
                <div className="space-y-2">
                  <Label>Dimension</Label>
                  <UnifiedSelector
                    type="dimension"
                    items={DIMENSIONS}
                    selectedId={formData.dimension}
                    onSelect={(item) => setFormData((p) => ({ ...p, dimension: String(item.id), baseUnitId: null }))}
                    placeholder="Select dimension"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Base unit (optional)</Label>
                  <UnifiedSelector
                    type="unit"
                    items={baseUnitOptions.map((u) => ({ id: u.id, name: `${u.symbol} (${u.name})` }))}
                    selectedId={formData.baseUnitId ?? undefined}
                    onSelect={(item) => setFormData((p) => ({ ...p, baseUnitId: item.id === 0 ? null : (item.id as number) }))}
                    placeholder="Same dimension base unit"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="factor">Factor to base *</Label>
                  <Input id="factor" type="number" step="any" min="0.00000001" value={formData.factorToBase} onChange={(e) => setFormData((p) => ({ ...p, factorToBase: e.target.value }))} placeholder="1" required />
                  <p className="text-xs text-muted-foreground">Quantity × factor = amount in base unit (e.g. 1000 for kg when base is g)</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createUnit.isPending}>
                  {createUnit.isPending ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/settings/units">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
