import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/custom/page-header";
import { EditProductForm } from "@/features/products/components/edit-product.form";
import { productQueries } from "@/features/products/products.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/products/$id/edit")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      productQueries.getProductOptions(params.id),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>Edit Product</PageHeaderTitle>
        <PageHeaderDescription>Modify product details</PageHeaderDescription>
      </PageHeader>
      <Suspense fallback={null}>
        <EditProductFormWrapper />
      </Suspense>
    </div>
  );
}

function EditProductFormWrapper() {
  const { id } = Route.useParams();
  const {
    data: [expectedError, product],
    error: unexpectedError,
  } = useSuspenseQuery(productQueries.getProductOptions(id));

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
        message = "The product you are trying to edit does not exist.";
        break;
      case "PRODUCT_UNAUTHORIZED":
        title = "Unauthorized";
        message = "You do not have permission to edit this product.";
        break;
      case "PRODUCT_DB_ERROR":
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
