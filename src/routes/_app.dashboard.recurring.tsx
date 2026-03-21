import { CreateRecurringTransactionDialog } from "@/features/transactions/components/create-recurring-transaction.dialog";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/recurring")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <div className="flex justify-between">
        <h2>Recurring Transactions</h2>
        <CreateRecurringTransactionDialog />
      </div>
      <p>TODO: Render recurring transactions here...</p>
    </div>
  );
}
