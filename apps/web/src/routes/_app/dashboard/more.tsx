import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
} from "@/components/custom/page-header";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Package, Repeat, Tag, User } from "lucide-react";

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
    },
    {
      label: "Recurring",
      description: "Track recurring expenses",
      href: "/dashboard/recurring",
      icon: Repeat,
    },
    {
      label: "Tags",
      description: "Organize with categories",
      href: "/dashboard/tags",
      icon: Tag,
    },
  ];

  const secondaryMenuItems = [
    {
      label: "Automation",
      description: "Manage import tokens",
      href: "/dashboard/automations",
      icon: Bot,
    },
    {
      label: "Profile",
      description: "Manage your account",
      href: "/dashboard/profile",
      icon: User,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>More</PageHeaderTitle>
        <PageHeaderDescription>
          Additional features and settings
        </PageHeaderDescription>
      </PageHeader>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        {mainMenuItems.map((item, idx) => (
          <Link key={item.label} to={item.href} className="block">
            <div
              className={`flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 ${idx !== mainMenuItems.length - 1 ? "border-b border-border/40" : ""}`}
            >
              <div className="grid size-8 place-items-center rounded-lg bg-muted">
                <item.icon className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground/50" />
            </div>
          </Link>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        {secondaryMenuItems.map((item, idx) => (
          <Link key={item.label} to={item.href} className="block">
            <div
              className={`flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 ${idx !== secondaryMenuItems.length - 1 ? "border-b border-border/40" : ""}`}
            >
              <div className="grid size-8 place-items-center rounded-lg bg-muted">
                <item.icon className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground/50" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
