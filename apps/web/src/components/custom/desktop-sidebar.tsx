import { Link, useLocation } from "@tanstack/react-router";
import {
  HomeIcon,
  ReceiptTextIcon,
  ShoppingBag,
  PackageIcon,
  RepeatIcon,
  Plug,
  ChartPie,
  Tag,
  Gem,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth.provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const navSections = [
  {
    label: "Activity",
    items: [
      { label: "Home", href: "/dashboard", icon: HomeIcon },
      {
        label: "Transactions",
        href: "/dashboard/transactions",
        icon: ReceiptTextIcon,
      },
      {
        label: "Analytics",
        href: "/dashboard/analytics",
        icon: ChartPie,
      },
      {
        label: "Shopping",
        href: "/dashboard/shopping",
        icon: ShoppingBag,
      },
    ],
  },
  {
    label: "Organize",
    items: [
      { label: "Products", href: "/dashboard/products", icon: PackageIcon },
      { label: "Recurring", href: "/dashboard/recurring", icon: RepeatIcon },
      { label: "Tags", href: "/dashboard/tags", icon: Tag },
    ],
  },
  {
    label: "Configurations",
    items: [
      {
        label: "Integrations",
        href: "/dashboard/integrations",
        icon: Plug,
      },
      {
        label: "Settings",
        href: "/dashboard/profile",
        icon: Settings,
      },
    ],
  },
] as const;

export function DesktopSidebar() {
  const location = useLocation();
  const { user } = useAuth();

  function isActive(href: string): boolean {
    if (href === "/dashboard") {
      return (
        location.pathname === "/dashboard" ||
        location.pathname === "/dashboard/"
      );
    }
    return location.pathname.startsWith(href);
  }

  return (
    <aside className="flex flex-col w-60 border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
      {/* Brand */}
      <div className="px-4 py-5">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-primary grid place-items-center">
            <Gem className="size-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Expenses
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label} className="space-y-1">
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                  search={(prev) => prev}
                >
                  <item.icon
                    className={cn("size-4", active && "text-primary")}
                  />
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate">{item.label}</span>
                    {item.alpha ? (
                      <Badge
                        variant="secondary"
                        className="h-5 rounded-md px-1.5 text-[10px]"
                      >
                        ALPHA
                      </Badge>
                    ) : item.beta ? (
                      <Badge
                        variant="secondary"
                        className="h-5 rounded-md px-1.5 text-[10px]"
                      >
                        BETA
                      </Badge>
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border px-3 py-3">
        {user && (
          <Link
            to="/dashboard/profile"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-sidebar-accent/50"
          >
            <Avatar className="size-7">
              <AvatarImage
                src={user.image ?? undefined}
                alt={user.name ?? ""}
              />
              <AvatarFallback className="text-xs font-medium">
                {user.name?.charAt(0).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium truncate text-sidebar-foreground">
                {user.name}
              </p>
              <p className="text-[11px] text-muted-foreground">Profile</p>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
