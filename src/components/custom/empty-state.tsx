import { Card, CardContent } from "@/components/ui/card";

function EmptyState({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-6 text-center">
        <Icon className="size-12 text-muted-foreground mb-4" />
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyStateMessage({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}

function EmptyStateAction({ children }: { children: React.ReactNode }) {
  return <div className="mt-4">{children}</div>;
}

export { EmptyState, EmptyStateMessage, EmptyStateAction };
