import { Badge, badgeVariants } from "@/components/ui/badge.tsx";
import type { Tag } from "../tags.models.ts";
import { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.ts";

export type TagBadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    tag: Tag;
  };

export function TagBadge({
  tag,
  variant,
  className,
  children,
  ...props
}: TagBadgeProps) {
  return (
    <Badge
      className={cn(badgeVariants({ variant, className }), "select-none")}
      style={{
        color: tag.color || undefined,
        borderColor: tag.color ? `${tag.color}40` : undefined,
        backgroundColor: tag.color ? `${tag.color}10` : undefined,
      }}
      {...props}
    >
      {children}
    </Badge>
  );
}
