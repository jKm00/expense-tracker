import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/products/$productId")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Edit Product</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Edit the details of your product
      </p>
    </div>
  );
}
