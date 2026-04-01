import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/recurring/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>New recurring page comming soon</div>;
}
