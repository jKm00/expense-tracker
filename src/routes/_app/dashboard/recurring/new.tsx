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

export const Route = createFileRoute("/_app/dashboard/recurring/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>New Recurring</PageHeaderTitle>
        <PageHeaderDescription>
          Set up a new recurring transaction
        </PageHeaderDescription>
      </PageHeader>
      <EmptyState icon={Repeat}>
        <EmptyStateMessage>Coming soon</EmptyStateMessage>
      </EmptyState>
    </div>
  );
}
