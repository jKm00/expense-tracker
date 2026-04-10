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
import { Badge } from "@/components/ui/badge";

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
    <div className="min-h-screen flex flex-col">
      <main
        className="flex flex-col grow items-start justify-center mx-auto"
        style={{ width: "min(500px, 100%)" }}
      >
        <div className="bg-foreground size-16 rounded-xl grid place-items-center mb-8">
          <Gem className="text-background" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Expenses</h1>
        <p className="text-sm text-muted-foreground mb-8">
          A simple way to track spending, organize products, and stay on top of
          recurring costs.
        </p>
        <div className="w-full mb-8">
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
              <GithubIcon className="mr-2 size-5" />
              Continue with GitHub
            </Button>
          )}
        </div>
        <div className="flex justify-center w-full gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
            <TrendingUpIcon className="size-3.5" />
            Analytics
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
            <TagIcon className="size-3.5" />
            Tags
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
            <RepeatIcon className="size-3.5" />
            Recurring
          </span>
        </div>
      </main>
      <footer className="pb-8 text-center text-xs text-muted-foreground/50">
        Built for personal use
      </footer>
    </div>
  );
}
