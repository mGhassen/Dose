import { BalanceAccountDetailClient } from './balance-account-detail-client';

export default async function BalanceAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BalanceAccountDetailClient id={id} />;
}
