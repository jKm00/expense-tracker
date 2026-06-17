import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Home, RotateCw, SearchX } from "lucide-react";

type RootErrorPageProps = {
  error?: unknown;
  reset?: () => void;
};

export function RootNotFoundPage() {
  return (
    <RootFallbackShell
      icon={SearchX}
      eyebrow="404 not found"
      title="Page not found"
      description="The route does not match anything in Expense Tracker. Check the address or return to a known page."
    >
      <Button asChild>
        <Link to="/dashboard">
          <Home className="size-4" />
          Go to dashboard
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/">
          <ArrowLeft className="size-4" />
          Back home
        </Link>
      </Button>
    </RootFallbackShell>
  );
}

export function RootUnexpectedErrorPage({ error, reset }: RootErrorPageProps) {
  function retry() {
    reset?.();
    window.location.reload();
  }

  return (
    <RootFallbackShell
      icon={AlertTriangle}
      eyebrow="Unhandled error"
      title="Something went wrong"
      description="The app hit an unexpected state before a more specific error handler could recover."
    >
      <Button onClick={retry}>
        <RotateCw className="size-4" />
        Try again
      </Button>
      <Button asChild variant="outline">
        <Link to="/dashboard">
          <Home className="size-4" />
          Go to dashboard
        </Link>
      </Button>
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="mt-6 max-h-40 w-full overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
          {error.stack ?? error.message}
        </pre>
      )}
    </RootFallbackShell>
  );
}

function RootFallbackShell({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center">
        <Card className="w-full border-border/80 bg-card/95 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3 border-b pb-5">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted/40">
                <Icon className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {eyebrow}
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                  {title}
                </h1>
              </div>
            </div>

            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">{children}</div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
