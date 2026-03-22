import { ProductWithTags } from "../product.models";
import { useForm } from "@tanstack/react-form-start";
import { productValidators } from "../product.validators";
import { productMutations } from "../product.mutations";
import { Input } from "@/components/ui/input";
import FieldError from "@/components/custom/field-error";
import { LoaderButton } from "@/components/custom/loader.button";
import { toast } from "sonner";

export function EditProductForm({ product }: { product: ProductWithTags }) {
  const mutation = productMutations.updateProduct();

  const form = useForm({
    defaultValues: {
      name: product.name,
    },
    validators: {
      onBlur: productValidators.editFormValidation,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(
        {
          productId: product.id,
          name: value.name,
        },
        {
          onSuccess: (data) => {
            const [err] = data;
            if (err) {
              const errorMsg: string =
                "message" in err
                  ? String(err.message)
                  : "error" in err
                    ? String(err.error)
                    : "Failed to update product";
              toast.error(errorMsg);
            } else {
              toast.success("Product updated");
            }
          },
        },
      );
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="name"
        children={(field) => (
          <>
            <label>Product Name</label>
            <Input
              name={field.name}
              type="text"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </>
        )}
      />
      <form.Subscribe
        selector={(state) => [
          state.canSubmit,
          state.isSubmitting,
          state.isDefaultValue,
        ]}
        children={([canSubmit, isSubmitting, isDefaultValue]) => (
          <LoaderButton
            type="submit"
            disabled={!canSubmit || isDefaultValue || mutation.isPending}
            isLoading={mutation.isPending}
          >
            {isSubmitting ? "..." : "Save"}
          </LoaderButton>
        )}
      />
    </form>
  );
}
