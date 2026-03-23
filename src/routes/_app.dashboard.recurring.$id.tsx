import { recurringQueries } from "@/features/recurring/recurring.queries";
import { EditRecurringForm } from "@/features/recurring/components/edit-recurring.form";
import { DeleteRecurringProductDialog } from "@/features/recurring/components/delete-recurring.alert";
import { PageHeader } from "@/components/custom/page-header";
import { SkeletonForm } from "@/components/custom/skeleton-form";
import { EmptyState } from "@/components/custom/empty-state";
import { getErrorMessage } from "@/utils/error-messages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { AlertTriangleIcon } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/recurring/$id")({
  loader: async ({ context, params }) => {
    const id = params.id;
    context.queryClient.prefetchQuery(
      recurringQueries.getRecurringProductOptions(id),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Recurring Details" />
      <Suspense fallback={<SkeletonForm fields={6} />}>
        <RecurringProduct />
      </Suspense>
    </div>
  );
}

function RecurringProduct() {
  const { id } = Route.useParams();

  const { data } = useSuspenseQuery(
    recurringQueries.getRecurringProductOptions(id),
  );
  const [err, recurring] = data;

  if (err) {
    return (
      <EmptyState
        message={getErrorMessage(err)}
        icon={AlertTriangleIcon}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Edit Recurring Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Recurring</CardTitle>
        </CardHeader>
        <CardContent>
          <EditRecurringForm recurring={recurring} />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteRecurringProductDialog id={id} />
        </CardContent>
      </Card>
    </div>
  );
}
