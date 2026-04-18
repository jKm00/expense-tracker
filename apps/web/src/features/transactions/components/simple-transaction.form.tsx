import {
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { ProductSelect } from "@/components/custom/product-select";
import { LoaderButton } from "@/components/custom/loader.button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Product } from "@/features/products/products.models";
import { saveEntrySchema } from "../transactions.dtos";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { EntryType } from "../transactions.models";
import { transactionMutations } from "../transactions.mutations";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";

export function SimpleTransactionForm({ products }: { products: Product[] }) {
  const mutation = transactionMutations.saveTransaction();

  const {
    register,
    getValues,
    setValue,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm({
    defaultValues: {
      quantity: "1",
    },
    resolver: zodResolver(saveEntrySchema),
  });

  const onSubmit = (type: EntryType) => {
    setValue("type", type);
    handleSubmit((data) => {
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
              // TODO: Handle errors
              toast.error(error.message);
            } else {
              toast.success("Transaction saved");
              reset();
            }
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
    <form>
      <Card>
        <CardContent className="space-y-4">
          <FormField>
            <FormFieldLabel>Product</FormFieldLabel>
            <ProductSelect
              products={products}
              defaultValue={getValues("product.id") ?? undefined}
              onValueChange={handleProductSelect}
            />
            <FormFieldError>
              {errors.product && "Must select a product"}
            </FormFieldError>
          </FormField>
          <FormField>
            <FormFieldLabel>Price</FormFieldLabel>
            <Input {...register("price")} inputMode="decimal" placeholder="123.45,-" />
            <FormFieldError>{errors.price?.message}</FormFieldError>
          </FormField>
        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-2">
          <LoaderButton
            onClick={() => onSubmit("expense")}
            variant="outline"
            className="border-expense/30 text-expense hover:bg-expense/10 hover:text-expense"
            type="button"
            isLoading={mutation.isPending}
          >
            <Minus className="size-3.5" />
            Expense
          </LoaderButton>
          <LoaderButton
            onClick={() => onSubmit("income")}
            variant="outline"
            className="border-income/30 text-income hover:bg-income/10 hover:text-income"
            type="button"
            isLoading={mutation.isPending}
          >
            <Plus className="size-3.5" />
            Income
          </LoaderButton>
        </CardFooter>
      </Card>
    </form>
  );
}
