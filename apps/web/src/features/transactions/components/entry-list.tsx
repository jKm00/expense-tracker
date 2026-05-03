import { Link } from "@tanstack/react-router";
import { EmptyState, EmptyStateMessage } from "@/components/custom/empty-state";
import { Plus, Tag as TagIcon, X, Package, ShoppingBag } from "lucide-react";
import React, { useMemo, useState } from "react";
import { EntryWithProduct } from "../transactions.models";
import { formatAmount } from "@/utils/format";
import { Tag } from "@/features/tags/tags.models";
import { TagBadge } from "@/features/tags/components/tag";
import { TagSelect } from "@/features/tags/components/tag.select";
import { transactionMutations } from "../transactions.mutations";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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

  const linkTagMutation = transactionMutations.linkTagToEntry();
  const unlinkTagMutation = transactionMutations.unlinkTagFromEntry();
  const [tagPickerEntryId, setTagPickerEntryId] = useState<string | null>(null);

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
              <Link
                to="/dashboard/products/$id"
                params={{ id: entry.productId }}
                className="block"
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
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatAmount(entry.quantity * Number(entry.price))},-
                  </span>
                </div>
              </Link>

              {canEditTags && transactionId && (
                <EntryTagControls
                  entry={entry}
                  tags={tags}
                  open={tagPickerEntryId === entry.id}
                  onToggleOpen={(open) => {
                    setTagPickerEntryId(open ? entry.id : null);
                  }}
                  isLinking={linkTagMutation.isPending}
                  isUnlinking={unlinkTagMutation.isPending}
                  onLink={(tagId) => {
                    linkTagMutation.mutate(
                      {
                        transactionId,
                        entryId: entry.id,
                        tagId,
                      },
                      {
                        onSuccess: ([error]) => {
                          if (error) {
                            toast.error(error.message);
                          }
                        },
                      },
                    );
                  }}
                  onUnlink={(tagId) => {
                    unlinkTagMutation.mutate(
                      {
                        transactionId,
                        entryId: entry.id,
                        tagId,
                      },
                      {
                        onSuccess: ([error]) => {
                          if (error) {
                            toast.error(error.message);
                          }
                        },
                      },
                    );
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        emptyMessage
      )}
    </div>
  );
}

function EntryTagControls({
  entry,
  tags,
  open,
  onToggleOpen,
  isLinking,
  isUnlinking,
  onLink,
  onUnlink,
}: {
  entry: EntryWithProduct;
  tags: Tag[];
  open: boolean;
  onToggleOpen: (open: boolean) => void;
  isLinking: boolean;
  isUnlinking: boolean;
  onLink: (tagId: string) => void;
  onUnlink: (tagId: string) => void;
}) {
  const selectedTags = entry.tags ?? [];
  const selectableTags = useMemo(() => {
    const selectedTagIds = new Set(selectedTags.map((tag) => tag.id));
    return tags.filter((tag) => !selectedTagIds.has(tag.id));
  }, [selectedTags, tags]);

  const disabled = isLinking || isUnlinking;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {selectedTags.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No entry tags</p>
        ) : (
          selectedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              onClick={() => {
                if (disabled) return;
                onUnlink(tag.id);
              }}
              className={disabled ? "cursor-pointer opacity-50 pointer-events-none" : "cursor-pointer"}
            >
              <TagIcon className="size-3" />
              {tag.name}
              <X className="size-3" />
            </TagBadge>
          ))
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onToggleOpen(!open)}
          className="h-7"
        >
          <Plus className="size-3" />
          Add tag
        </Button>
      </div>

      {open && (
        <TagSelect
          tags={selectableTags}
          value={[]}
          onChange={(nextTags) => {
            const tag = nextTags[0];
            if (!tag) return;
            onLink(tag.id);
            onToggleOpen(false);
          }}
          placeholder="Select tag..."
          className="w-full"
        />
      )}
    </div>
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
