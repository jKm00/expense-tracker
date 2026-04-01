import { Link, useLocation } from "@tanstack/react-router";
import {
  HomeIcon,
  ReceiptTextIcon,
  PackageIcon,
  RepeatIcon,
  ChartPie,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth.provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

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
    <aside className="flex flex-col w-60 border-r bg-background h-screen sticky top-0">
      {/* App title */}
      <div className="p-4">
        <h2 className="text-lg font-semibold tracking-tight">Expenses</h2>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* User info + actions */}
      <div className="p-4">
        {user && (
          <Link to="/dashboard/profile" className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage
                src={user.image ?? undefined}
                alt={user.name ?? ""}
              />
              <AvatarFallback>
                {user.name?.charAt(0).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate">{user.name}</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
