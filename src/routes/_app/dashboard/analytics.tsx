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
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/analytics")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>Analytics</PageHeaderTitle>
        <PageHeaderDescription>
          Insights into your spending habits
        </PageHeaderDescription>
      </PageHeader>
      <EmptyState icon={BarChart3}>
        <EmptyStateMessage>Analytics coming soon</EmptyStateMessage>
      </EmptyState>
    </div>
  );
}
