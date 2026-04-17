import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";
import { EditProductForm } from "@/features/products/components/edit-product.form";
import { LinkTagForm } from "@/features/products/components/link-tag.form";
import { DeleteProductDialog } from "@/features/products/components/delete-product.dialog";
import { ProductWithTag } from "@/features/products/products.models";
import { productQueries } from "@/features/products/products.queries";
import { tagsQueries } from "@/features/tags/tags.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/products/$productId")({
  loader: async ({ context, params }) => {
    context.queryClient.prefetchQuery(
      productQueries.getProductOptions(params.productId),
    );
    context.queryClient.prefetchQuery(tagsQueries.getTagsOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Product Details</PageHeaderTitle>
        <PageHeaderDescription>
          View and edit the details about the product
        </PageHeaderDescription>
      </PageHeader>
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

  return (
    <div className="space-y-8">
      <EditProductForm product={product} />
      <Suspense>
        <LinkTagContent product={product} />
      </Suspense>
      <div className="pt-4 border-t border-border">
        <DeleteProductDialog productId={product.id}>
          Delete product
        </DeleteProductDialog>
      </div>
    </div>
  );
}

function LinkTagContent({ product }: { product: ProductWithTag }) {
  const {
    data: [expectedError, tags],
    error: unexpectedError,
  } = useSuspenseQuery(tagsQueries.getTagsOptions());

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    let title: string;
    let message: string;

    const reason = expectedError.reason;
    switch (reason) {
      case "UNEXPECTED_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch tags from the database. Please try again!";
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

  return <LinkTagForm product={product} tags={tags} />;
}
