import {
  Form,
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { Button } from "@/components/ui/button";
import { LoaderButton } from "@/components/custom/loader.button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Product } from "@/features/products/products.models";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { X, Plus, ChevronDownIcon, Minus, ShoppingBag } from "lucide-react";
import { ProductSelect } from "@/components/custom/product-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatAmount } from "@/utils/format";
import { transactionMutations } from "../transactions.mutations";
import { useNavigate } from "@tanstack/react-router";
import {
  NewEntryDTO,
  saveEntrySchema,
  saveTransactionSchema,
} from "../transactions.dtos";
import { EntryType } from "../transactions.models";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

const NEW_ENTRY_DEFAULT_VALUES = {
  product: undefined,
  price: "",
  quantity: "",
  type: "expense" as EntryType,
};

export function NewTransactionForm({ products }: { products: Product[] }) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [entries, setEntries] = useState<NewEntryDTO[]>([]);

  const navigate = useNavigate();
  const mutation = transactionMutations.saveTransaction();

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      date: new Date(),
      entries: [],
    },
    resolver: zodResolver(saveTransactionSchema),
  });

  const selectedDate = watch("date");

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(
      {
        ...data,
      },
      {
        onSuccess: (data) => {
          const [error, transaction] = data;
          if (error) {
            // TODO: Handle errors
          } else {
            navigate({
              to: "/dashboard/transactions/$id",
              params: {
                id: transaction.id,
              },
            });
          }
        },
      },
    );
  });

  function handleNewEntry(entry: NewEntryDTO) {
    setEntries((prev) => {
      const updated = [...prev, entry];
      setValue("entries", updated);
      return updated;
    });
  }

  function handleRemoveEntry(index: number) {
    setEntries((prev) => {
      const rest = prev.filter((_, i) => i !== index);
      setValue("entries", rest);
      return rest;
    });
  }

  function handleDateSelect(date: Date | undefined) {
    setValue("date", date || new Date());
    setDatePickerOpen(false);
  }

  function getEntryTotal(entry: NewEntryDTO) {
    return Number(entry.price) * Number(entry.quantity);
  }

  return (
    <Form onSubmit={onSubmit}>
      <Card>
        <CardContent className="space-y-4">
          {/* Entries list */}
          <div>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Items
            </h3>
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-4 py-6 text-center">
                <div className="size-8 rounded-lg bg-muted grid place-items-center mb-2">
                  <ShoppingBag className="size-3.5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No products added yet
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                {entries.map((entry, i) => (
                  <div
                    key={`${entry.product.id}-${entry.quantity}-${i}`}
                    className={`flex items-center gap-3 px-3 py-2.5 ${i !== entries.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {entry.product.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {entry.quantity} x {formatAmount(entry.price)},-
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums ${entry.type === "expense" ? "text-expense" : "text-income"}`}
                    >
                      {formatAmount(
                        entry.type === "expense"
                          ? -getEntryTotal(entry)
                          : getEntryTotal(entry),
                        { sign: true },
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      type="button"
                      onClick={() => handleRemoveEntry(i)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <NewEntryDialog products={products} onSave={handleNewEntry} />
          <FormFieldError>{errors.entries?.message}</FormFieldError>

          <Separator />

          <FormField>
            <FormFieldLabel>
              Store <span className="text-muted-foreground/60">(Optional)</span>
            </FormFieldLabel>
            <Input
              {...register("store")}
              placeholder="Rema 1000, Coop Extra..."
            />
            <FormFieldError>{errors.store?.message}</FormFieldError>
          </FormField>
          <FormField>
            <FormFieldLabel>
              Description{" "}
              <span className="text-muted-foreground/60">(Optional)</span>
            </FormFieldLabel>
            <Textarea
              {...register("description")}
              placeholder="Want to document more about the transaction?"
              className="resize-none"
            />
            <FormFieldError>{errors.description?.message}</FormFieldError>
          </FormField>
          <FormField>
            <FormFieldLabel>Date of transaction</FormFieldLabel>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  data-empty={!selectedDate}
                  className="w-53 justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                >
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <ChevronDownIcon className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  defaultMonth={new Date()}
                />
              </PopoverContent>
            </Popover>
            <FormFieldError>{errors.date?.message}</FormFieldError>
          </FormField>
          <Input {...register("source")} value="manual" className="hidden" />
        </CardContent>
        <CardFooter>
          <LoaderButton type="submit" className="w-full" isLoading={mutation.isPending}>
            Save transaction
          </LoaderButton>
        </CardFooter>
      </Card>
    </Form>
  );
}

function NewEntryDialog({
  products,
  onSave,
}: {
  products: Product[];
  onSave: (entry: NewEntryDTO) => void;
}) {
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState("");
  const [lastEditedField, setLastEditedField] = useState<"price" | "total">(
    "price",
  );

  const {
    register,
    setValue,
    getValues,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: NEW_ENTRY_DEFAULT_VALUES,
    resolver: zodResolver(saveEntrySchema),
  });

  const price = watch("price");
  const quantity = watch("quantity");

  const priceRegistration = register("price");
  const quantityRegistration = register("quantity");

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

  useEffect(() => {
    const parsedQuantity = parsePositiveNumber(quantity);

    if (!parsedQuantity) {
      if (lastEditedField === "price") {
        setTotal("");
      }

      return;
    }

    if (lastEditedField === "total") {
      const parsedTotal = parsePositiveNumber(total);

      if (!parsedTotal) {
        return;
      }

      const nextPrice = formatCalculatedAmount(parsedTotal / parsedQuantity);
      if (price !== nextPrice) {
        setValue("price", nextPrice, { shouldValidate: true, shouldDirty: true });
      }

      return;
    }

    const parsedPrice = parsePositiveNumber(price);

    if (!parsedPrice) {
      setTotal("");
      return;
    }

    const nextTotal = formatCalculatedAmount(parsedPrice * parsedQuantity);
    if (total !== nextTotal) {
      setTotal(nextTotal);
    }
  }, [lastEditedField, price, quantity, setValue, total]);

  function addEntry(type: EntryType) {
    setValue("type", type);
    handleSubmit((data) => {
      let entryData = { ...data };

      if (lastEditedField === "total") {
        const parsedTotal = parsePositiveNumber(total);
        if (parsedTotal) {
          // Preserve the exact total the user entered. Because the DB stores
          // price as numeric(10,2), dividing total/quantity would be rounded
          // (e.g. 10/3 → 3.33, and 3.33×3 = 9.99 ≠ 10). Instead we store the
          // total as the price with quantity=1 so the arithmetic is exact.
          entryData = { ...entryData, price: total, quantity: "1" };
        }
      }

      onSave({ ...entryData, type });
      setOpen(false);
      resetForm();
    })();
  }

  function handleProductSelect(product: Product) {
    if (product.id.length === 0) {
      setValue("product", { id: null, name: product.name });
    } else {
      setValue("product", { id: product.id, name: product.name });
    }
  }

  function handleOpenChange(open: boolean) {
    setOpen(open);

    if (!open) {
      resetForm();
    }
  }

  // TODO: Does not work...
  function resetForm() {
    setTotal("");
    setLastEditedField("price");
    reset(NEW_ENTRY_DEFAULT_VALUES);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="size-3.5" />
          Add product
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transaction Entry</DialogTitle>
          <DialogDescription>
            Add a product with quantity and either unit price or total
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 gap-y-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <FormField>
              <FormFieldLabel>Product</FormFieldLabel>
              <ProductSelect
                {...register("product")}
                products={products}
                defaultValue={getValues("product.name") || undefined}
                onValueChange={handleProductSelect}
              />
              <FormFieldError>
                {errors.product && "Must select a product"}
              </FormFieldError>
            </FormField>
          </div>
          <FormField>
            <FormFieldLabel>Price</FormFieldLabel>
            <Input
              {...priceRegistration}
              inputMode="decimal"
              placeholder="12.45,-"
              onChange={(event) => {
                setLastEditedField("price");
                priceRegistration.onChange(event);
              }}
            />
            <FormFieldError>{errors.price?.message}</FormFieldError>
          </FormField>
          <FormField>
            <FormFieldLabel>Quantity</FormFieldLabel>
            <Input
              {...quantityRegistration}
              inputMode="numeric"
              placeholder="1"
              onChange={(event) => {
                quantityRegistration.onChange(event);
              }}
            />
            <FormFieldError>{errors.quantity?.message}</FormFieldError>
          </FormField>
          <FormField>
            <FormFieldLabel>Total</FormFieldLabel>
            <Input
              value={total}
              inputMode="decimal"
              placeholder="24.90,-"
              onChange={(event) => {
                setLastEditedField("total");
                setTotal(event.target.value);
              }}
            />
          </FormField>
        </div>
        <DialogFooter className="grid grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="border-expense/30 text-expense hover:bg-expense/10 hover:text-expense"
            onClick={() => addEntry("expense")}
          >
            <Minus className="size-3.5" />
            Expense
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-income/30 text-income hover:bg-income/10 hover:text-income"
            onClick={() => addEntry("income")}
          >
            <Plus className="size-3.5" />
            Income
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
