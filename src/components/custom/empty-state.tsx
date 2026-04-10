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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30 px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon
          className={`${size === "sm" ? "size-3" : size === "md" ? "size-4" : size === "lg" ? "size-5" : "size-5"} text-muted-foreground`}
        />
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function EmptyStateMessage({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function EmptyStateAction({ children }: { children: React.ReactNode }) {
  return <div className="mt-4">{children}</div>;
}

export { EmptyState, EmptyStateMessage, EmptyStateAction };
