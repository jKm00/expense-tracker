import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/features/auth/auth-client";
import { Button } from "@/components/ui/button";
import { WalletIcon, GithubIcon, ArrowLeftIcon } from "lucide-react";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/_auth/login")({
  validateSearch: zodValidator(loginSearchSchema),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm space-y-10 text-center">
          {/* Icon */}
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-foreground">
            <WalletIcon className="size-7 text-background" />
          </div>

          {/* Copy */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to continue to your dashboard.
            </p>
          </div>

          {/* Auth */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full text-base"
              onClick={() =>
                authClient.signIn.social({
                  provider: "github",
                  callbackURL: redirect || "/dashboard",
                })
              }
            >
              <GithubIcon className="mr-2 size-5" />
              Continue with GitHub
            </Button>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              <Link to="/">
                <ArrowLeftIcon className="mr-1.5 size-3.5" />
                Back to home
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
