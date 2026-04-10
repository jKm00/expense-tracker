import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Package, Repeat, Tag } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/more")({
  component: RouteComponent,
});

function RouteComponent() {
  const menuItems = [
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">More</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Additional features and settings
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        {menuItems.map((item, idx) => (
          <Link key={item.label} to={item.href} className="block">
            <div
              className={`flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 ${idx !== menuItems.length - 1 ? "border-b border-border/40" : ""}`}
            >
              <item.icon className="size-5 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground/50" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
