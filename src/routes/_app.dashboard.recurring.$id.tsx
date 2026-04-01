import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/recurring/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Recurring details page comming soon</div>;
}
