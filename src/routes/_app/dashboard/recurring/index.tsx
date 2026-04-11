import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import {
  EmptyState,
  EmptyStateMessage,
} from "@/components/custom/empty-state";
import { createFileRoute } from "@tanstack/react-router";
import { Repeat } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/recurring/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Recurring</PageHeaderTitle>
        <PageHeaderDescription>
          Track recurring expenses and subscriptions
        </PageHeaderDescription>
      </PageHeader>
      <EmptyState icon={Repeat}>
        <EmptyStateMessage>Recurring transactions coming soon</EmptyStateMessage>
      </EmptyState>
    </div>
  );
}
