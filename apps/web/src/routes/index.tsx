import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getSession } from "@/features/auth/auth.utils";
import { authClient } from "@/features/auth/auth-client";
import { Button } from "@/components/ui/button";
import {
  Gem,
  ArrowRightIcon,
  GithubIcon,
  TrendingUpIcon,
  TagIcon,
  RepeatIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async () => {
    const session = await getSession();
    return { isLoggedIn: !!session };
  },
  component: LandingPage,
});

function LandingPage() {
  const { isLoggedIn } = Route.useLoaderData();
  const navigate = useNavigate();

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    if (isStandalone) {
      navigate({ to: "/dashboard" });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main
        className="flex flex-col grow items-start justify-center mx-auto px-6"
        style={{ width: "min(480px, 100%)" }}
      >
        <div className="size-14 rounded-xl bg-primary grid place-items-center mb-10">
          <Gem className="size-6 text-primary-foreground" />
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Expenses
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-sm">
          A simple way to track spending, organize products, and stay on top of
          recurring costs.
        </p>

        <div className="w-full mt-10">
          {isLoggedIn ? (
            <Button asChild size="lg" className="w-full">
              <Link to="/dashboard">
                Go to Dashboard
                <ArrowRightIcon className="ml-2 size-4" />
              </Link>
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full"
              onClick={() =>
                authClient.signIn.social({
                  provider: "github",
                  callbackURL: "/dashboard",
                })
              }
            >
              <GithubIcon className="mr-2 size-4" />
              Continue with GitHub
            </Button>
          )}
        </div>

        <div className="flex flex-wrap justify-center w-full gap-2 mt-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <TrendingUpIcon className="size-3" />
            Analytics
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <TagIcon className="size-3" />
            Tags
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <RepeatIcon className="size-3" />
            Recurring
          </span>
        </div>
      </main>
      <footer className="pb-8 text-center text-xs text-muted-foreground/40">
        Built for personal use
      </footer>
    </div>
  );
}
