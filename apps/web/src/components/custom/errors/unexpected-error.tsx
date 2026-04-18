import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CircleX, RotateCw } from "lucide-react";

export function UnexpectedError() {
  function refresh() {
    window.location.reload();
  }

  return (
    <Card className="py-8 px-2 max-md:text-center md:px-6">
      <CardContent className="flex flex-col max-md:items-center">
        <div className="size-12 rounded-full bg-destructive/10 grid place-items-center mb-4">
          <CircleX className="size-5 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Unexpected error...</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Something unexpected happened. Please try again or contact support.
        </p>
        <Button onClick={refresh} variant="outline" size="sm">
          <RotateCw className="size-3.5" />
          Refresh page
        </Button>
      </CardContent>
    </Card>
  );
}
