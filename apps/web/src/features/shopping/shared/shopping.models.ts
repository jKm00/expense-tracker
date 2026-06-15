import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { Product } from "@/features/products/shared/products.models";
import { shoppingListItems, shoppingLists } from "@/features/shopping/server/shopping.schema";

export type ShoppingList = InferSelectModel<typeof shoppingLists>;
export type ShoppingListItem = InferSelectModel<typeof shoppingListItems>;
export type NewShoppingList = InferInsertModel<typeof shoppingLists>;
export type NewShoppingListItem = InferInsertModel<typeof shoppingListItems>;

export type ShoppingListItemWithProduct = ShoppingListItem & {
  product: Product;
};

export type ShoppingListWithItems = ShoppingList & {
  items: ShoppingListItemWithProduct[];
};
