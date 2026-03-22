import { ProductWithTags } from "@/features/products/product.models";
import { RecurringInterval, RecurringWithProduct } from "../recurring.models";
import { useForm } from "@tanstack/react-form-start";
import { recurringValidators } from "../recurring.validators";
import { Input } from "@/components/ui/input";
import FieldError from "@/components/custom/field-error";
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
import { ChevronDownIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { productQueries } from "@/features/products/product.queries";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { recurringMutations } from "../recurring.mutations";
import { LoaderButton } from "@/components/custom/loader.button";

export function EditRecurringForm({
  recurring,
}: {
  recurring: RecurringWithProduct;
}) {
  const mutation = recurringMutations.updateRecurringProduct();
  const form = useForm({
    defaultValues: {
      productId: recurring.productId,
      price: recurring.price,
      interval: recurring.interval,
      startDate: recurring.startDate,
      endDate: recurring.endDate,
      isActive: recurring.isActive,
    },
    validators: {
      onBlur: recurringValidators.formValidation,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(
        {
          ...value,
          interval: value.interval as RecurringInterval,
          price: Number(value.price),
          id: recurring.id,
        },
        {
          onSuccess: (data) => {
            const [err] = data;
            if (err) {
              // TODO: Handle error
              console.log(err.message);
            }
          },
        },
      );
    },
  });

  const { data, isLoading } = useQuery(productQueries.getProductsOptions());
  const [_, res] = data ?? [null, null];
  const products = res ?? [];

  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithTags | null>(
      () => products.find((p) => p.id === recurring.productId) || null,
    );

  useEffect(() => {
    if (products.length === 0) return;

    setSelectedProduct(
      products.find((p) => p.id === recurring.productId) || null,
    );
  }, [products]);

  useEffect(() => {
    if (selectedProduct) {
      form.setFieldValue("productId", selectedProduct.id);
    }
  }, [selectedProduct, form]);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="productId"
        children={(field) => (
          <>
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
          </>
        )}
      />
      <form.Field
        name="price"
        children={(field) => (
          <>
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
      <form.Field
        name="interval"
        children={(field) => (
          <>
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
          </>
        )}
      />
      <form.Field
        name="startDate"
        children={(field) => (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  data-empty={!field.state.value}
                  className="min-w-50 justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
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
                  onSelect={(v) => field.handleChange(v ?? new Date())}
                  defaultMonth={field.state.value}
                />
              </PopoverContent>
            </Popover>
            <FieldError field={field} />
          </>
        )}
      />
      <form.Field
        name="endDate"
        children={(field) => (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  data-empty={!field.state.value}
                  className="min-w-50 justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                >
                  {field.state.value ? (
                    format(field.state.value, "PPP")
                  ) : (
                    <span>Pick start end</span>
                  )}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.state.value ?? undefined}
                  onSelect={(v) => field.handleChange(v ?? new Date())}
                  defaultMonth={field.state.value ?? new Date()}
                />
              </PopoverContent>
            </Popover>
            <FieldError field={field} />
          </>
        )}
      />
      <form.Field
        name="isActive"
        children={(field) => (
          <>
            <div className="flex gap-1 items-center">
              <Checkbox
                name={field.name}
                checked={field.state.value}
                onBlur={field.handleBlur}
                onCheckedChange={(v: boolean) => field.handleChange(v)}
              />
              <p>Is active</p>
            </div>
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
            {isSubmitting ? "..." : "Submit"}
          </LoaderButton>
        )}
      />
    </form>
  );
}
