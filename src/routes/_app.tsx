import { Button } from "@/components/ui/button";
import { AuthProvider } from "@/features/auth/auth.provider";
import { getSession } from "@/features/auth/auth.utils";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";

const links = [
  {
    label: "Home",
    href: "/dashboard",
  },
  {
    label: "Transactions",
    href: "/dashboard/transactions",
  },
  { label: "Products", href: "/dashboard/products" },
  { label: "Recurring Transactions", href: "/dashboard/recurring" },
  {
    label: "Profile",
    href: "/dashboard/profile",
  },
] as const;

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const session = await getSession();

    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }

    return { user: session.user };
  },
  component: AppLayout,
});

function AppLayout() {
  const location = useLocation();
  console.log(location.pathname);
  return (
    <AuthProvider>
      <div
        className="mx-auto relative min-h-screen"
        style={{ width: "min(100%, 500px)" }}
      >
        <Outlet />
        <nav className="absolute bottom-0 left-0 right-0">
          <div className="flex gap-2">
            {links.map((link) => (
              <Button
                key={link.label}
                variant={
                  location.pathname === link.href ? "default" : "outline"
                }
                className="grow text-center"
                asChild
              >
                <Link to={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>
        </nav>
      </div>
    </AuthProvider>
  );
}
