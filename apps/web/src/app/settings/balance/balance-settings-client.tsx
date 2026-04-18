'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/app-layout';
import {
  useBalanceAccounts,
  useCreateBalanceAccount,
  useToast,
} from '@kit/hooks';
import { formatCurrency } from '@kit/lib';
import type { BalanceAccountKind } from '@kit/lib';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  Wallet,
  Plus,
  Loader2,
  ArrowRight,
  Banknote,
  Users,
  Landmark,
  Archive,
} from 'lucide-react';

const KIND_OPTIONS: Array<{
  value: BalanceAccountKind;
  label: string;
  description: string;
  icon: typeof Wallet;
}> = [
  {
    value: 'capital',
    label: 'Capital',
    description: 'Share capital contributions.',
    icon: Landmark,
  },
  {
    value: 'partner_account',
    label: 'Partner account',
    description: 'Current account (compte courant associé).',
    icon: Users,
  },
  {
    value: 'cash',
    label: 'Cash',
    description: 'Physical cash not in a bank.',
    icon: Banknote,
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Money outside accounting, misc.',
    icon: Wallet,
  },
];

function kindMeta(kind: BalanceAccountKind) {
  return KIND_OPTIONS.find((o) => o.value === kind) ?? KIND_OPTIONS[3];
}

export function BalanceSettingsClient() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data: accounts, isLoading } = useBalanceAccounts({ includeArchived });
  const createMutation = useCreateBalanceAccount();
  const { toast } = useToast();

  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<BalanceAccountKind>('capital');
  const [currency, setCurrency] = useState('EUR');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName('');
    setKind('capital');
    setCurrency('EUR');
    setNotes('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        kind,
        currency: currency.trim() || 'EUR',
        notes: notes.trim() || null,
      });
      toast({ title: 'Balance account created' });
      resetForm();
      setOpenCreate(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create balance account';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const list = accounts ?? [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Balance</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Capital, partner accounts, cash and other financial buckets outside accounting.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={includeArchived ? 'secondary' : 'outline'}
              onClick={() => setIncludeArchived((v) => !v)}
            >
              <Archive className="h-4 w-4 mr-2" />
              {includeArchived ? 'Hide archived' : 'Show archived'}
            </Button>
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New balance account
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <Wallet className="h-10 w-10 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium">No balance accounts yet</p>
                <p className="text-sm text-muted-foreground">
                  Create one to track capital, partner accounts, cash, or anything outside accounting.
                </p>
              </div>
              <Button onClick={() => setOpenCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create balance account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((acc) => {
              const meta = kindMeta(acc.kind);
              const Icon = meta.icon;
              const bal = acc.balance ?? 0;
              return (
                <Link
                  key={acc.id}
                  href={`/settings/balance/${acc.id}`}
                  className="block"
                >
                  <Card className="hover:border-primary/50 transition-colors h-full">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-muted">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{acc.name}</p>
                            <p className="text-xs text-muted-foreground">{meta.label}</p>
                          </div>
                        </div>
                        {acc.archived_at ? (
                          <Badge variant="outline">Archived</Badge>
                        ) : null}
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Balance</p>
                          <p className={`text-2xl font-semibold ${bal < 0 ? 'text-destructive' : ''}`}>
                            {formatCurrency(bal)}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{acc.movements_count ?? 0} movements</p>
                          <p className="flex items-center gap-1 text-foreground mt-1">
                            Open
                            <ArrowRight className="h-3 w-3" />
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <Dialog
          open={openCreate}
          onOpenChange={(o) => {
            setOpenCreate(o);
            if (!o) resetForm();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New balance account</DialogTitle>
              <DialogDescription>
                Track a pool of money outside your bank / accounting lines.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bal-name">Name *</Label>
                <Input
                  id="bal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Founder capital, Partner A, Till"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Kind *</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as BalanceAccountKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KIND_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <div>
                          <p>{o.label}</p>
                          <p className="text-xs text-muted-foreground">{o.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bal-currency">Currency</Label>
                <Input
                  id="bal-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bal-notes">Notes</Label>
                <Textarea
                  id="bal-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
