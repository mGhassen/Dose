import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import SalesLayoutClient from './sales-layout-client';

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = makeQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SalesLayoutClient>{children}</SalesLayoutClient>
    </HydrationBoundary>
  );
}
