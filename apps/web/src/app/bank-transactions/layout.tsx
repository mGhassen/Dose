import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { makeQueryClient } from "@kit/lib/queryClient.server";
import BankTransactionsLayoutClient from "./bank-transactions-layout-client";

export default function BankTransactionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = makeQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BankTransactionsLayoutClient>{children}</BankTransactionsLayoutClient>
    </HydrationBoundary>
  );
}

