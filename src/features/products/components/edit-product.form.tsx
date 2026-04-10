import {
  Form,
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { productSchema } from "../products.validators";
import { Product } from "../products.models";
import { LoaderButton } from "@/components/custom/loader.button";
import { productMutations } from "../products.mutations";
import { toast } from "sonner";

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

  const mutation = productMutations.updateProduct();

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(
      {
        productId: product.id,
        ...data,
      },
      {
        onSuccess: (res) => {
          const [error] = res;
          if (error) {
            let message: string;
            const reason = error.reason;
            switch (reason) {
              case "PRODUCT_NOT_FOUND":
                message = `Product was not found and could therefore not be updated`;
                break;
              case "PRODUCT_UNAUTHORIZED":
                message = "You do not have permissions to update this product";
                break;
              case "PRODUCT_UPDATE_FAILED":
                message = "Failed to update product, please try again!";
                break;
              case "PRODUCT_DB_ERROR":
              case "UNEXPECTED_DB_ERROR":
                message =
                  "Failed when trying to save to database. Please try again!";
                break;
              default:
                message = `Something unexpected happened: ${reason satisfies never}. Please try again!`;
            }
            toast.error(message);
          } else {
            toast.success("Product updated!");
          }
        },
      },
    );
  });

  return (
    <Form onSubmit={onSubmit}>
      <FormField>
        <FormFieldLabel required>Product Name</FormFieldLabel>
        <Input {...register("name")} placeholder="White Monster, Potato..." />
        <FormFieldError>{errors.name?.message}</FormFieldError>
      </FormField>
      <LoaderButton
        type="submit"
        isLoading={mutation.isPending}
        disabled={!isDirty || mutation.isPending}
        className="w-full"
      >
        Save changes
      </LoaderButton>
    </Form>
  );
}
