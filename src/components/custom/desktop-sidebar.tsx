import { Link, useLocation } from "@tanstack/react-router";
import {
  HomeIcon,
  ReceiptTextIcon,
  PackageIcon,
  RepeatIcon,
  ChartPie,
  Tag,
  Gem,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth.provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
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
  { label: "Products", href: "/dashboard/products", icon: PackageIcon },
  { label: "Recurring", href: "/dashboard/recurring", icon: RepeatIcon },
  { label: "Tags", href: "/dashboard/tags", icon: Tag },
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
      <nav className="flex-1 px-3 space-y-0.5">
        <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Menu
        </p>
        {navItems.map((item) => {
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
              <item.icon className={cn("size-4", active && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
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
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
