import { EmptyState } from "@/components/custom/empty-state";
import { RecurringListItem } from "./recurring-list-item";
import { RepeatIcon } from "lucide-react";
import type { RecurringWithProduct } from "../recurring.models";

export function RecurringList({
  items,
}: {
  items: RecurringWithProduct[];
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        message="No recurring transactions found."
        icon={RepeatIcon}
      />
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <RecurringListItem key={item.id} recurring={item} />
      ))}
    </div>
  );
}
