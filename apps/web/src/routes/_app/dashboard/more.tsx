import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { Badge } from "@/components/ui/badge";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Package, Plug, Repeat, Tag, User, type LucideIcon } from "lucide-react";

type MoreMenuItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  version?: string;
};

export const Route = createFileRoute("/_app/dashboard/more")({
  component: RouteComponent,
});

function RouteComponent() {
  const mainMenuItems = [
    {
      label: "Products",
      description: "Manage your product catalog",
      href: "/dashboard/products",
      icon: Package,
      version: undefined,
    },
    {
      label: "Recurring",
      description: "Track recurring expenses",
      href: "/dashboard/recurring",
      icon: Repeat,
      version: undefined,
    },
    {
      label: "Tags",
      description: "Organize with categories",
      href: "/dashboard/tags",
      icon: Tag,
      version: undefined,
    },
  ] as const;

  const secondaryMenuItems = [
    {
      label: "Integrations",
      description: "Manage import tokens",
      href: "/dashboard/integrations",
      icon: Plug,
      version: undefined,
    },
    {
      label: "Profile",
      description: "Manage your account",
      href: "/dashboard/profile",
      icon: User,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>More</PageHeaderTitle>
        <PageHeaderDescription>
          Additional features and settings
        </PageHeaderDescription>
      </PageHeader>
      <MoreMenuSection items={mainMenuItems} />
      <MoreMenuSection items={secondaryMenuItems} />
    </div>
  );
}

function MoreMenuSection({ items }: { items: readonly MoreMenuItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      {items.map((item, idx) => (
        <Link key={item.label} to={item.href} className="block">
          <div
            className={`flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 ${idx !== items.length - 1 ? "border-b border-border/40" : ""}`}
          >
            <div className="grid size-8 place-items-center rounded-lg bg-muted">
              <item.icon className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  {item.label}
                </p>
                {item.version ? (
                  <Badge
                    variant="outline"
                    className="h-5 rounded-md px-1.5 text-[10px]"
                  >
                    {item.version.toUpperCase()}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground/50" />
          </div>
        </Link>
      ))}
    </div>
  );
}
