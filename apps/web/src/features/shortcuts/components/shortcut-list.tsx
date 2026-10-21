import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ShortcutWithProducts } from "../shortcuts.models";
import { DeleteShortcutDialog } from "./delete-shortcut.dialog";
import { shortcutMutations } from "../shortcuts.mutations";
import { ShortcutTile } from "./shortcut-tile";

export function ShortcutList({ items }: { items: ShortcutWithProducts[] }) {
  const reorder = shortcutMutations.reorderShortcuts();

  function move(index: number, direction: -1 | 1) {
    const ids = items.map((s) => s.id);
    [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
    reorder.mutate({ shortcutIds: ids });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((shortcut, index) => (
        <ShortcutCard
          key={shortcut.id}
          shortcut={shortcut}
          canMoveUp={index > 0}
          canMoveDown={index < items.length - 1}
          disabled={reorder.isPending}
          onMove={(direction) => move(index, direction)}
        />
      ))}
    </div>
  );
}

function ShortcutCard({
  shortcut,
  canMoveUp,
  canMoveDown,
  disabled,
  onMove,
}: {
  shortcut: ShortcutWithProducts;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex items-center rounded-xl border border-border bg-card pr-1">
      <ShortcutTile shortcut={shortcut} className="min-h-16 flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${shortcut.name}`}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link
              to="/dashboard/shortcuts/$id/edit"
              params={{ id: shortcut.id }}
            >
              <Pencil className="size-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canMoveUp || disabled}
            onSelect={() => onMove(-1)}
          >
            <ArrowUp className="size-4" />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canMoveDown || disabled}
            onSelect={() => onMove(1)}
          >
            <ArrowDown className="size-4" />
            Move down
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteShortcutDialog
        shortcutId={shortcut.id}
        shortcutName={shortcut.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
