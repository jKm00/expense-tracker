import {
  EmptyState,
  EmptyStateAction,
  EmptyStateMessage,
} from "@/components/custom/empty-state";
import { ProductSelect } from "@/components/custom/product-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Product } from "@/features/products/products.models";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { shoppingMutations } from "../shopping.mutations";
import { ShoppingListWithItems } from "../shopping.models";

export function ShoppingListView({
  list,
  products,
}: {
  list: ShoppingListWithItems;
  products: Product[];
}) {
  const [productSelectKey, setProductSelectKey] = useState(0);

  const addShoppingItem = shoppingMutations.addShoppingItem();
  const toggleShoppingItem = shoppingMutations.toggleShoppingItem();
  const removeShoppingItem = shoppingMutations.removeShoppingItem();

  function handleAddItem(product: Product) {
    addShoppingItem.mutate(
      {
        product: {
          id: product.id.length === 0 ? null : product.id,
          name: product.name,
        },
      },
      {
        onSuccess: (result) => {
          const [error] = result;
          if (!error) {
            setProductSelectKey((value) => value + 1);
          }
        },
      },
    );
  }

  function handleToggleItem(itemId: string, checked: boolean) {
    toggleShoppingItem.mutate({ shoppingItemId: itemId, checked });
  }

  function handleRemoveItem(itemId: string) {
    removeShoppingItem.mutate({ shoppingItemId: itemId });
  }

  return (
    <div className="space-y-4">
      <ProductSelect
        key={productSelectKey}
        products={products}
        onValueChange={handleAddItem}
      />

      {list.items.length === 0 ? (
        <EmptyState icon={ShoppingBag}>
          <EmptyStateMessage>
            {products.length === 0
              ? "You do not have any products yet. Create one before building your shopping list."
              : "Your shopping list is clear. Add something above when you need it."}
          </EmptyStateMessage>
          {products.length === 0 ? (
            <EmptyStateAction>
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard/products/new">Create first product</Link>
              </Button>
            </EmptyStateAction>
          ) : null}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {list.items.map((item, index) => {
            const checked = item.checked;

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-muted/50 sm:px-4 sm:py-3",
                  index !== list.items.length - 1 && "border-b border-border",
                  checked && "bg-muted/20",
                )}
                onClick={() => handleToggleItem(item.id, !checked)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleToggleItem(item.id, !checked);
                  }
                }}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(nextChecked) =>
                    handleToggleItem(item.id, nextChecked === true)
                  }
                  onClick={(event) => event.stopPropagation()}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      checked && "text-muted-foreground line-through",
                    )}
                  >
                    {item.product.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {checked ? "Checked" : "Tap to check off"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Remove item"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRemoveItem(item.id);
                  }}
                >
                  <X className="size-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
