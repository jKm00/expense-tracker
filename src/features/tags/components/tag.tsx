import { Badge, badgeVariants } from "@/components/ui/badge.tsx";
import type { Tag } from "../tags.models.ts";
import { VariantProps } from "class-variance-authority";

export type TagBadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    tag: Tag;
  };

export function TagBadge({ tag, children, ...props }: TagBadgeProps) {
  return (
    <Badge
      style={{
        color: tag.color || undefined,
        borderColor: tag.color || undefined,
        backgroundColor: tag.color ? `${tag.color}10` : undefined,
      }}
      {...props}
    >
      {children}
    </Badge>
  );
}
