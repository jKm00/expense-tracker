import { useForm } from "@tanstack/react-form-start";
import { productValidators } from "../product.validators";
import { productMutations } from "../product.mutations";
import { Input } from "@/components/ui/input";
import FieldError from "@/components/custom/field-error";
import { LoaderButton } from "@/components/custom/loader.button";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export function CreateProductForm() {
  const navigate = useNavigate();
  const mutation = productMutations.createProduct();

  const form = useForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onBlur: productValidators.createFormValidation,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(
        { name: value.name },
        {
          onSuccess: (data) => {
            const [err, product] = data;
            if (err) {
              const errorMsg: string =
                "message" in err
                  ? String(err.message)
                  : "error" in err
                    ? String(err.error)
                    : "Failed to create product";
              toast.error(errorMsg);
            } else {
              toast.success("Product created");
              navigate({
                to: "/dashboard/products/$productId",
                params: { productId: product.id },
              });
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
              placeholder="Enter product name..."
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
            {isSubmitting ? "..." : "Create Product"}
          </LoaderButton>
        )}
      />
    </form>
  );
}
