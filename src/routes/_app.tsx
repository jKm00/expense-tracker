import { AuthProvider } from "@/features/auth/auth.provider";
import { getSession } from "@/features/auth/auth.utils";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";

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
    {
      label: "Profile",
      href: "/dashboard/profile",
    },
  ] as const;

  return (
    <AuthProvider>
      <div
        className="mx-auto relative min-h-screen"
        style={{ width: "min(100%, 500px)" }}
      >
        <Outlet />
        <nav className="absolute bottom-0 left-0 right-0">
          <ul className="flex gap-2">
            {links.map((link) => (
              <li key={link.label} className="grow text-center">
                <Link to={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </AuthProvider>
  );
}
