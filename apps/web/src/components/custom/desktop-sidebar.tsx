import { useState } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth.provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const [collapsed, setCollapsed] = useState(false);

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
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center py-5",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        {collapsed ? (
          <Link
            to="/dashboard"
            className="grid size-9 place-items-center rounded-lg hover:bg-sidebar-accent/50"
            aria-label="Expenses dashboard"
          >
            <div className="size-7 rounded-lg bg-primary grid place-items-center">
              <Gem className="size-3.5 text-primary-foreground" />
            </div>
          </Link>
        ) : (
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <div className="size-7 rounded-lg bg-primary grid place-items-center">
              <Gem className="size-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Expenses
            </span>
          </Link>
        )}
      </div>

      <div className={cn("px-3 pb-3", collapsed && "px-2")}>
        <Button
          type="button"
          variant="ghost"
          size={collapsed ? "icon-sm" : "sm"}
          className={cn(
            "text-muted-foreground",
            collapsed ? "w-full" : "w-full justify-start",
          )}
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
          {!collapsed && <span>Collapse</span>}
        </Button>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 space-y-4 overflow-y-auto",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {navSections.map((section) => (
          <div key={section.label} className="space-y-1">
            <p
              className={cn(
                "px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60",
                collapsed && "sr-only",
              )}
            >
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center rounded-lg py-2 text-[13px] font-medium transition-colors",
                    collapsed ? "justify-center px-2" : "gap-2.5 px-2.5",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                  search={(prev) => prev}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon
                    className={cn("size-4", active && "text-primary")}
                  />
                  <span
                    className={cn(
                      "flex min-w-0 flex-1 items-center justify-between gap-2",
                      collapsed && "sr-only",
                    )}
                  >
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
      <div
        className={cn(
          "border-t border-sidebar-border py-3",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {user && (
          <Link
            to="/dashboard/profile"
            className={cn(
              "flex items-center rounded-lg py-2 transition-colors hover:bg-sidebar-accent/50",
              collapsed ? "justify-center px-2" : "gap-2.5 px-2.5",
            )}
            title={collapsed ? "Profile" : undefined}
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
            <div className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
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
