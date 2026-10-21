import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShortcutTile } from "@/features/shortcuts/components/shortcut-tile";
import { shortcutQueries } from "@/features/shortcuts/shortcuts.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

export function ShortcutsWidget() {
  const {
    data: [error, shortcuts],
  } = useSuspenseQuery(shortcutQueries.getShortcutsOptions());

  const items = (shortcuts ?? []).filter((s) => s.showOnHome);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Shortcuts</CardTitle>
            <CardDescription>Tap to log a transaction</CardDescription>
          </div>
          <Link
            to="/dashboard/shortcuts"
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Manage
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">
            Could not load your shortcuts.
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No shortcuts on your home screen. Use Customize to pick some.
          </p>
        ) : (
          <div className="grid gap-1 sm:grid-cols-2">
            {items.map((shortcut) => (
              <ShortcutTile
                key={shortcut.id}
                shortcut={shortcut}
                className="border border-border"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
