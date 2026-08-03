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
  const style = {
    color: tag.color || undefined,
    borderColor: tag.color ? `${tag.color}40` : undefined,
    backgroundColor: tag.color ? `${tag.color}10` : undefined,
  };

  if (props.onClick) {
    const actionProps = props as React.ComponentProps<"button">;

    return (
      <Badge
        asChild
        variant={variant}
        className={cn("select-none", className)}
        style={style}
      >
        <button type="button" {...actionProps}>
          {children}
        </button>
      </Badge>
    );
  }

  return (
    <Badge
      variant={variant}
      className={cn("select-none", className)}
      style={style}
      {...props}
    >
      {children}
    </Badge>
  );
}
