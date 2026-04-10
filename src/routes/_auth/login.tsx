import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/features/auth/auth-client";
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
    <div className="min-h-screen flex items-center">
      <div
        className="flex flex-col items-start mx-auto"
        style={{ width: "min(500px, 100%)" }}
      >
        <div className="bg-foreground size-16 rounded-xl grid place-items-center mb-8">
          <Gem className="text-background size-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Sign in to continue to your dashboard.
        </p>
        <div className="grid w-full gap-4">
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
            <GithubIcon className="mr-2 size-5" />
            Continue with GitHub
          </Button>
          <Button
            asChild
            variant="link"
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
