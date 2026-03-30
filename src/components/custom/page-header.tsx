export function PageHeader({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="@container">
      <div className="flex @max-lg:flex-col gap-2 items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {action}
        {children}
      </div>
    </div>
  );
}
