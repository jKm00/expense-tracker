import { SignInButton } from "@/features/auth/component/sign-in.button";
import { createFileRoute, Link } from "@tanstack/react-router";
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

  return (
    <div>
      <nav className="flex justify-between">
        <h1>Expense Tracker</h1>
        {isLoggedIn ? <Link to="/dashboard">Dashboard</Link> : <SignInButton />}
      </nav>
    </div>
  );
}
