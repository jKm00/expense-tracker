import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/transactions/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Transaction details page comming soon</div>;
}
