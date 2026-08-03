import { ShoppingListWithItems } from "../shopping.models";
import { IntegrationTokenMetadata } from "@/features/integrations/integration.models";
import { FullTransaction } from "@/features/transactions/transactions.models";
import { isSameDay, subDays } from "date-fns";

export type CheckoutEntry = {
  shoppingItemId?: string;
  product: { id: string | null; name: string };
  quantity: string;
  price: string;
  total: string;
  lastEditedField: "price" | "total";
  type: "expense";
  tagIds: string[];
};

export function makeCheckoutEntry(
  item: ShoppingListWithItems["items"][number],
): CheckoutEntry {
  return {
    shoppingItemId: item.id,
    product: {
      id: item.product.id,
      name: item.product.name,
    },
    quantity: "1",
    price: "",
    total: "",
    lastEditedField: "price",
    type: "expense",
    tagIds: [],
  };
}

export function getPrefilledCheckoutEntries(list: ShoppingListWithItems) {
  return list.items.filter((item) => item.checked).map(makeCheckoutEntry);
}

export function hasActiveIntegrationTokens(tokens: IntegrationTokenMetadata[]) {
  return tokens.some((token) => token.revokedAt === null);
}

export function getCheckoutLinkSuggestion(
  transactions: FullTransaction[],
  date: Date,
) {
  const previousDay = subDays(date, 1);
  return transactions
    .filter((transaction) => transaction.needsReview)
    .filter((transaction) => isSameDay(transaction.date, date) || isSameDay(transaction.date, previousDay))
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
}

export function getSelectableCheckoutTransactions(
  transactions: FullTransaction[],
  date: Date,
) {
  const previousDay = subDays(date, 1);
  return transactions
    .filter((transaction) => isSameDay(transaction.date, date) || isSameDay(transaction.date, previousDay))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
