import { FormField, FormFieldLabel } from "@/components/custom/form";
import { LoaderButton } from "@/components/custom/loader.button";
import { ProductSelect } from "@/components/custom/product-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Product } from "@/features/products/products.models";
import { formatAmount } from "@/utils/format";
import { format } from "date-fns";
import { ChevronDownIcon, Plus, ShoppingBag, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { shoppingMutations } from "../shopping.mutations";
import { ShoppingListWithItems } from "../shopping.models";
import {
  CheckoutEntry,
  getPrefilledCheckoutEntries,
} from "./shopping-checkout.utils";

function parsePositiveNumber(value?: string) {
  if (!value || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatCalculatedAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function makeProductEntry(product: Product): CheckoutEntry {
  return {
    product: {
      id: product.id.length === 0 ? null : product.id,
      name: product.name,
    },
    quantity: "1",
    price: "",
    total: "",
    lastEditedField: "price",
    type: "expense",
    tagIds: [],
  };
}

export function ShoppingCheckoutForm({
  list,
  products,
}: {
  list: ShoppingListWithItems;
  products: Product[];
}) {
  const navigate = useNavigate();
  const mutation = shoppingMutations.completeShopping();
  const toggleShoppingItem = shoppingMutations.toggleShoppingItem();

  const checkedItems = useMemo(() => list.items.filter((item) => item.checked), [list.items]);

  const [entries, setEntries] = useState<CheckoutEntry[]>(() =>
    getPrefilledCheckoutEntries(list),
  );
  const [store, setStore] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [keepUncheckedItems, setKeepUncheckedItems] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    setEntries((prev) => {
      const next = checkedItems.map((item) => {
        const existing = prev.find((entry) => entry.shoppingItemId === item.id);
        return (
          existing ?? {
            ...makeEntry(item),
            price: "",
            total: "",
          }
        );
      });

      if (next.length === prev.length && next.every((entry, index) => entry === prev[index])) {
        return prev;
      }

      return next;
    });
  }, [checkedItems]);

  const checkoutTotal = useMemo(() => {
    return entries.reduce((sum, entry) => {
      const quantity = parsePositiveNumber(entry.quantity) ?? 0;
      const price = parsePositiveNumber(entry.price) ?? 0;
      return sum + quantity * price;
    }, 0);
  }, [entries]);

  function handleQuantityChange(index: number, quantity: string) {
    setEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;

        const next: CheckoutEntry = {
          ...entry,
          quantity,
          lastEditedField: entry.lastEditedField,
        };

        const parsedQuantity = parsePositiveNumber(quantity);
        if (!parsedQuantity) {
          if (entry.lastEditedField === "price") {
            next.total = "";
          }
          return next;
        }

        if (entry.lastEditedField === "total") {
          const parsedTotal = parsePositiveNumber(entry.total);
          if (parsedTotal) {
            next.price = formatCalculatedAmount(parsedTotal / parsedQuantity);
          }
          return next;
        }

        const parsedPrice = parsePositiveNumber(entry.price);
        next.total = parsedPrice
          ? formatCalculatedAmount(parsedPrice * parsedQuantity)
          : "";
        return next;
      }),
    );
  }

  function handlePriceChange(index: number, price: string) {
    setEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;

        const next: CheckoutEntry = {
          ...entry,
          price,
          lastEditedField: "price",
        };

        const parsedQuantity = parsePositiveNumber(entry.quantity);
        const parsedPrice = parsePositiveNumber(price);
        next.total =
          parsedQuantity && parsedPrice
            ? formatCalculatedAmount(parsedQuantity * parsedPrice)
            : "";

        return next;
      }),
    );
  }

  function handleTotalChange(index: number, total: string) {
    setEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;

        const next: CheckoutEntry = {
          ...entry,
          total,
          lastEditedField: "total",
        };

        const parsedQuantity = parsePositiveNumber(entry.quantity);
        const parsedTotal = parsePositiveNumber(total);
        if (parsedQuantity && parsedTotal) {
          next.price = formatCalculatedAmount(parsedTotal / parsedQuantity);
        }

        return next;
      }),
    );
  }

  function handleRemoveEntry(index: number) {
    const removed = entries[index];
    if (removed?.shoppingItemId) {
      toggleShoppingItem.mutate({
        shoppingItemId: removed.shoppingItemId,
        checked: false,
      });
    }

    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddProduct() {
    if (!selectedProduct) {
      return;
    }

    setEntries((prev) => [...prev, makeProductEntry(selectedProduct)]);
    setSelectedProduct(null);
  }

  function handleDateSelect(nextDate: Date | undefined) {
    setDate(nextDate ?? new Date());
    setDatePickerOpen(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const shoppingItemIds = entries.flatMap((entry) =>
      entry.shoppingItemId ? [entry.shoppingItemId] : [],
    );

    mutation.mutate(
      {
        store,
        description,
        date,
        keepUncheckedItems,
        shoppingItemIds,
        entries: entries.map(({ total, lastEditedField, ...entry }) => ({
          ...entry,
          tagIds: entry.tagIds ?? [],
        })),
      },
      {
        onSuccess: (result) => {
          const [error, transaction] = result;
          if (!error) {
            navigate({
              to: "/dashboard/transactions/$id",
              params: { id: transaction.id },
            });
          }
        },
      },
    );
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <Card>
        <CardContent className="space-y-3 pt-3">
          <div className="space-y-2.5">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-4 py-7 text-center">
                <div className="mb-2 grid size-8 place-items-center rounded-lg bg-muted">
                  <ShoppingBag className="size-3.5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No rows left. Add a product or go back to the list.
                </p>
              </div>
            ) : (
              entries.map((entry, index) => (
                <div
                  key={`${entry.shoppingItemId ?? entry.product.name}-${index}`}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="mb-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {entry.product.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Quantity defaults to 1
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemoveEntry(index)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <FormField>
                      <FormFieldLabel>Quantity</FormFieldLabel>
                      <Input
                        value={entry.quantity}
                        inputMode="numeric"
                        placeholder="1"
                        onChange={(event) =>
                          handleQuantityChange(index, event.target.value)
                        }
                      />
                    </FormField>
                    <FormField>
                      <FormFieldLabel>Price</FormFieldLabel>
                      <Input
                        value={entry.price}
                        inputMode="decimal"
                        placeholder="12.45,-"
                        onChange={(event) =>
                          handlePriceChange(index, event.target.value)
                        }
                      />
                    </FormField>
                    <FormField>
                      <FormFieldLabel>Total</FormFieldLabel>
                      <Input
                        value={entry.total}
                        inputMode="decimal"
                        placeholder="24.90,-"
                        onChange={(event) =>
                          handleTotalChange(index, event.target.value)
                        }
                      />
                    </FormField>
                  </div>
                </div>
              ))
            )}
          </div>

          <Card size="sm" className="border border-dashed border-border/70 bg-surface/40">
            <CardContent className="space-y-2.5 pt-3">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <FormField>
                  <FormFieldLabel>Add row</FormFieldLabel>
                  <ProductSelect
                    products={products}
                    defaultValue={selectedProduct?.name}
                    onValueChange={setSelectedProduct}
                  />
                </FormField>
                <LoaderButton type="button" isLoading={false} onClick={handleAddProduct} className="w-full md:w-auto">
                  <Plus className="size-3.5" />
                  Add row
                </LoaderButton>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-2 md:grid-cols-2">
            <FormField>
              <FormFieldLabel>
                Store <span className="text-muted-foreground/60">(Optional)</span>
              </FormFieldLabel>
              <Input
                value={store}
                onChange={(event) => setStore(event.target.value)}
                placeholder="Rema 1000, Coop Extra..."
              />
            </FormField>
            <FormField>
              <FormFieldLabel>
                Date <span className="text-muted-foreground/60">(Optional)</span>
              </FormFieldLabel>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    data-empty={!date}
                    className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                    type="button"
                  >
                    {format(date, "PPP")}
                    <ChevronDownIcon className="size-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    defaultMonth={new Date()}
                  />
                </PopoverContent>
              </Popover>
            </FormField>
          </div>

          <FormField>
            <FormFieldLabel>
              Description <span className="text-muted-foreground/60">(Optional)</span>
            </FormFieldLabel>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add a note for this grocery trip"
              className="resize-none"
            />
          </FormField>

          <div className="grid gap-2 md:grid-cols-2">
            <Button
              type="button"
              variant={keepUncheckedItems ? "default" : "outline"}
              onClick={() => setKeepUncheckedItems(true)}
            >
              Keep unchecked items
            </Button>
            <Button
              type="button"
              variant={!keepUncheckedItems ? "default" : "outline"}
              onClick={() => setKeepUncheckedItems(false)}
            >
              Remove unchecked items
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface/50 px-3 py-2">
            <span className="text-sm text-muted-foreground">Checkout total</span>
            <span className="text-sm font-semibold tabular-nums">
              {formatAmount(checkoutTotal)}
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <LoaderButton
            type="submit"
            className="w-full"
            isLoading={mutation.isPending}
            disabled={entries.length === 0}
          >
            Complete shopping
          </LoaderButton>
        </CardFooter>
      </Card>
    </form>
  );
}
