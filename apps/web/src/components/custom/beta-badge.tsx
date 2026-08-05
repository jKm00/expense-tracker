import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BetaBadgeProps = {
  enabled: boolean;
  className?: string;
};

export function BetaBadge({ enabled, className }: BetaBadgeProps) {
  if (!enabled) {
    return null;
  }

  return (
    <Badge
      className={cn(
        "bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
    >
      Beta
    </Badge>
  );
}
