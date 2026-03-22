import { CreateProductForm } from "@/features/products/components/create-product.form";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/products/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <h2>Create Product</h2>
      <CreateProductForm />
    </div>
  );
}
