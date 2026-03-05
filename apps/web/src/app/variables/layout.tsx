import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { makeQueryClient } from "@kit/lib/queryClient.server";
import VariablesLayoutClient from "./variables-layout-client";

export default function VariablesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = makeQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <VariablesLayoutClient>{children}</VariablesLayoutClient>
    </HydrationBoundary>
  );
}
