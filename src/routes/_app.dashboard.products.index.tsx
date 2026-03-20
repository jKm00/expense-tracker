import { ProductWithTags } from "@/features/products/product.models";
import { productQueries } from "@/features/products/product.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/products/")({
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      productQueries.getProductsOptions(),
    );
    await context.queryClient.prefetchQuery(
      productQueries.getProductsOptions({
        excludeTaggedProducts: true,
      }),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="grid gap-4">
      <Suspense fallback={<p>Loading untagged products...</p>}>
        <UntaggedProductList />
      </Suspense>
      <Suspense fallback={<p>Loading all products...</p>}>
        <AllProductList />
      </Suspense>
    </div>
  );
}

function UntaggedProductList() {
  const { data, error } = useSuspenseQuery(
    productQueries.getProductsOptions({
      excludeTaggedProducts: true,
    }),
  );

  return (
    <div>
      <h2>Untagged products</h2>
      <ProductList data={data} error={error} />
    </div>
  );
}

function AllProductList() {
  const { data, error } = useSuspenseQuery(productQueries.getProductsOptions());

  return (
    <div>
      <h2>All products</h2>
      <ProductList data={data} error={error} />
    </div>
  );
}

type ProductListProps = {
  data: [{ reason: string } | null, ProductWithTags[] | null];
  error: Error | null;
};

function ProductList({ data, error }: ProductListProps) {
  if (error) return <p>error 1</p>;

  const [err, products] = data;

  if (err || !products) return <p>error 2: {JSON.stringify(err)}</p>;

  return (
    <div className="flex flex-col">
      {products.map((product) => (
        <Link
          key={product.id}
          to="/dashboard/products/$productId"
          params={{ productId: product.id }}
        >
          {product.name}
        </Link>
      ))}
    </div>
  );
}
