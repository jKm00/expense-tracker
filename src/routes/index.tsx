import { useEffect } from "react";
import { SignInButton } from "@/features/auth/component/sign-in.button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getSession } from "@/features/auth/auth.utils";

export const Route = createFileRoute("/")({
  loader: async () => {
    const session = await getSession();
    return { isLoggedIn: !!session };
  },
  component: App,
});

function App() {
  const { isLoggedIn } = Route.useLoaderData();
  const navigate = useNavigate();

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    if (isStandalone) {
      // In PWA mode, always redirect away from landing page.
      // If logged in → dashboard. If not → /login (auth guard handles it).
      navigate({ to: "/dashboard" });
    }
  }, [navigate]);

  return (
    <div>
      <nav className="flex justify-between">
        <h1>Expense Tracker</h1>
        {isLoggedIn ? <Link to="/dashboard">Dashboard</Link> : <SignInButton />}
      </nav>
    </div>
  );
}
