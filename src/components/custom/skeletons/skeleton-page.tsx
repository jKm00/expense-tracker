import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonPage({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      {children ?? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
