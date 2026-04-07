import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";
import { EditProductForm } from "@/features/products/components/edit-product.form";
import { productQueries } from "@/features/products/products.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/products/$productId")({
  loader: async ({ context, params }) => {
    context.queryClient.prefetchQuery(
      productQueries.getProductOptions(params.productId),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Product Details</h1>
      <p className="text-sm text-muted-foreground mb-4">
        View and edit the details about the product
      </p>
      <Suspense fallback={<SkeletonForm fields={1} />}>
        <EditProductContent />
      </Suspense>
    </div>
  );
}

function EditProductContent() {
  const { productId } = Route.useParams();
  const {
    data: [expectedError, product],
    error: unexpectedError,
  } = useSuspenseQuery(productQueries.getProductOptions(productId));

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    let title: string;
    let message: string;

    const reason = expectedError.reason;
    switch (reason) {
      case "PRODUCT_NOT_FOUND":
        title = "Product not found";
        message = `Product not found. Make sure the URL is correct with the correct product ID`;
        break;
      case "PRODUCT_UNAUTHORIZED":
        title = "Unauthorized";
        message = "You do not have permission to view this product!";
        break;
      case "UNEXPECTED_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch the product from the database. Please try again!";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happened: ${reason satisfies never}. Please try again!`;
        break;
    }

    return (
      <ExpectedError>
        <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
        <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return <EditProductForm product={product} />;
}
