import { PageHeader } from "@/components/custom/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Package, Repeat } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/more")({
  component: RouteComponent,
});

function RouteComponent() {
  const menuItems = [
    {
      label: "Products",
      href: "/dashboard/products",
      icon: Package,
    },
    {
      label: "Recurring",
      href: "/dashboard/recurring",
      icon: Repeat,
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="More pages" />
      <ul className="space-y-2">
        {menuItems.map((item) => (
          <li key={item.label}>
            <Link to={item.href}>
              <Card>
                <CardContent className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <item.icon className="size-5" />
                    <h3>{item.label}</h3>
                  </div>
                  <ArrowRight className="size-5" />
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
