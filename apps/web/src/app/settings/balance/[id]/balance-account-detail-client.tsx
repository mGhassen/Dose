'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/app-layout';
import {
  useBalanceAccount,
  useBalanceAccountMovements,
  useCreateBalanceMovement,
  useDeleteBalanceMovement,
  useUpdateBalanceAccount,
  useDeleteBalanceAccount,
  useAllocateBankToBalance,
  useBankTransactions,
  useToast,
} from '@kit/hooks';
import { formatCurrency } from '@kit/lib';
import { formatDate } from '@kit/lib/date-format';
import type { BalanceAccountKind } from '@kit/lib';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  ArrowLeft,
  Plus,
  Loader2,
  Trash2,
  Link2,
  Archive,
  ArchiveRestore,
  ExternalLink,
} from 'lucide-react';

const KIND_LABELS: Record<BalanceAccountKind, string> = {
  capital: 'Capital',
  partner_account: 'Partner account',
  cash: 'Cash',
  other: 'Other',
};

interface Props {
  id: string;
}

export function BalanceAccountDetailClient({ id }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: account, isLoading } = useBalanceAccount(id);
  const { data: movements } = useBalanceAccountMovements(id);

  const createMovement = useCreateBalanceMovement();
  const deleteMovement = useDeleteBalanceMovement();
  const updateAccount = useUpdateBalanceAccount();
  const deleteAccount = useDeleteBalanceAccount();
  const allocateBank = useAllocateBankToBalance();

  const [openMovement, setOpenMovement] = useState(false);
  const [openLinkBank, setOpenLinkBank] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [confirmDeleteMovementId, setConfirmDeleteMovementId] = useState<number | null>(null);

  const [occurredOn, setOccurredOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');

  const [bankTxSearch, setBankTxSearch] = useState('');
  const [selectedBankTxId, setSelectedBankTxId] = useState<number | null>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkNotes, setLinkNotes] = useState('');

  const { data: bankTxs } = useBankTransactions({
    reconciled: 'none',
    limit: 50,
    q: bankTxSearch || undefined,
    sort_by: 'execution_date',
    sort_order: 'desc',
  });

  const bankTxList = useMemo(() => {
    const arr = bankTxs?.data ?? [];
    if (!account) return arr;
    return arr.filter((t) => t.account_id === account.account_id);
  }, [bankTxs, account]);

  const balance = account?.balance ?? 0;

  const resetMovementForm = () => {
    setOccurredOn(new Date().toISOString().slice(0, 10));
    setAmount('');
    setLabel('');
    setNotes('');
  };

  const resetLinkForm = () => {
    setBankTxSearch('');
    setSelectedBankTxId(null);
    setLinkLabel('');
    setLinkNotes('');
  };

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (Number.isNaN(amt) || amt === 0) {
      toast({ title: 'Amount must be a non-zero number', variant: 'destructive' });
      return;
    }
    try {
      await createMovement.mutateAsync({
        id,
        data: {
          occurred_on: occurredOn,
          amount: amt,
          label: label.trim() || null,
          notes: notes.trim() || null,
        },
      });
      toast({ title: 'Movement added' });
      resetMovementForm();
      setOpenMovement(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add movement';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleLinkBankTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBankTxId) {
      toast({ title: 'Pick a bank transaction', variant: 'destructive' });
      return;
    }
    try {
      await allocateBank.mutateAsync({
        bankTxId: selectedBankTxId,
        data: {
          balance_account_id: Number(id),
          label: linkLabel.trim() || null,
          notes: linkNotes.trim() || null,
        },
      });
      toast({ title: 'Bank transaction linked' });
      resetLinkForm();
      setOpenLinkBank(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to link bank transaction';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleDeleteMovement = async (movementId: number) => {
    try {
      await deleteMovement.mutateAsync(movementId);
      toast({ title: 'Movement deleted' });
      setConfirmDeleteMovementId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete movement';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleToggleArchive = async () => {
    if (!account) return;
    try {
      await updateAccount.mutateAsync({
        id,
        data: { archived_at: account.archived_at ? null : new Date().toISOString() },
      });
      toast({ title: account.archived_at ? 'Restored' : 'Archived' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update balance account';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await deleteAccount.mutateAsync(id);
      if (res && typeof res === 'object' && 'softDeleted' in res) {
        toast({
          title: 'Archived',
          description: `Account has ${res.movementsCount} movements and was archived instead.`,
        });
      } else {
        toast({ title: 'Deleted' });
      }
      router.push('/settings/balance');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete balance account';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setConfirmDeleteAccount(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!account) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Button variant="ghost" asChild>
            <Link href="/settings/balance">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <p className="text-muted-foreground">Balance account not found.</p>
        </div>
      </AppLayout>
    );
  }

  const movs = movements ?? [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings/balance">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Balance
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setOpenLinkBank(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              Link bank transaction
            </Button>
            <Button onClick={() => setOpenMovement(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add movement
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{account.name}</h1>
                  <Badge variant="secondary">{KIND_LABELS[account.kind]}</Badge>
                  {account.archived_at ? <Badge variant="outline">Archived</Badge> : null}
                </div>
                {account.notes ? (
                  <p className="text-sm text-muted-foreground max-w-2xl">{account.notes}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Current balance ({account.currency})</p>
                <p className={`text-3xl font-semibold ${balance < 0 ? 'text-destructive' : ''}`}>
                  {formatCurrency(balance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {movs.length} movements
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleArchive}
                disabled={updateAccount.isPending}
              >
                {account.archived_at ? (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Restore
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDeleteAccount(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Movements</h2>
            {movs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No movements yet. Add one manually or link a bank transaction.
              </p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Bank tx</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movs.map((m) => {
                      const amt = Number(m.amount);
                      return (
                        <TableRow key={m.id}>
                          <TableCell>{formatDate(m.occurred_on)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{m.label || '—'}</p>
                              {m.notes ? (
                                <p className="text-xs text-muted-foreground">{m.notes}</p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            {m.bank_transaction_id ? (
                              <Link
                                href={`/bank-transactions?id=${m.bank_transaction_id}`}
                                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                              >
                                #{m.bank_transaction_id}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground">manual</span>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${amt < 0 ? 'text-destructive' : ''}`}
                          >
                            {formatCurrency(amt)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setConfirmDeleteMovementId(m.id)}
                              className="h-7 w-7"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={openMovement}
          onOpenChange={(o) => {
            setOpenMovement(o);
            if (!o) resetMovementForm();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add movement</DialogTitle>
              <DialogDescription>
                Positive credits the account, negative debits it.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateMovement} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mov-date">Date *</Label>
                <Input
                  id="mov-date"
                  type="date"
                  value={occurredOn}
                  onChange={(e) => setOccurredOn(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mov-amount">Amount * ({account.currency})</Label>
                <Input
                  id="mov-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1000 or -250.50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mov-label">Label</Label>
                <Input
                  id="mov-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Initial contribution"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mov-notes">Notes</Label>
                <Textarea
                  id="mov-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenMovement(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMovement.isPending}>
                  {createMovement.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    'Add movement'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={openLinkBank}
          onOpenChange={(o) => {
            setOpenLinkBank(o);
            if (!o) resetLinkForm();
          }}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Link a bank transaction</DialogTitle>
              <DialogDescription>
                Reconcile an unreconciled bank transaction into this balance account. The movement
                will use the bank transaction&apos;s amount and date.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLinkBankTx} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bnk-search">Search</Label>
                <Input
                  id="bnk-search"
                  value={bankTxSearch}
                  onChange={(e) => setBankTxSearch(e.target.value)}
                  placeholder="Label or counterparty…"
                />
              </div>
              <div className="space-y-2">
                <Label>Pick a transaction *</Label>
                <div className="rounded-lg border max-h-72 overflow-auto">
                  {bankTxList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No unreconciled bank transactions.
                    </p>
                  ) : (
                    <Table>
                      <TableBody>
                        {bankTxList.map((t) => {
                          const amt = Number(t.amount);
                          const selected = selectedBankTxId === t.id;
                          return (
                            <TableRow
                              key={t.id}
                              onClick={() => setSelectedBankTxId(t.id)}
                              className={`cursor-pointer ${selected ? 'bg-accent' : ''}`}
                            >
                              <TableCell className="w-[110px] text-xs">
                                {formatDate(t.execution_date)}
                              </TableCell>
                              <TableCell>
                                <p className="text-sm truncate">{t.label || '—'}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {t.counterparty_name || ''}
                                </p>
                              </TableCell>
                              <TableCell
                                className={`text-right font-medium w-[120px] ${amt < 0 ? 'text-destructive' : ''}`}
                              >
                                {formatCurrency(amt)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-label">Label (override)</Label>
                <Input
                  id="link-label"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="Defaults to bank transaction label"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-notes">Notes</Label>
                <Textarea
                  id="link-notes"
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenLinkBank(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={allocateBank.isPending || !selectedBankTxId}
                >
                  {allocateBank.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Linking…
                    </>
                  ) : (
                    'Link transaction'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={confirmDeleteAccount}
          onOpenChange={setConfirmDeleteAccount}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete balance account?</AlertDialogTitle>
              <AlertDialogDescription>
                If this account has movements it will be archived instead of permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={confirmDeleteMovementId != null}
          onOpenChange={(o) => {
            if (!o) setConfirmDeleteMovementId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete movement?</AlertDialogTitle>
              <AlertDialogDescription>
                If linked to a bank transaction, the link will be cleared and the bank transaction
                will become unreconciled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  confirmDeleteMovementId != null && handleDeleteMovement(confirmDeleteMovementId)
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
