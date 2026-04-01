import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-md" />
    </div>
  );
}
