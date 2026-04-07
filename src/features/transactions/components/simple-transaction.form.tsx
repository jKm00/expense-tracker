import {
  Form,
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { ProductSelect } from "@/components/custom/product-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Product } from "@/features/products/products.models";
import { saveEntrySchema, saveTransactionSchema } from "../transactions.dtos";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { EntryType } from "../transactions.models";
import { transactionMutations } from "../transactions.mutations";
import { toast } from "sonner";

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
        <CardContent className="space-y-2">
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
            className="text-red-400"
            type="button"
          >
            Expense
          </Button>
          <Button
            onClick={() => onSubmit("income")}
            variant="outline"
            className="text-green-400"
            type="button"
          >
            Income
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
