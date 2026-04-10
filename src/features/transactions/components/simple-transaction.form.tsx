import {
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { ProductSelect } from "@/components/custom/product-select";
import { Button } from "@/components/ui/button";
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
            <Input {...register("price")} placeholder="123.45,-" />
            <FormFieldError>{errors.price?.message}</FormFieldError>
          </FormField>
        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => onSubmit("expense")}
            variant="outline"
            className="border-red-400/30 text-red-400 hover:bg-red-400/10 hover:text-red-400"
            type="button"
          >
            <Minus className="size-4" />
            Expense
          </Button>
          <Button
            onClick={() => onSubmit("income")}
            variant="outline"
            className="border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-400"
            type="button"
          >
            <Plus className="size-4" />
            Income
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
