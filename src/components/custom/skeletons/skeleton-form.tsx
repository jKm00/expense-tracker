import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <Card>
      <CardContent className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-6 max-w-30" />
            <Skeleton className="h-10" />
          </div>
        ))}
        <Skeleton className="h-10 max-w-40" />
      </CardContent>
    </Card>
  );
}
