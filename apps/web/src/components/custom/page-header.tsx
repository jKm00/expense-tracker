import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  const backButton = filterChildren(children, [PageHeaderBackButton]);
  const titleArea = filterChildren(children, [PageHeaderTitle, PageHeaderDescription]);
  const actions = filterChildren(children, [PageHeaderActions]);

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1 flex items-start">
        {backButton}
        <div className="min-w-0 flex-1">{titleArea}</div>
      </div>
      {actions}
    </div>
  );
}

export function PageHeaderBackButton({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="md:hidden flex items-center justify-center -ml-1 mr-2 shrink-0 size-8 rounded-md hover:bg-accent"
      aria-label="Go back"
    >
      <ArrowLeft className="size-4" />
    </Link>
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
