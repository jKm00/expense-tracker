import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderBackButton,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeletons/skeleton-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KpiCard } from "@/features/analytics/components/kpi-card";
import { LinkTagForm } from "@/features/products/components/link-tag.form";
import { DeleteProductDialog } from "@/features/products/components/delete-product.dialog";
import { ProductWithTag } from "@/features/products/products.models";
import { productQueries } from "@/features/products/products.queries";
import { tagsQueries } from "@/features/tags/tags.queries";
import { formatAmount } from "@/utils/format";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, ShoppingCart, SquarePen, Trash } from "lucide-react";
import { Suspense } from "react";

export const Route = createFileRoute("/_app/dashboard/products/$id/")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        productQueries.getProductOptions(params.id),
      ),
      context.queryClient.ensureQueryData(
        productQueries.getProductStatsOptions(params.id),
      ),
      context.queryClient.ensureQueryData(tagsQueries.getTagsOptions()),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return (
    <div className="space-y-6 @container">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>Product Details</PageHeaderTitle>
        <PageHeaderDescription>
          View details about this product
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/products/$id/edit" params={{ id }}>
              <SquarePen className="size-4" />
              <span className="@max-lg:sr-only">Edit</span>
            </Link>
          </Button>
          <DeleteProductDialog productId={id}>
            <Trash className="size-4" />
            <span className="@max-lg:sr-only">Delete</span>
          </DeleteProductDialog>
        </PageHeaderActions>
      </PageHeader>
      <Suspense fallback={<SkeletonForm fields={5} />}>
        <ProductDetails />
      </Suspense>
    </div>
  );
}

function ProductDetails() {
  const { id } = Route.useParams();
  const {
    data: [expectedProductError, product],
    error: unexpectedProductError,
  } = useSuspenseQuery(productQueries.getProductOptions(id));

  const {
    data: [expectedStatsError, stats],
    error: unexpectedStatsError,
  } = useSuspenseQuery(productQueries.getProductStatsOptions(id));

  if (unexpectedProductError || unexpectedStatsError) {
    return <UnexpectedError />;
  }

  if (expectedProductError || expectedStatsError) {
    const error = expectedProductError ?? expectedStatsError;
    if (!error) {
      return <UnexpectedError />;
    }

    let title: string;
    let message: string;

    const reason = error.reason;
    switch (reason) {
      case "PRODUCT_NOT_FOUND":
        title = "Product not found";
        message =
          "Product not found. Make sure the URL is correct with the correct product ID";
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

  const netValue = Number(stats.totalIncome) - Number(stats.totalSpent);
  const isNetPositive = netValue > 0;

  return (
    <div className="space-y-6 @container">
      <div className="grid gap-3 @xl:grid-cols-3">
        <KpiCard
          title="Purchases"
          value={`${stats.purchaseCount}`}
          subtitle="Transactions containing this product"
          icon={ShoppingCart}
        />
        <KpiCard
          title={isNetPositive ? "Income" : "Spent"}
          value={formatAmount(Math.abs(netValue))}
          subtitle="Net product value"
          icon={ShoppingCart}
          color={isNetPositive ? "income" : "expense"}
        />
        <KpiCard
          title="Last purchased"
          value={
            stats.lastPurchasedAt
              ? new Date(stats.lastPurchasedAt).toLocaleString("en-UK", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "Never"
          }
          subtitle="Most recent transaction"
          icon={Calendar}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            General information about the product
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Product name
            </Label>
            <Input
              defaultValue={product.name}
              readOnly
              className="bg-muted/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Aliases</Label>
            {product.aliases.length === 0 ? (
              <p className="text-sm text-muted-foreground">No aliases</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {product.aliases.map((alias) => (
                  <Badge key={alias.id} variant="secondary">
                    {alias.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Suspense>
        <LinkTagContent product={product} />
      </Suspense>
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
