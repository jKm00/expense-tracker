import { useForm } from "@tanstack/react-form-start";
import { recurringValidators } from "../recurring.validators";
import { recurringMutations } from "../recurring.mutations";
import { productQueries } from "@/features/products/product.queries";
import { ProductWithTags } from "@/features/products/product.models";
import { RecurringInterval } from "../recurring.models";
import { getErrorMessage } from "@/utils/error-messages";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ChevronDownIcon, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import FieldError from "@/components/custom/field-error";
import { FormField } from "@/components/custom/form-field";
import { LoaderButton } from "@/components/custom/loader.button";

export function AddRecurringForm() {
  const navigate = useNavigate();
  const mutation = recurringMutations.addRecurringProduct();

  const form = useForm({
    defaultValues: {
      productId: "",
      price: "",
      interval: "" as string,
      startDate: undefined as Date | undefined,
      endDate: undefined as Date | undefined,
    },
    validators: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onBlur: recurringValidators.addFormValidation as any,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(
        {
          productId: value.productId,
          price: Number(value.price),
          interval: value.interval as RecurringInterval,
          startDate: value.startDate!,
          endDate: value.endDate,
        },
        {
          onSuccess: (data) => {
            const [err] = data;
            if (err) {
              toast.error(getErrorMessage(err));
              return;
            }
            navigate({ to: "/dashboard/recurring" });
          },
          onError: (error) => {
            toast.error(error.message);
          },
        },
      );
    },
  });

  const { data, isLoading } = useQuery(productQueries.getProductsOptions());
  const [_, res] = data ?? [null, null];
  const products = res ?? [];

  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithTags | null>(null);

  useEffect(() => {
    if (selectedProduct) {
      form.setFieldValue("productId", selectedProduct.id);
    }
  }, [selectedProduct, form]);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading products...</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field
        name="productId"
        children={(field) => (
          <FormField label="Product">
            <Combobox
              items={products}
              itemToStringValue={(p: (typeof products)[number]) => p.id}
              itemToStringLabel={(p: (typeof products)[number]) => p.name}
              value={selectedProduct}
              onValueChange={(v) => setSelectedProduct(v)}
            >
              <ComboboxInput placeholder="Search product..." />
              <ComboboxContent>
                <ComboboxEmpty>No products found.</ComboboxEmpty>
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
      <form.Field
        name="interval"
        children={(field) => (
          <FormField label="Interval">
            <Select
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Interval</SelectLabel>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError field={field} />
          </FormField>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <form.Field
          name="startDate"
          children={(field) => (
            <FormField label="Start Date">
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-empty={!field.state.value}
                      className="grow justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                    >
                      {field.state.value ? (
                        format(field.state.value, "PPP")
                      ) : (
                        <span>Pick start date</span>
                      )}
                      <ChevronDownIcon />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.state.value}
                      onSelect={(v) => field.handleChange(v ?? undefined)}
                      defaultMonth={field.state.value}
                    />
                  </PopoverContent>
                </Popover>
                {field.state.value && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => field.handleChange(undefined)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              <FieldError field={field} />
            </FormField>
          )}
        />
        <form.Field
          name="endDate"
          children={(field) => (
            <FormField label="End Date (optional)">
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-empty={!field.state.value}
                      className="grow justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                    >
                      {field.state.value ? (
                        format(field.state.value, "PPP")
                      ) : (
                        <span>Pick end date</span>
                      )}
                      <ChevronDownIcon />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.state.value}
                      onSelect={(v) => field.handleChange(v ?? undefined)}
                      defaultMonth={field.state.value}
                    />
                  </PopoverContent>
                </Popover>
                {field.state.value && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => field.handleChange(undefined)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              <FieldError field={field} />
            </FormField>
          )}
        />
      </div>
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit]) => (
          <LoaderButton
            type="submit"
            className="w-full"
            disabled={!canSubmit || mutation.isPending}
            isLoading={mutation.isPending}
          >
            Create Recurring
          </LoaderButton>
        )}
      />
    </form>
  );
}
