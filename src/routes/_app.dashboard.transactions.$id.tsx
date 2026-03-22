import { transactionQueries } from "@/features/transactions/transaction.queries";
import { EditTransactionForm } from "@/features/transactions/components/edit-transaction.form";
import { DeleteTransactionDialog } from "@/features/transactions/components/delete-transaction.alert";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

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
    <Suspense fallback={<p>Loading...</p>}>
      <TransactionDetail />
    </Suspense>
  );
}

function TransactionDetail() {
  const { id } = Route.useParams();

  const { data } = useSuspenseQuery(
    transactionQueries.getTransactionOptions(id),
  );
  const [err, transactionWithProduct] = data;

  if (err) {
    const reason = err.reason;
    switch (reason) {
      case "TRANSACTION_NOT_FOUND":
        return <p>Transaction not found</p>;
      case "TRANSACTION_FORBIDDEN":
        return <p>You do not have access to this transaction</p>;
      default:
        return <p>Something went wrong</p>;
    }
  }

  const transaction = transactionWithProduct.transaction;
  const product = transactionWithProduct.product;

  return (
    <div>
      <h2>Edit Transaction</h2>

      {/* Read-only fields */}
      <div>
        <p>
          <strong>Source:</strong> {transaction.source}
        </p>
        <p>
          <strong>Product:</strong> {product?.name || "Unknown"}
        </p>
      </div>

      {/* Editable form */}
      <EditTransactionForm transaction={transaction} />

      {/* Danger Zone */}
      <div>
        <h3>Danger Zone</h3>
        <DeleteTransactionDialog id={id} />
      </div>
    </div>
  );
}
