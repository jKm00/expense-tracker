import { ShoppingListWithItems } from "../shopping.models";

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

function makeEntry(item: ShoppingListWithItems["items"][number]): CheckoutEntry {
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
  return list.items.filter((item) => item.checked).map(makeEntry);
}
