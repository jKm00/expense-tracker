import {
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { ProductSelect } from "@/components/custom/product-select";
import { LoaderButton } from "@/components/custom/loader.button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Product } from "@/features/products/products.models";
import { saveEntrySchema } from "../transactions.dtos";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { EntryType } from "../transactions.models";
import { transactionMutations } from "../transactions.mutations";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

export function SimpleTransactionForm({ products }: { products: Product[] }) {
  const mutation = transactionMutations.saveTransaction();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    getValues,
    setValue,
    formState: { errors },
    handleSubmit,
    reset,
    watch,
  } = useForm({
    defaultValues: {
      quantity: "1",
    },
    resolver: zodResolver(saveEntrySchema),
  });
  const selectedProduct = watch("product");
  const price = watch("price");
  const canSubmit = Boolean(selectedProduct && price);

  const onSubmit = (type: EntryType) => {
    setValue("type", type);
    handleSubmit((data) => {
      setSubmitError(null);
      mutation.mutate(
        {
          source: "manual",
          entries: [data],
          date: new Date(),
        },
        {
          onSuccess: (res) => {
            const [error] = res;
            if (error) {
              setSubmitError(error.message);
              toast.error(error.message);
            } else {
              toast.success("Transaction saved");
              reset();
            }
          },
          onError: () => {
            setSubmitError("Transaction could not be saved. Check your connection and try again.");
          },
        },
      );
    })();
  };

  function handleProductSelect(product: Product) {
    const isNewProduct = product.id.length === 0;
    if (isNewProduct) {
      setValue("product", {
        id: null,
        name: product.name,
      });
    } else {
      setValue("product", product);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Quick Log</CardTitle>
            <CardDescription>Add a transaction</CardDescription>
          </div>
          <Link
            to="/dashboard/transactions/new"
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Advanced form
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <FormField>
            <FormFieldLabel>Product</FormFieldLabel>
            <ProductSelect
              products={products}
              defaultValue={getValues("product.name") ?? undefined}
              onValueChange={handleProductSelect}
            />
            <FormFieldError>
              {errors.product && "Must select a product"}
            </FormFieldError>
          </FormField>
          <FormField>
            <FormFieldLabel>Price</FormFieldLabel>
            <Input
              {...register("price")}
              inputMode="decimal"
              placeholder="123.45,-"
              className="h-11 md:h-9 text-base md:text-sm px-3"
            />
            <FormFieldError>{errors.price?.message}</FormFieldError>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <LoaderButton
              onClick={() => onSubmit("expense")}
              variant="outline"
              className="h-11 md:h-9 border-expense/30 text-expense hover:bg-expense/10 hover:text-expense"
              type="button"
              isLoading={mutation.isPending}
              disabled={!canSubmit || mutation.isPending}
            >
              <Minus className="size-4" />
              Expense
            </LoaderButton>
            <LoaderButton
              onClick={() => onSubmit("income")}
              variant="outline"
              className="h-11 md:h-9 border-income/30 text-income hover:bg-income/10 hover:text-income"
              type="button"
              isLoading={mutation.isPending}
              disabled={!canSubmit || mutation.isPending}
            >
              <Plus className="size-4" />
              Income
            </LoaderButton>
          </div>
          {!canSubmit ? (
            <p className="text-xs text-muted-foreground">
              Select a product and enter a price to save this transaction.
            </p>
          ) : submitError ? (
            <p className="text-xs text-destructive">{submitError}</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
