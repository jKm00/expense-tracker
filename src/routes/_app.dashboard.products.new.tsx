import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/products/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>New product page comming soon</div>;
}
