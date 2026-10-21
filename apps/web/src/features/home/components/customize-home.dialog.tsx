import { LoaderButton } from "@/components/custom/loader.button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { shortcutQueries } from "@/features/shortcuts/shortcuts.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { HomeWidget, HomeWidgetType } from "../home.models";
import { homeMutations } from "../home.mutations";
import { homeQueries } from "../home.queries";

const widgetLabels: Record<HomeWidgetType, string> = {
  quick_log: "Quick Log",
  shortcuts: "Shortcuts",
};

export function CustomizeHomeDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <SlidersHorizontal className="size-4" />
          <span className="max-md:sr-only">Customize</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize home</DialogTitle>
          <DialogDescription>
            Choose which widgets to show and in what order.
          </DialogDescription>
        </DialogHeader>
        {open && <CustomizeForm onSaved={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CustomizeForm({ onSaved }: { onSaved: () => void }) {
  const mutation = homeMutations.saveHomeConfig();
  const {
    data: [, savedWidgets],
  } = useSuspenseQuery(homeQueries.getHomeWidgetsOptions());
  const {
    data: [, shortcutsResult],
  } = useSuspenseQuery(shortcutQueries.getShortcutsOptions());
  const shortcuts = shortcutsResult ?? [];

  const [widgets, setWidgets] = useState<HomeWidget[]>(savedWidgets ?? []);
  const [shortcutOrder, setShortcutOrder] = useState<string[]>(
    shortcuts.map((s) => s.id),
  );
  const [shortcutIds, setShortcutIds] = useState<string[]>(
    shortcuts.filter((s) => s.showOnHome).map((s) => s.id),
  );

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= widgets.length) return;
    const next = [...widgets];
    [next[index], next[target]] = [next[target], next[index]];
    setWidgets(next);
  }

  function moveShortcut(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= shortcutOrder.length) return;
    const next = [...shortcutOrder];
    [next[index], next[target]] = [next[target], next[index]];
    setShortcutOrder(next);
  }

  function toggleWidget(type: HomeWidgetType, enabled: boolean) {
    setWidgets(widgets.map((w) => (w.type === type ? { ...w, enabled } : w)));
  }

  function toggleShortcut(id: string, checked: boolean) {
    setShortcutIds(
      checked ? [...shortcutIds, id] : shortcutIds.filter((s) => s !== id),
    );
  }

  function handleSave() {
    mutation.mutate(
      { widgets, shortcutIds, shortcutOrder },
      {
        onSuccess: ([error]) => {
          if (error) {
            toast.error(
              error.reason === "HOME_INVALID_SHORTCUT"
                ? "A selected shortcut no longer exists. Please try again."
                : "Failed to save home layout. Please try again!",
            );
          } else {
            toast.success("Home layout saved");
            onSaved();
          }
        },
      },
    );
  }

  const shortcutsEnabled = widgets.some(
    (w) => w.type === "shortcuts" && w.enabled,
  );

  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {widgets.map((widget, index) => (
          <li
            key={widget.type}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
          >
            <label className="flex min-h-9 flex-1 cursor-pointer items-center gap-3 text-sm">
              <Checkbox
                checked={widget.enabled}
                onCheckedChange={(checked) =>
                  toggleWidget(widget.type, checked === true)
                }
              />
              {widgetLabels[widget.type]}
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Move ${widgetLabels[widget.type]} up`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Move ${widgetLabels[widget.type]} down`}
              disabled={index === widgets.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Shortcuts to show (top to bottom)
        </p>
        {shortcuts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have no shortcuts yet. Create some on the Shortcuts page.
          </p>
        ) : (
          <div
            className={`relative max-h-48 overflow-y-auto rounded-lg border border-border ${shortcutsEnabled ? "" : "opacity-50"}`}
          >
            {shortcutOrder.map((id, index) => {
              const shortcut = shortcuts.find((s) => s.id === id);
              if (!shortcut) return null;
              return (
                <div
                  key={id}
                  className="flex items-center gap-1 pr-1 hover:bg-muted/50"
                >
                  <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                    <Checkbox
                      checked={shortcutIds.includes(id)}
                      onCheckedChange={(checked) =>
                        toggleShortcut(id, checked === true)
                      }
                    />
                    {shortcut.name}
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${shortcut.name} up`}
                    disabled={index === 0}
                    onClick={() => moveShortcut(index, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${shortcut.name} down`}
                    disabled={index === shortcutOrder.length - 1}
                    onClick={() => moveShortcut(index, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        {!shortcutsEnabled && shortcuts.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Enable the Shortcuts widget above to show them.
          </p>
        )}
      </div>

      <LoaderButton
        className="w-full"
        isLoading={mutation.isPending}
        disabled={mutation.isPending}
        onClick={handleSave}
      >
        Save
      </LoaderButton>
    </div>
  );
}
