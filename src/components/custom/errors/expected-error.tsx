import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, CircleX, RefreshCw } from "lucide-react";

function ExpectedError({
  icon: Icon = CircleX,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function goBack() {
    router.history.back();
  }

  function refresh() {
    window.location.reload();
  }

  return (
    <Card className="py-8 px-2 max-md:text-center md:px-6">
      <CardContent className="flex flex-col max-md:items-center">
        <div className="size-12 rounded-full bg-destructive/10 grid place-items-center mb-4">
          <Icon className="size-5 text-destructive" />
        </div>
        {children}
        <div className="flex gap-2">
          <Button onClick={goBack} variant="outline" size="sm">
            <ArrowLeft className="size-3.5" />
            Go back
          </Button>
          <Button onClick={refresh} variant="ghost" size="sm">
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpectedErrorTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold mb-2">{children}</h2>;
}

function ExpectedErrorMessage({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm mb-6">{children}</p>;
}

export { ExpectedError, ExpectedErrorTitle, ExpectedErrorMessage };
