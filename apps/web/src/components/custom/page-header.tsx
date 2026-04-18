import React from "react";

export function PageHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">{filterChildren(children, [PageHeaderTitle, PageHeaderDescription])}</div>
      {filterChildren(children, [PageHeaderActions])}
    </div>
  );
}

export function PageHeaderTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
      {children}
    </h1>
  );
}

export function PageHeaderDescription({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="mt-1 text-sm text-muted-foreground">{children}</p>
  );
}

export function PageHeaderActions({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex items-center gap-2 shrink-0">{children}</div>;
}

function filterChildren(
  children: React.ReactNode,
  types: React.ComponentType<any>[],
) {
  return React.Children.toArray(children).filter((child) =>
    React.isValidElement(child) && types.includes(child.type as any),
  );
}
