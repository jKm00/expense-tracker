import { Card, CardContent } from "@/components/ui/card";

function EmptyState({
  icon: Icon,
  size,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-6 text-center">
        <Icon
          className={`${size === "sm" ? "size-3" : size === "md" ? "size-5" : size === "lg" ? "size-8" : size === "xl" ? "size-12" : "size-12"} text-muted-foreground mb-4`}
        />
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
