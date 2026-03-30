import { useForm } from "@tanstack/react-form-start";
import { transactionValidators } from "../transaction.validators";
import { transactionMutations } from "../transaction.mutations";
import { getErrorMessage } from "@/utils/error-messages";
import { Input } from "@/components/ui/input";
import FieldError from "@/components/custom/field-error";
import { FormField } from "@/components/custom/form-field";
import { LoaderButton } from "@/components/custom/loader.button";
import { toast } from "sonner";
import { productQueries } from "@/features/products/product.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { ProductWithTags } from "@/features/products/product.models";
import { useState } from "react";

export function AddTransactionForm({ onSuccess }: { onSuccess?: () => void }) {
  const {
    data: [_, productsRes],
  } = useSuspenseQuery(productQueries.getProductsOptions());
  const mutation = transactionMutations.addTransaction();
  const products = productsRes ?? [];

  const [productInput, setProductInput] = useState("");

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
      {/* TODO: Show dropdown with products. Filter when typing */}
      <form.Field
        name="productName"
        children={(field) => (
          <FormField label="Product">
            {/*<Input
               name={field.name}
               type="text"
               placeholder="Product name..."
               value={field.state.value}
               onBlur={field.handleBlur}
               onChange={(e) => field.handleChange(e.target.value)}
             />*/}
            <Combobox
              items={products ?? []}
              itemToStringValue={(p: (typeof products)[number]) => p.name}
              itemToStringLabel={(p: (typeof products)[number]) => p.name}
              value={products.find((p) => p.name === field.state.value)}
              onValueChange={(v) => {
                field.handleChange(v?.name || "");
                setProductInput(v?.name || "");
              }}
            >
              <ComboboxInput
                value={productInput}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  setProductInput(e.target.value);
                }}
                placeholder="Product..."
              />
              <ComboboxContent>
                <ComboboxEmpty>TODO</ComboboxEmpty>
                <ComboboxList>
                  {(p: ProductWithTags) => (
                    <ComboboxItem key={p.id} value={p}>
                      {p.name}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
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
              isLoading={
                mutation.isPending && form.state.values.type === "expense"
              }
              onClick={() => handleSubmitWithType("expense")}
            >
              Expense
            </LoaderButton>
            <LoaderButton
              type="button"
              className="flex-1"
              disabled={!canSubmit || mutation.isPending}
              isLoading={
                mutation.isPending && form.state.values.type === "income"
              }
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
