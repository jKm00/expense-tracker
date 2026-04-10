import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/recurring/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Recurring list page comming soon</div>;
}
