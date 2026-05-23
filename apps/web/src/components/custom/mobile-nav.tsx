import { Link, useLocation } from "@tanstack/react-router";
import {
  HomeIcon,
  ReceiptTextIcon,
  ShoppingBag,
  ChartPie,
  Ellipsis,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/dashboard", icon: HomeIcon },
  { label: "Shopping", href: "/dashboard/shopping", icon: ShoppingBag },
  {
    label: "Transactions",
    href: "/dashboard/transactions",
    icon: ReceiptTextIcon,
  },
  { label: "Analytics", href: "/dashboard/analytics", icon: ChartPie },
  { label: "More", href: "/dashboard/more", icon: Ellipsis },
] as const;

export function MobileNav() {
  const location = useLocation();

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/80 backdrop-blur-xl pb-6">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground",
              )}
            >
              <item.icon
                className={cn("size-[18px]", active && "text-primary")}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
