import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoaderButton } from "@/components/custom/loader.button";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ShortcutWithProducts } from "../shortcuts.models";
import { shortcutMutations } from "../shortcuts.mutations";

export function ReorderShortcutsDialog({
  items,
}: {
  items: ShortcutWithProducts[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={items.length < 2}>
          <ArrowUpDown className="size-4" />
          <span className="max-md:sr-only">Re-order</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Re-order shortcuts</DialogTitle>
          <DialogDescription>
            Move the shortcuts you use most to the top. This order is also used
            on the home page.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ReorderForm items={items} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReorderForm({
  items,
  onDone,
}: {
  items: ShortcutWithProducts[];
  onDone: () => void;
}) {
  const mutation = shortcutMutations.reorderShortcuts();
  const [order, setOrder] = useState(items.map((s) => s.id));

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  function handleSave() {
    mutation.mutate(
      { shortcutIds: order },
      {
        onSuccess: ([error]) => {
          if (error) {
            toast.error("Failed to save order. Please try again!");
          } else {
            toast.success("Order saved");
            onDone();
          }
        },
      },
    );
  }

  return (
    <>
      <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
        {order.map((id, index) => {
          const shortcut = items.find((s) => s.id === id);
          if (!shortcut) return null;
          return (
            <li
              key={id}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {shortcut.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${shortcut.name} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${shortcut.name} down`}
                disabled={index === order.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
            </li>
          );
        })}
      </ul>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <LoaderButton
          type="button"
          isLoading={mutation.isPending}
          onClick={handleSave}
        >
          Save
        </LoaderButton>
      </DialogFooter>
    </>
  );
}
