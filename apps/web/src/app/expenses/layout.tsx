import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { makeQueryClient } from "@kit/lib/queryClient.server";
import ExpensesLayoutClient from "./expenses-layout-client";

export default function ExpensesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = makeQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ExpensesLayoutClient>{children}</ExpensesLayoutClient>
    </HydrationBoundary>
  );
}
