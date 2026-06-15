import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/features/auth/client/auth-client";
import { Button } from "@/components/ui/button";
import { GithubIcon, ArrowLeftIcon, Gem } from "lucide-react";

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
    <div className="min-h-screen flex items-center bg-background">
      <div
        className="flex flex-col items-start mx-auto px-6"
        style={{ width: "min(480px, 100%)" }}
      >
        <div className="size-14 rounded-xl bg-primary grid place-items-center mb-10">
          <Gem className="size-6 text-primary-foreground" />
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to continue to your dashboard.
        </p>

        <div className="grid w-full gap-3 mt-10">
          <Button
            size="lg"
            className="w-full"
            onClick={() =>
              authClient.signIn.social({
                provider: "github",
                callbackURL: redirect || "/dashboard",
              })
            }
          >
            <GithubIcon className="mr-2 size-4" />
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
    </div>
  );
}
