import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/products/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Products page comming soon</div>;
}
