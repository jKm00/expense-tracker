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
    <div className="flex min-h-svh flex-col bg-background">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm space-y-10 text-center">
          {/* Icon */}
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-foreground">
            <Gem className="size-7 text-background" />
          </div>

          {/* Copy */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Expense Tracker
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              A simple way to track spending, organize products, and stay on top
              of recurring costs.
            </p>
          </div>

          {/* CTA */}
          <div>
            {isLoggedIn ? (
              <Button asChild size="lg" className="w-full text-base">
                <Link to="/dashboard">
                  Go to Dashboard
                  <ArrowRightIcon className="ml-2 size-4" />
                </Link>
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full text-base"
                onClick={() =>
                  authClient.signIn.social({
                    provider: "github",
                    callbackURL: "/dashboard",
                  })
                }
              >
                <GithubIcon className="mr-2 size-5" />
                Continue with GitHub
              </Button>
            )}
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1">
              <TrendingUpIcon className="size-3.5" />
              Analytics
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1">
              <TagIcon className="size-3.5" />
              Tags
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1">
              <RepeatIcon className="size-3.5" />
              Recurring
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pb-8 text-center text-xs text-muted-foreground/60">
        Built for personal use
      </footer>
    </div>
  );
}
