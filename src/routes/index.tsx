import { useEffect } from "react";
import { SignInButton } from "@/features/auth/component/sign-in.button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getSession } from "@/features/auth/auth.utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WalletIcon, ArrowRightIcon } from "lucide-react";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Hero */}
        <div className="space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary">
            <WalletIcon className="size-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Expense Tracker
          </h1>
          <p className="text-muted-foreground">
            Track your income, expenses, and recurring transactions in one
            place.
          </p>
        </div>

        {/* Action card */}
        <Card>
          <CardContent className="pt-6">
            {isLoggedIn ? (
              <Button asChild className="w-full" size="lg">
                <Link to="/dashboard">
                  Go to Dashboard
                  <ArrowRightIcon className="ml-2 size-4" />
                </Link>
              </Button>
            ) : (
              <SignInButton />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
