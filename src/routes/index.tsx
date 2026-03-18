import { SignInButton } from "@/features/auth/component/sign-in.button";
import { authClient } from "@/features/auth/lib/auth.client";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const { data } = authClient.useSession();

  return (
    <div>
      <nav className="flex justify-between">
        <h1>Expense Tracker</h1>
        {data ? <Link to="/dashboard">Dashboard</Link> : <SignInButton />}
      </nav>
    </div>
  );
}
