import { Card, CardContent } from "@/components/ui/card";
import { InboxIcon } from "lucide-react";

export function EmptyState({
  message,
  icon: Icon = InboxIcon,
  action,
}: {
  message: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="size-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm">{message}</p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}
