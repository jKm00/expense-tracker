import {
  Form,
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { LoaderButton } from "@/components/custom/loader.button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { ProductWithDetails } from "../products.models";
import { productMutations } from "../products.mutations";
import { productSchema } from "../products.validators";

function getProductErrorMessage(reason: string): string {
  switch (reason) {
    case "PRODUCT_NOT_FOUND":
      return "Product was not found and could therefore not be updated";
    case "PRODUCT_UNAUTHORIZED":
      return "You do not have permissions to update this product";
    case "PRODUCT_UPDATE_FAILED":
      return "Failed to update product, please try again!";
    case "PRODUCT_NAME_ALREADY_EXISTS":
      return "A product with this name already exists";
    case "PRODUCT_DB_ERROR":
    case "UNEXPECTED_DB_ERROR":
      return "Failed when trying to save to database. Please try again!";
    default:
      return "Something unexpected happened. Please try again!";
  }
}

export function ProductForm({ product }: { product: ProductWithDetails }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product.name,
    },
  });

  const updateMutation = productMutations.updateProduct();

  useEffect(() => {
    reset({ name: product.name });
  }, [product.name, reset]);

  const onSubmit = handleSubmit((data) => {
    clearErrors("name");
    updateMutation.mutate(
      {
        productId: product.id,
        ...data,
      },
      {
        onSuccess: ([error, updatedProduct]) => {
          if (error) {
            const message = getProductErrorMessage(error.reason);
            setError("name", { message });
            toast.error(message);
            return;
          }

          reset({ name: updatedProduct?.name ?? data.name });
          toast.success("Product updated!");
        },
      },
    );
  });

  function handleDiscardName() {
    reset({ name: product.name });
    clearErrors("name");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Basic product information</CardDescription>
      </CardHeader>
      <CardContent>
        <Form onSubmit={onSubmit}>
          <FormField>
            <FormFieldLabel required>Product Name</FormFieldLabel>
            <Input {...register("name")} placeholder="White Monster, Potato..." />
            <FormFieldError>{errors.name?.message}</FormFieldError>
          </FormField>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscardName}
              disabled={!isDirty || updateMutation.isPending}
            >
              Discard
            </Button>
            <LoaderButton
              type="submit"
              size="sm"
              isLoading={updateMutation.isPending}
              disabled={!isDirty || updateMutation.isPending}
            >
              Save changes
            </LoaderButton>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
