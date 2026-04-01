import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/transactions/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Transaction list page comming soon</div>;
}
