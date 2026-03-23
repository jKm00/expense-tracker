import { transactionQueries } from "@/features/transactions/transaction.queries";
import { EditTransactionForm } from "@/features/transactions/components/edit-transaction.form";
import { DeleteTransactionDialog } from "@/features/transactions/components/delete-transaction.alert";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeleton-form";
import { EmptyState } from "@/components/custom/empty-state";
import { getErrorMessage } from "@/utils/error-messages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { AlertTriangleIcon } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/transactions/$id")({
  loader: async ({ context, params }) => {
    const id = params.id;
    context.queryClient.prefetchQuery(
      transactionQueries.getTransactionOptions(id),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Edit Transaction" />
      <Suspense fallback={<SkeletonForm fields={5} />}>
        <TransactionDetail />
      </Suspense>
    </div>
  );
}

function TransactionDetail() {
  const { id } = Route.useParams();

  const { data } = useSuspenseQuery(
    transactionQueries.getTransactionOptions(id),
  );
  const [err, transactionWithProduct] = data;

  if (err) {
    return (
      <EmptyState
        message={getErrorMessage(err)}
        icon={AlertTriangleIcon}
      />
    );
  }

  const transaction = transactionWithProduct.transaction;
  const product = transactionWithProduct.product;

  return (
    <div className="space-y-6">
      {/* Read-only fields */}
      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Product</span>
            <span className="font-medium">{product?.name || "Unknown"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Source</span>
            <Badge variant="outline">{transaction.source}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Editable form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <EditTransactionForm transaction={transaction} />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteTransactionDialog id={id} />
        </CardContent>
      </Card>
    </div>
  );
}
