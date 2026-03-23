import { Link, useLocation } from "@tanstack/react-router";
import {
  HomeIcon,
  ReceiptTextIcon,
  PackageIcon,
  RepeatIcon,
  UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/dashboard", icon: HomeIcon },
  { label: "Transactions", href: "/dashboard/transactions", icon: ReceiptTextIcon },
  { label: "Products", href: "/dashboard/products", icon: PackageIcon },
  { label: "Recurring", href: "/dashboard/recurring", icon: RepeatIcon },
  { label: "Profile", href: "/dashboard/profile", icon: UserIcon },
] as const;

export function MobileNav() {
  const location = useLocation();

  function isActive(href: string): boolean {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/dashboard/";
    }
    return location.pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full text-xs transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
