import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CircleX, RotateCw } from "lucide-react";

export function UnexpectedError() {
  function refresh() {
    window.location.reload();
  }

  return (
    <Card className="py-8 px-6">
      <CardContent className="flex flex-col">
        <CircleX className="size-10 mb-4" />
        <h2 className="text-2xl font-semibold mb-4">Unexpected error...</h2>
        <p className="text-muted-foreground text-sm mb-8">
          Something unexpected happen. Please try again or contact support
        </p>
        <Button onClick={refresh} variant="outline">
          <RotateCw /> Refresh page
        </Button>
      </CardContent>
    </Card>
  );
}
