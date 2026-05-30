import {
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { LoaderButton } from "@/components/custom/loader.button";
import { ProductSelect } from "@/components/custom/product-select";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { automationQueries } from "@/features/automation/automation.queries";
import { AutomationTokenMetadata } from "@/features/automation/automation.models";
import { Product } from "@/features/products/products.models";
import { FullTransaction } from "@/features/transactions/transactions.models";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/utils/format";
import { format } from "date-fns";
import {
  Check,
  ChevronDownIcon,
  Link2,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { shoppingMutations } from "../shopping.mutations";
import { ShoppingListWithItems } from "../shopping.models";
import {
  CheckoutEntry,
  getCheckoutLinkSuggestion,
  makeCheckoutEntry,
  getPrefilledCheckoutEntries,
  getSelectableCheckoutTransactions,
  hasActiveAutomationTokens,
} from "./shopping-checkout.utils";
import { BREAKPOINTS, useBreakpoint } from "@/hooks/use-breakpoint";

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

type EntryTouched = {
  quantity: boolean;
  price: boolean;
  total: boolean;
};

function createEmptyTouched(): EntryTouched {
  return { quantity: false, price: false, total: false };
}

function formatTransactionOptionLabel(transaction: FullTransaction) {
  const title = transaction.store || transaction.description || "Transaction";
  return `${format(transaction.date, "HH:mm")} ${title}`;
}

function formatTransactionSuggestionDate(transaction: FullTransaction) {
  return format(transaction.date, "do MMMM - HH:mm");
}

function getActiveTokens(
  data: [unknown, AutomationTokenMetadata[]] | undefined,
) {
  if (!data || data[0] || !data[1]) {
    return [];
  }

  return data[1];
}

function getTransactions(data: [unknown, FullTransaction[]] | undefined) {
  if (!data || data[0] || !data[1]) {
    return [];
  }

  return data[1];
}

const CREATE_NEW_TRANSACTION_VALUE = "__create_new_transaction__";

function TransactionLinkSelect({
  transactions,
  value,
  onChange,
}: {
  transactions: FullTransaction[];
  value?: FullTransaction;
  onChange: (transaction?: FullTransaction) => void;
}) {
  const anchor = useComboboxAnchor();
  const items = useMemo(
    () => [null, ...transactions] as Array<FullTransaction | null>,
    [transactions],
  );

  return (
    <Combobox
      items={items}
      value={value ?? null}
      itemToStringValue={(item) => item?.id ?? CREATE_NEW_TRANSACTION_VALUE}
      itemToStringLabel={(item) =>
        item ? formatTransactionOptionLabel(item) : "Create a new transaction"
      }
      isItemEqualToValue={(item, currentValue) => item?.id === currentValue?.id}
      onValueChange={(nextValue) => onChange(nextValue ?? undefined)}
    >
      <div ref={anchor}>
        <ComboboxInput
          className="w-full"
          placeholder="Create a new transaction"
          showClear={Boolean(value)}
        />
      </div>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No transactions found.</ComboboxEmpty>
        <ComboboxList>
          {(transaction) =>
            transaction ? (
              <ComboboxItem key={transaction.id} value={transaction}>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2">
                  <span className="truncate">
                    {formatTransactionOptionLabel(transaction)}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatAmount(transaction.totalPrice)}
                  </span>
                </div>
              </ComboboxItem>
            ) : (
              <ComboboxItem
                key={CREATE_NEW_TRANSACTION_VALUE}
                value={transaction}
              >
                Create a new transaction
              </ComboboxItem>
            )
          }
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
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
  const [selectedTransactionId, setSelectedTransactionId] =
    useState<string>("");
  const [productSelectResetKey, setProductSelectResetKey] = useState(0);
  const checkedItems = useMemo(
    () => list.items.filter((item) => item.checked),
    [list.items],
  );

  const [entries, setEntries] = useState<CheckoutEntry[]>(() =>
    getPrefilledCheckoutEntries(list),
  );
  const [entryTouched, setEntryTouched] = useState<EntryTouched[]>(() =>
    getPrefilledCheckoutEntries(list).map(() => createEmptyTouched()),
  );
  const [store, setStore] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [keepUncheckedItems, setKeepUncheckedItems] = useState(true);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { data: automationTokenResult } = useQuery(
    automationQueries.getAutomationTokensOptions(),
  );
  const { data: transactionResult } = useQuery(
    transactionQueries.getTransactionsOptions(
      date.getFullYear(),
      date.getMonth(),
    ),
  );

  const isMobile = useBreakpoint(BREAKPOINTS.md);

  const automationTokens = useMemo(
    () => getActiveTokens(automationTokenResult),
    [automationTokenResult],
  );
  const transactions = useMemo(
    () => getTransactions(transactionResult),
    [transactionResult],
  );
  const hasAutomation = hasActiveAutomationTokens(automationTokens);
  const selectableTransactions = useMemo(
    () => getSelectableCheckoutTransactions(transactions, date),
    [date, transactions],
  );
  const suggestedTransaction = useMemo(
    () =>
      hasAutomation
        ? getCheckoutLinkSuggestion(selectableTransactions, date)
        : undefined,
    [date, hasAutomation, selectableTransactions],
  );
  const selectedTransaction = useMemo(
    () =>
      selectableTransactions.find(
        (transaction) => transaction.id === selectedTransactionId,
      ),
    [selectableTransactions, selectedTransactionId],
  );

  const entryErrors = useMemo(
    () =>
      entries.map((entry, index) => {
        const touched = entryTouched[index] ?? createEmptyTouched();
        const hasQuantity = parsePositiveNumber(entry.quantity) !== null;
        const hasPrice = parsePositiveNumber(entry.price) !== null;
        const hasTotal = parsePositiveNumber(entry.total) !== null;
        const pairInvalid = !hasPrice && !hasTotal;

        return {
          quantity:
            !hasQuantity && (touched.quantity || submitAttempted)
              ? "Enter a quantity"
              : "",
          price:
            pairInvalid && (touched.price || submitAttempted)
              ? "Enter a price"
              : "",
          total:
            pairInvalid && (touched.total || submitAttempted)
              ? "Enter a total"
              : "",
        };
      }),
    [entries, entryTouched, submitAttempted],
  );

  useEffect(() => {
    setEntries((prev) => {
      const next = checkedItems.map((item) => {
        const existing = prev.find((entry) => entry.shoppingItemId === item.id);
        return (
          existing ?? {
            ...makeCheckoutEntry(item),
            price: "",
            total: "",
          }
        );
      });

      if (
        next.length === prev.length &&
        next.every((entry, index) => entry === prev[index])
      ) {
        return prev;
      }

      setEntryTouched((prevTouched) => {
        return next.map((entry) => {
          const matchIndex = prev.findIndex(
            (prevEntry) => prevEntry.shoppingItemId === entry.shoppingItemId,
          );

          if (matchIndex === -1) {
            return createEmptyTouched();
          }

          return prevTouched[matchIndex] ?? createEmptyTouched();
        });
      });

      return next;
    });
  }, [checkedItems]);

  useEffect(() => {
    if (
      selectedTransactionId.length > 0 &&
      !selectableTransactions.some(
        (transaction) => transaction.id === selectedTransactionId,
      )
    ) {
      setSelectedTransactionId("");
    }
  }, [selectableTransactions, selectedTransactionId]);

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
    setEntries((prev) => prev.filter((_, i) => i !== index));
    setEntryTouched((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddProduct(product: Product) {
    setEntries((prev) => [...prev, makeProductEntry(product)]);
    setEntryTouched((prev) => [...prev, createEmptyTouched()]);
    setProductSelectResetKey((prev) => prev + 1);
  }

  function markTouched(index: number, field: keyof EntryTouched) {
    setEntryTouched((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: true } : entry,
      ),
    );
  }

  function handleDateSelect(nextDate: Date | undefined) {
    setDate(nextDate ?? new Date());
    setDatePickerOpen(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);

    const hasValidationError = entries.some((entry) => {
      const hasQuantity = parsePositiveNumber(entry.quantity) !== null;
      const hasPrice = parsePositiveNumber(entry.price) !== null;
      const hasTotal = parsePositiveNumber(entry.total) !== null;
      return !hasQuantity || (!hasPrice && !hasTotal);
    });

    if (hasValidationError) {
      return;
    }

    const shoppingItemIds = entries.flatMap((entry) =>
      entry.shoppingItemId ? [entry.shoppingItemId] : [],
    );

    mutation.mutate(
      {
        store,
        description,
        date,
        transactionId: selectedTransactionId || undefined,
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
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Trip details</h3>
          <p className="text-xs text-muted-foreground">
            Add context for the checkout before assigning items.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
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
            Description{" "}
            <span className="text-muted-foreground/60">(Optional)</span>
          </FormFieldLabel>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add a note for this grocery trip"
            className="resize-none"
          />
        </FormField>
      </section>

      <section className="space-y-4">
        <div className="sticky top-2 z-20 rounded-xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Checkout total
              </p>
              <p className="text-xs text-muted-foreground">
                {entries.length} row{entries.length !== 1 ? "s" : ""} in
                checkout
              </p>
            </div>
            <span className="text-base font-semibold tabular-nums">
              {formatAmount(checkoutTotal)}
            </span>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Items and pricing</h3>
            <p className="text-xs text-muted-foreground">
              Add products and adjust quantities, price, or total per row.
            </p>
          </div>

          <div className="space-y-3">
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
                  className="space-y-3 rounded-xl border border-border bg-background/50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
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
                        aria-invalid={
                          entryErrors[index]?.quantity ? true : undefined
                        }
                        className={
                          entryErrors[index]?.quantity
                            ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                            : undefined
                        }
                        onBlur={() => markTouched(index, "quantity")}
                        onChange={(event) =>
                          handleQuantityChange(index, event.target.value)
                        }
                      />
                      <FormFieldError>
                        {entryErrors[index]?.quantity}
                      </FormFieldError>
                    </FormField>
                    <FormField>
                      <FormFieldLabel>Price</FormFieldLabel>
                      <Input
                        value={entry.price}
                        inputMode="decimal"
                        placeholder="12.45,-"
                        aria-invalid={
                          entryErrors[index]?.price ? true : undefined
                        }
                        className={
                          entryErrors[index]?.price
                            ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                            : undefined
                        }
                        onBlur={() => markTouched(index, "price")}
                        onChange={(event) =>
                          handlePriceChange(index, event.target.value)
                        }
                      />
                      <FormFieldError>
                        {entryErrors[index]?.price}
                      </FormFieldError>
                    </FormField>
                    <FormField>
                      <FormFieldLabel>Total</FormFieldLabel>
                      <Input
                        value={entry.total}
                        inputMode="decimal"
                        placeholder="24.90,-"
                        aria-invalid={
                          entryErrors[index]?.total ? true : undefined
                        }
                        className={
                          entryErrors[index]?.total
                            ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                            : undefined
                        }
                        onBlur={() => markTouched(index, "total")}
                        onChange={(event) =>
                          handleTotalChange(index, event.target.value)
                        }
                      />
                      <FormFieldError>
                        {entryErrors[index]?.total}
                      </FormFieldError>
                    </FormField>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <FormField>
              <ProductSelect
                key={productSelectResetKey}
                products={products}
                onValueChange={handleAddProduct}
              />
            </FormField>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Link transaction</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Optional. Leave this empty to create a new transaction.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {selectedTransaction
                  ? "Linked transaction selected"
                  : "A new transaction will be created"}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedTransaction
                  ? `${selectedTransaction.store || selectedTransaction.description || "Transaction"} · ${formatAmount(selectedTransaction.totalPrice)}`
                  : "Use the smart suggestion or choose a transaction manually if you want to update an existing one."}
              </p>
            </div>
            {selectedTransaction ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTransactionId("")}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        {suggestedTransaction ? (
          <button
            type="button"
            className={cn(
              "w-full rounded-xl border px-4 py-4 text-left transition-all",
              selectedTransactionId === suggestedTransaction.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-background hover:border-border/80 hover:bg-muted/30",
            )}
            onClick={() => setSelectedTransactionId(suggestedTransaction.id)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="size-4 text-muted-foreground" />
                  Smart suggestion
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {suggestedTransaction.store || "Transaction"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTransactionSuggestionDate(suggestedTransaction)} ·{" "}
                    {formatAmount(suggestedTransaction.totalPrice)}
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                  selectedTransactionId === suggestedTransaction.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-transparent",
                )}
              >
                <Check className="size-3.5" />
              </div>
            </div>
          </button>
        ) : null}

        <FormField>
          <FormFieldLabel>
            {hasAutomation
              ? "Or choose another transaction"
              : "Select a transaction"}
          </FormFieldLabel>
          <TransactionLinkSelect
            transactions={selectableTransactions}
            value={selectedTransaction}
            onChange={(transaction) =>
              setSelectedTransactionId(transaction?.id ?? "")
            }
          />
        </FormField>

        {selectableTransactions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No transactions found for {format(date, "PPP")}.
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Finish checkout</h3>
          <p className="text-xs text-muted-foreground">
            Decide what should happen with the unchecked items after checkout.
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <Button
            type="button"
            variant={keepUncheckedItems ? "secondary" : "ghost"}
            onClick={() => setKeepUncheckedItems(true)}
            className="justify-between"
          >
            <Check
              className={`${keepUncheckedItems ? "opacity-100" : "opacity-0"}`}
            />
            Keep unchecked items
            <Check className="opacity-0" />
          </Button>
          <Button
            type="button"
            variant={!keepUncheckedItems ? "secondary" : "ghost"}
            onClick={() => setKeepUncheckedItems(false)}
            className="justify-between"
          >
            {isMobile ? (
              <Check
                className={`${!keepUncheckedItems ? "opacity-100" : "opacity-0"}`}
              />
            ) : (
              <Check className="opacity-0" />
            )}
            Remove unchecked items
            {!isMobile ? (
              <Check
                className={`${!keepUncheckedItems ? "opacity-100" : "opacity-0"}`}
              />
            ) : (
              <Check className="opacity-0" />
            )}
          </Button>
        </div>

        <LoaderButton
          type="submit"
          className="w-full"
          disabled={entries.length === 0}
          isLoading={mutation.isPending}
        >
          Complete shopping
        </LoaderButton>
      </section>
    </form>
  );
}
