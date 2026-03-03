import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { prefetchExpense } from "@kit/hooks";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  if (!id || id.trim() === "") return null;
  const queryClient = await prefetchExpense(id);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {null}
    </HydrationBoundary>
  );
}
