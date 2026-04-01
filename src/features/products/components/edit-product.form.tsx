import {
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/forms/form-field";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { productSchema } from "../products.validators";
import { Product } from "../products.models";
import { LoaderButton } from "@/components/custom/loader.button";

export function EditProductForm({ product }: { product: Product }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product.name,
    },
  });

  const onSubmit = handleSubmit((data) => console.log(data));

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardContent>
          <FormField>
            <FormFieldLabel required>Product Name</FormFieldLabel>
            <Input
              {...register("name")}
              placeholder="White Monster, Potato..."
            />
            <FormFieldError>{errors.name?.message}</FormFieldError>
          </FormField>
        </CardContent>
        <CardFooter>
          <LoaderButton type="submit" isLoading={false} disabled={!isDirty}>
            Save changes
          </LoaderButton>
        </CardFooter>
      </Card>
    </form>
  );
}
