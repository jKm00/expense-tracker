import { Link } from "@tanstack/react-router";
import {
  EmptyState,
  EmptyStateMessage,
} from "@/components/custom/empty-state";
import {
  Package,
  Plus,
  ShoppingBag,
  Tag as TagIcon,
  X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { EntryWithProduct } from "../transactions.models";
import { formatAmount } from "@/utils/format";
import { Tag } from "@/features/tags/tags.models";
import { TagBadge } from "@/features/tags/components/tag";
import { transactionMutations } from "../transactions.mutations";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NewTagDialog } from "@/features/tags/components/new-tag.dialog";

function EntryList({
  entries,
  transactionId,
  availableTags,
  children,
}: {
  entries: EntryWithProduct[];
  transactionId?: string;
  availableTags?: Tag[];
  children: React.ReactNode;
}) {
  const hasEntries = entries.length > 0;
  const canEditTags = Boolean(transactionId && availableTags);
  const tags = availableTags ?? [];
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  const activeEntry = useMemo(() => {
    if (!activeEntryId) return null;
    return entries.find((entry) => entry.id === activeEntryId) ?? null;
  }, [activeEntryId, entries]);

  const title = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === EntryListTitle,
  );

  const emptyMessage = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === EntryListEmpty,
  );

  return (
    <div className="space-y-2">
      {title}
      {hasEntries ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {entries.map((entry, idx) => (
            <div
              key={entry.id}
              className={`px-4 py-3 ${idx !== entries.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex items-center gap-3 rounded-md px-1 py-1">
                <Link
                  to="/dashboard/products/$id"
                  params={{ id: entry.productId }}
                  className="min-w-0 flex-1 block"
                >
                  <div className="flex items-center gap-3 transition-colors hover:bg-muted/50 rounded-md px-1 py-1">
                    <div className="size-8 rounded-lg bg-muted grid place-items-center shrink-0">
                      <ShoppingBag className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {entry.product?.name}
                        {entry.product?.deletedAt && (
                          <span className="ml-1.5 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            archived
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {entry.quantity} x {formatAmount(entry.price)},-
                      </p>
                    </div>
                  </div>
                </Link>

                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatAmount(entry.quantity * Number(entry.price))},-
                </span>

                {canEditTags && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 whitespace-nowrap"
                    onClick={() => setActiveEntryId(entry.id)}
                  >
                    <TagIcon className="size-3.5" />
                    {entry.tags.length}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        emptyMessage
      )}

      {canEditTags && transactionId && activeEntry && (
        <EntryTagsDialog
          open={Boolean(activeEntry)}
          onOpenChange={(open) => {
            if (!open) setActiveEntryId(null);
          }}
          transactionId={transactionId}
          entry={activeEntry}
          tags={tags}
        />
      )}
    </div>
  );
}

function EntryTagsDialog({
  open,
  onOpenChange,
  transactionId,
  entry,
  tags,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  entry: EntryWithProduct;
  tags: Tag[];
}) {
  const [search, setSearch] = useState("");
  const linkTagMutation = transactionMutations.linkTagToEntry();
  const unlinkTagMutation = transactionMutations.unlinkTagFromEntry();
  const selectedTags = entry.tags ?? [];

  const selectedTagIds = useMemo(
    () => new Set(selectedTags.map((tag) => tag.id)),
    [selectedTags],
  );

  const availableTags = useMemo(() => {
    return tags.filter((tag) => {
      if (selectedTagIds.has(tag.id)) {
        return false;
      }

      return tag.name.toLowerCase().includes(search.toLowerCase());
    });
  }, [search, selectedTagIds, tags]);

  const disabled = linkTagMutation.isPending || unlinkTagMutation.isPending;

  function handleLinkTag(tag: Tag) {
    linkTagMutation.mutate(
      {
        transactionId,
        entryId: entry.id,
        tagId: tag.id,
      },
      {
        onSuccess: ([error]) => {
          if (error) {
            toast.error(error.message);
          }
        },
      },
    );
  }

  function handleUnlinkTag(tag: Tag) {
    unlinkTagMutation.mutate(
      {
        transactionId,
        entryId: entry.id,
        tagId: tag.id,
      },
      {
        onSuccess: ([error]) => {
          if (error) {
            toast.error(error.message);
          }
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setSearch("");
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Entry Tags</DialogTitle>
          <DialogDescription>
            Add or remove tags for this transaction item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Applied tags
            </p>
            {selectedTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags applied</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    onClick={() => {
                      if (!disabled) {
                        handleUnlinkTag(tag);
                      }
                    }}
                    className={disabled ? "cursor-pointer opacity-50 pointer-events-none" : "cursor-pointer"}
                  >
                    <TagIcon className="size-3" />
                    {tag.name}
                    <X className="size-3" />
                  </TagBadge>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Available tags
              </p>
              <NewTagDialog />
            </div>

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tags..."
              className="mb-3"
            />

            {availableTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags available</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    onClick={() => {
                      if (!disabled) {
                        handleLinkTag(tag);
                      }
                    }}
                    className={disabled ? "cursor-pointer opacity-50 pointer-events-none" : "cursor-pointer"}
                  >
                    <TagIcon className="size-3" />
                    {tag.name}
                    <Plus className="size-3" />
                  </TagBadge>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EntryListTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

function EntryListEmpty({ children }: { children: React.ReactNode }) {
  return (
    <EmptyState icon={Package}>
      <EmptyStateMessage>{children}</EmptyStateMessage>
    </EmptyState>
  );
}

export { EntryList, EntryListTitle, EntryListEmpty };
