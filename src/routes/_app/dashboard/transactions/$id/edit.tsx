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
import { SquarePen } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/transactions/$id/edit")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Edit Transaction</PageHeaderTitle>
        <PageHeaderDescription>
          Modify transaction details
        </PageHeaderDescription>
      </PageHeader>
      <EmptyState icon={SquarePen}>
        <EmptyStateMessage>Edit functionality coming soon</EmptyStateMessage>
      </EmptyState>
    </div>
  );
}
