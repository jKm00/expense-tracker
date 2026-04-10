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
        <Icon className="size-10 mb-4" />
        {children}
        <div className="flex gap-2">
          <Button onClick={goBack} variant="secondary">
            <ArrowLeft />
            Back to previous page
          </Button>
          <Button onClick={refresh} variant="outline">
            <RefreshCw />
            Refresh page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpectedErrorTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-semibold mb-4">{children}</h2>;
}

function ExpectedErrorMessage({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm mb-8">{children}</p>;
}

export { ExpectedError, ExpectedErrorTitle, ExpectedErrorMessage };
