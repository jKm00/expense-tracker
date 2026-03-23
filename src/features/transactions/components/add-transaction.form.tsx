import { useForm } from "@tanstack/react-form-start";
import { transactionValidators } from "../transaction.validators";
import { transactionMutations } from "../transaction.mutations";
import { getErrorMessage } from "@/utils/error-messages";
import { Input } from "@/components/ui/input";
import FieldError from "@/components/custom/field-error";
import { FormField } from "@/components/custom/form-field";
import { LoaderButton } from "@/components/custom/loader.button";
import { toast } from "sonner";

export function AddTransactionForm({ onSuccess }: { onSuccess?: () => void }) {
  const mutation = transactionMutations.addTransaction();

  const form = useForm({
    defaultValues: {
      productName: "",
      description: "",
      price: "",
      type: "expense" as "expense" | "income",
    },
    validators: {
      onBlur: transactionValidators.addFormValidation as any,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(
        {
          productName: value.productName,
          description: value.description || undefined,
          price: Number(value.price),
          type: value.type,
          source: "manual",
        },
        {
          onSuccess: (data) => {
            const [err] = data;
            if (err) {
              toast.error(getErrorMessage(err));
              return;
            }
            form.reset();
            onSuccess?.();
          },
          onError: (error) => {
            toast.error(error.message);
          },
        },
      );
    },
  });

  function handleSubmitWithType(type: "expense" | "income") {
    form.setFieldValue("type", type);
    // Use setTimeout to ensure the field value is set before submission
    setTimeout(() => form.handleSubmit(), 0);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      className="space-y-4"
    >
      <form.Field
        name="productName"
        children={(field) => (
          <FormField label="Product">
            <Input
              name={field.name}
              type="text"
              placeholder="Product name..."
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </FormField>
        )}
      />
      <form.Field
        name="description"
        children={(field) => (
          <FormField label="Description">
            <Input
              name={field.name}
              type="text"
              placeholder="Optional description..."
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </FormField>
        )}
      />
      <form.Field
        name="price"
        children={(field) => (
          <FormField label="Price">
            <Input
              name={field.name}
              type="text"
              placeholder="0.00"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </FormField>
        )}
      />
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit]) => (
          <div className="flex gap-2">
            <LoaderButton
              type="button"
              variant="destructive"
              className="flex-1"
              disabled={!canSubmit || mutation.isPending}
              isLoading={mutation.isPending && form.state.values.type === "expense"}
              onClick={() => handleSubmitWithType("expense")}
            >
              Expense
            </LoaderButton>
            <LoaderButton
              type="button"
              className="flex-1"
              disabled={!canSubmit || mutation.isPending}
              isLoading={mutation.isPending && form.state.values.type === "income"}
              onClick={() => handleSubmitWithType("income")}
            >
              Income
            </LoaderButton>
          </div>
        )}
      />
    </form>
  );
}
