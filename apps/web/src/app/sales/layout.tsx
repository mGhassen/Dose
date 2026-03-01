import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchSales } from '@kit/hooks';
import SalesLayoutClient from './sales-layout-client';

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = await prefetchSales(undefined, { page: 1, limit: 1000 });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SalesLayoutClient>{children}</SalesLayoutClient>
    </HydrationBoundary>
  );
}
