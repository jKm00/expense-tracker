import { AddRecurringForm } from "@/features/recurring/components/add-recurring.form";
import { PageHeader } from "@/components/custom/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/recurring/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Recurring" />
      <Card>
        <CardHeader>
          <CardTitle>Create Recurring Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <AddRecurringForm />
        </CardContent>
      </Card>
    </div>
  );
}
