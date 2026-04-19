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
  UpdateEntryDTO,
  saveEntrySchema,
  updateTransactionSchema,
} from "../transactions.dtos";
import { EntryType, FullTransaction } from "../transactions.models";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

export function EditTransactionForm({
  products,
  transaction,
}: {
  products: Product[];
  transaction: FullTransaction;
}) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [entries, setEntries] = useState<UpdateEntryDTO[]>([]);

  const navigate = useNavigate();
  const mutation = transactionMutations.updateTransaction();

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      transactionId: transaction.id,
      store: transaction.store || "",
      description: transaction.description || "",
      date: new Date(transaction.date),
      entries: [] as UpdateEntryDTO[],
    },
    resolver: zodResolver(updateTransactionSchema),
  });

  // Initialize entries from transaction
  useEffect(() => {
    const initialEntries: UpdateEntryDTO[] = transaction.entries.map(
      (entry) => ({
        id: entry.id,
        product: {
          id: entry.products?.id || null,
          name: entry.products?.name || "",
        },
        quantity: String(entry.quantity),
        price: String(entry.price),
        type: entry.type,
      }),
    );
    setEntries(initialEntries);
    setValue("entries", initialEntries);
  }, [transaction, setValue]);

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
                    key={`${entry.id || "new"}-${entry.product.id}-${entry.quantity}-${i}`}
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
                        entry.type === "expense" ? -Number(entry.price) : Number(entry.price),
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
          <Input
            {...register("transactionId")}
            value={transaction.id}
            className="hidden"
          />
        </CardContent>
        <CardFooter>
          <LoaderButton type="submit" className="w-full" isLoading={mutation.isPending}>
            Update transaction
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

  const {
    register,
    setValue,
    getValues,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(saveEntrySchema),
  });

  function addEntry(type: EntryType) {
    setValue("type", type);
    handleSubmit((data) => {
      onSave({
        ...data,
        type,
      });
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
    reset({
      product: undefined,
      price: undefined,
      quantity: undefined,
    });
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
            Add a product with quantity and price to the transaction
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 gap-y-4">
          <div className="col-span-2">
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
            <Input {...register("price")} inputMode="decimal" placeholder="12.45,-" />
            <FormFieldError>{errors.price?.message}</FormFieldError>
          </FormField>
          <FormField>
            <FormFieldLabel>Quantity</FormFieldLabel>
            <Input {...register("quantity")} inputMode="numeric" placeholder="1" />
            <FormFieldError>{errors.quantity?.message}</FormFieldError>
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
