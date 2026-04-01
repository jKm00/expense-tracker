import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/products/$productId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Product details page comming soon</div>;
}
