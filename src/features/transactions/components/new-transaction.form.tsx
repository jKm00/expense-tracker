import {
  Form,
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Product } from "@/features/products/products.models";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X, Plus } from "lucide-react";
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
import { transactionMutations } from "../transactions.mutations";
import { useNavigate } from "@tanstack/react-router";
import {
  NewEntryDTO,
  saveEntrySchema,
  saveTransactionSchema,
} from "../transactions.dtos";
import { EntryType } from "../transactions.models";

export function NewTransactionForm({ products }: { products: Product[] }) {
  const [entries, setEntries] = useState<NewEntryDTO[]>([]);

  const navigate = useNavigate();
  const mutation = transactionMutations.saveTransaction();

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      entries: [],
    },
    resolver: zodResolver(saveTransactionSchema),
  });

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

  return (
    <Form onSubmit={onSubmit}>
      <Card>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground text-center"
                  >
                    No products added...
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, i) => (
                  <TableRow key={`${entry.product.id}-${entry.quantity}-${i}`}>
                    <TableCell>{entry.product.name}</TableCell>
                    <TableCell>
                      {entry.type === "expense" ? "-" : "+"}
                      {entry.price}
                    </TableCell>
                    <TableCell>{entry.quantity}</TableCell>
                    <TableCell className="text-center">
                      {/* TODO: Possibility to edit directly */}
                      {/* <Button variant="ghost" type="button"> */}
                      {/*   <SquarePen /> */}
                      {/* </Button> */}
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => handleRemoveEntry(i)}
                      >
                        <X />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <NewEntryDialog products={products} onSave={handleNewEntry} />
          <FormFieldError>{errors.entries?.message}</FormFieldError>
          <Separator className="mb-8 mt-2" />
          <FormField>
            <FormFieldLabel>
              Store <span className="text-muted-foreground">(Optional)</span>
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
              <span className="text-muted-foreground">(Optional)</span>
            </FormFieldLabel>
            <Textarea
              {...register("description")}
              placeholder="Want to document more about the transaction?"
              className="resize-none"
            />
            <FormFieldError>{errors.description?.message}</FormFieldError>
          </FormField>
          <Input {...register("source")} value="manual" className="hidden" />
        </CardContent>
        <CardFooter>
          <Button type="submit">Save transaction</Button>
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
          <Plus />
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
            <Input {...register("price")} placeholder="12.45,-" />
            <FormFieldError>{errors.price?.message}</FormFieldError>
          </FormField>
          <FormField>
            <FormFieldLabel>Quantity</FormFieldLabel>
            <Input {...register("quantity")} placeholder="1" />
            <FormFieldError>{errors.quantity?.message}</FormFieldError>
          </FormField>
        </div>
        <DialogFooter className="grid grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="border-red-400 text-red-400"
            onClick={() => addEntry("expense")}
          >
            Expense
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-green-400 text-green-400"
            onClick={() => addEntry("income")}
          >
            Income
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
