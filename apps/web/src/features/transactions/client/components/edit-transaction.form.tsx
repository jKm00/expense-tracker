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
import { Product } from "@/features/products/shared/products.models";
import { Tag } from "@/features/tags/shared/tags.models";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type DefaultValues } from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Plus,
  ChevronDownIcon,
  Minus,
  ShoppingBag,
  Tag as TagIcon,
} from "lucide-react";
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
  type UpdateTransactionDTO,
} from "@/features/transactions/shared/transactions.dtos";
import { EntryType, FullTransaction } from "@/features/transactions/shared/transactions.models";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { TagSelect } from "@/features/tags/client/tag.select";
import { TagBadge } from "@/features/tags/client/tag";
import { NewTagDialog } from "@/features/tags/client/new-tag.dialog";

const NEW_ENTRY_DEFAULT_VALUES: DefaultValues<NewEntryDTO> = {
  product: undefined,
  price: "",
  quantity: "",
  type: "expense",
  tagIds: [],
};

export function EditTransactionForm({
  products,
  tags,
  transaction,
}: {
  products: Product[];
  tags: Tag[];
  transaction: FullTransaction;
}) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [entries, setEntries] = useState<UpdateEntryDTO[]>([]);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingEntryIndex, setEditingEntryIndex] = useState<number | null>(null);

  const navigate = useNavigate();
  const mutation = transactionMutations.updateTransaction();

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateTransactionDTO>({
    defaultValues: {
      transactionId: transaction.id,
      store: transaction.store || "",
      description: transaction.description || "",
      date: new Date(transaction.date),
      entries: [],
    },
    resolver: zodResolver(updateTransactionSchema),
  });

  useEffect(() => {
    const initialEntries: UpdateEntryDTO[] = transaction.entries.map((entry) => ({
      id: entry.id,
      product: {
        id: entry.products?.id || null,
        name: entry.products?.name || "",
      },
      quantity: String(entry.quantity),
      price: String(entry.price),
      type: entry.type,
      tagIds: entry.tags.map((tag) => tag.id),
    }));

    setEntries(initialEntries);
    setValue("entries", initialEntries);
  }, [transaction, setValue]);

  const selectedDate = watch("date");
  const editingEntry =
    editingEntryIndex === null ? undefined : entries[editingEntryIndex];
  const tagsById = useMemo(() => {
    return new Map(tags.map((tag) => [tag.id, tag]));
  }, [tags]);

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(
      {
        ...data,
      },
      {
        onSuccess: (data) => {
          const [error, updatedTransaction] = data;
          if (error) {
            return;
          }

          navigate({
            to: "/dashboard/transactions/$id",
            params: {
              id: updatedTransaction.id,
            },
          });
        },
      },
    );
  });

  function handleNewEntry(entry: UpdateEntryDTO) {
    setEntries((prev) => {
      const updated = [...prev, entry];
      setValue("entries", updated);
      return updated;
    });
  }

  function handleSaveEntry(entry: UpdateEntryDTO) {
    if (editingEntryIndex === null) {
      handleNewEntry(entry);
      return;
    }

    setEntries((prev) => {
      const updated = prev.map((existingEntry, index) =>
        index === editingEntryIndex ? entry : existingEntry,
      );
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

  function handleEditEntry(index: number) {
    setEditingEntryIndex(index);
    setEntryDialogOpen(true);
  }

  function handleEntryDialogOpenChange(open: boolean) {
    setEntryDialogOpen(open);

    if (!open) {
      setEditingEntryIndex(null);
    }
  }

  function handleDateSelect(date: Date | undefined) {
    setValue("date", date || new Date());
    setDatePickerOpen(false);
  }

  function getEntryTotal(entry: UpdateEntryDTO) {
    return Number(entry.price) * Number(entry.quantity);
  }

  return (
    <Form onSubmit={onSubmit}>
      <Card>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Items
            </h3>
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-4 py-6 text-center">
                <div className="mb-2 grid size-8 place-items-center rounded-lg bg-muted">
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
                    className={`flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40 ${i !== entries.length - 1 ? "border-b border-border" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleEditEntry(i)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleEditEntry(i);
                      }
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{entry.product.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {entry.quantity} x {formatAmount(entry.price)},-
                      </p>
                      {entry.tagIds && entry.tagIds.length > 0 && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {entry.tagIds
                            .map((tagId) => tagsById.get(tagId)?.name)
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
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
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveEntry(i);
                      }}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <NewEntryDialog
            products={products}
            tags={tags}
            open={entryDialogOpen}
            onOpenChange={handleEntryDialogOpenChange}
            initialEntry={editingEntry}
            onSave={handleSaveEntry}
          />
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
              Description <span className="text-muted-foreground/60">(Optional)</span>
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
          <LoaderButton
            type="submit"
            className="w-full"
            isLoading={mutation.isPending}
          >
            Update transaction
          </LoaderButton>
        </CardFooter>
      </Card>
    </Form>
  );
}

function NewEntryDialog({
  products,
  tags,
  open,
  onOpenChange,
  initialEntry,
  onSave,
}: {
  products: Product[];
  tags: Tag[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEntry?: UpdateEntryDTO;
  onSave: (entry: UpdateEntryDTO) => void;
}) {
  const [total, setTotal] = useState("");
  const [lastEditedField, setLastEditedField] = useState<"price" | "total">(
    "price",
  );
  const tagSelectContainerRef = useRef<HTMLDivElement>(null);

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewEntryDTO>({
    defaultValues: NEW_ENTRY_DEFAULT_VALUES,
    resolver: zodResolver(saveEntrySchema),
  });

  const selectedProduct = watch("product");
  const selectedTagIds = watch("tagIds") ?? [];
  const price = watch("price");
  const quantity = watch("quantity");
  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [tags, selectedTagIds],
  );

  const priceRegistration = register("price");
  const quantityRegistration = register("quantity");

  const isEditing = initialEntry !== undefined;

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

  function getDialogEntryTotal(entry: UpdateEntryDTO) {
    return Number(entry.price) * Number(entry.quantity);
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
        setValue("price", nextPrice, {
          shouldValidate: true,
          shouldDirty: true,
        });
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

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    if (initialEntry) {
      reset({
        product: initialEntry.product,
        price: initialEntry.price,
        quantity: initialEntry.quantity,
        type: initialEntry.type,
        tagIds: initialEntry.tagIds ?? [],
      });
      setLastEditedField("price");
      setTotal(formatCalculatedAmount(getDialogEntryTotal(initialEntry)));
      return;
    }

    resetForm();
  }, [initialEntry, open, reset]);

  function saveEntry(type: EntryType) {
    setValue("type", type);
    handleSubmit((data) => {
      onSave({
        ...data,
        id: initialEntry?.id,
        type,
        tagIds: data.tagIds ?? [],
      });
      onOpenChange(false);
    })();
  }

  function handleProductSelect(product: Product) {
    if (product.id.length === 0) {
      setValue("product", { id: null, name: product.name });
    } else {
      setValue("product", { id: product.id, name: product.name });
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  function handleTagsChange(nextTags: Tag[]) {
    setValue(
      "tagIds",
      nextTags.map((tag) => tag.id),
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
  }

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
          <DialogTitle>
            {isEditing ? "Edit Transaction Entry" : "Transaction Entry"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the product, quantity, or pricing for this item"
              : "Add a product with quantity and either unit price or total"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 gap-y-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <FormField>
              <FormFieldLabel>Product</FormFieldLabel>
              <ProductSelect
                key={selectedProduct?.id ?? selectedProduct?.name ?? "edit-entry-product"}
                products={products}
                defaultValue={selectedProduct?.name}
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

          <div className="sm:col-span-3" ref={tagSelectContainerRef}>
            <FormField>
              <div className="mb-2 flex items-center justify-between gap-2">
                <FormFieldLabel>
                  Entry tags <span className="text-muted-foreground/60">(Optional)</span>
                </FormFieldLabel>
                <NewTagDialog />
              </div>
              <TagSelect
                tags={tags}
                value={selectedTags}
                onChange={handleTagsChange}
                placeholder="Search tags..."
                className="w-full"
                portalContainer={tagSelectContainerRef}
              />
              {selectedTags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedTags.map((tag) => (
                    <TagBadge key={tag.id} tag={tag}>
                      <TagIcon className="size-3" />
                      {tag.name}
                    </TagBadge>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No tags selected</p>
              )}
            </FormField>
          </div>
        </div>
        <DialogFooter className="grid grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="border-expense/30 text-expense hover:bg-expense/10 hover:text-expense"
            onClick={() => saveEntry("expense")}
          >
            <Minus className="size-3.5" />
            Expense
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-income/30 text-income hover:bg-income/10 hover:text-income"
            onClick={() => saveEntry("income")}
          >
            <Plus className="size-3.5" />
            Income
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
