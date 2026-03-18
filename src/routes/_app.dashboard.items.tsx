import { itemQueries } from "@/features/items/item.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/items")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(itemQueries.getItemsOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <h1>Items</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <ItemList />
      </Suspense>
    </div>
  );
}

function ItemList() {
  const { data, error } = useSuspenseQuery(itemQueries.getItemsOptions());

  if (error) return <p>error 1</p>;

  const [err, items] = data;

  if (err) return <p>error 2</p>;

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
