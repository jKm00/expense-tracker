import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ShortcutWithProducts } from "../shortcuts.models";
import { DeleteShortcutDialog } from "./delete-shortcut.dialog";
import { ShortcutTile } from "./shortcut-tile";

export function ShortcutList({ items }: { items: ShortcutWithProducts[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((shortcut) => (
        <ShortcutCard key={shortcut.id} shortcut={shortcut} />
      ))}
    </div>
  );
}

function ShortcutCard({ shortcut }: { shortcut: ShortcutWithProducts }) {
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
