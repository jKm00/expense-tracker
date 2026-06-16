import {
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { LoaderButton } from "@/components/custom/loader.button";
import { ProductSelect } from "@/components/custom/product-select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product } from "@/features/products/shared/products.models";
import { recurringIntervals } from "@/features/recurring/shared/recurring.models";
import { entryTypes } from "@/features/transactions/shared/transactions.models";
import { normalizeToNoonUTC } from "@/utils/date";
import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { Controller } from "react-hook-form";

type RecurringFormApi = {
  control: any;
  register: any;
  setValue: any;
  errors: any;
  dirty?: boolean;
};

type DateFieldProps = {
  name: "start" | "end";
  label: string;
  required?: boolean;
  value: Date | null | undefined;
  error?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMonth: Date;
  onSelect: (date: Date | undefined) => void;
  children?: React.ReactNode;
};

export function RecurringProductField({
  products,
  defaultValue,
  form,
}: {
  products: Product[];
  defaultValue?: string;
  form: RecurringFormApi;
}) {
  return (
    <FormField>
      <FormFieldLabel required>Product</FormFieldLabel>
      <ProductSelect
        products={products}
        defaultValue={defaultValue}
        onValueChange={(product) => {
          const value = {
            id: product.id.length === 0 ? null : product.id,
            name: product.name,
          };
          form.setValue("product", value, form.dirty ? { shouldDirty: true } : undefined);
        }}
      />
      <FormFieldError>
        {form.errors.product?.id?.message ?? form.errors.product?.name?.message}
      </FormFieldError>
    </FormField>
  );
}

export function RecurringPriceField({ form }: { form: RecurringFormApi }) {
  return (
    <FormField>
      <FormFieldLabel required>Price</FormFieldLabel>
      <Input {...form.register("price")} inputMode="decimal" placeholder="9.99" />
      <FormFieldError>{form.errors.price?.message}</FormFieldError>
    </FormField>
  );
}

export function RecurringIntervalField({ form }: { form: RecurringFormApi }) {
  return (
    <FormField>
      <FormFieldLabel required>Interval</FormFieldLabel>
      <Controller
        name="interval"
        control={form.control}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              {recurringIntervals.map((interval) => (
                <SelectItem key={interval} value={interval}>
                  {interval.charAt(0).toUpperCase() + interval.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FormFieldError>{form.errors.interval?.message}</FormFieldError>
    </FormField>
  );
}

export function RecurringTypeField({ form }: { form: RecurringFormApi }) {
  return (
    <FormField>
      <FormFieldLabel required>Type</FormFieldLabel>
      <Controller
        name="type"
        control={form.control}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {entryTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FormFieldError>{form.errors.type?.message}</FormFieldError>
    </FormField>
  );
}

export function RecurringDateField({
  label,
  required,
  value,
  error,
  open,
  onOpenChange,
  defaultMonth,
  onSelect,
  children,
}: DateFieldProps) {
  return (
    <FormField>
      <FormFieldLabel required={required}>
        {label} {!required && <span className="text-muted-foreground/60">(Optional)</span>}
      </FormFieldLabel>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            data-empty={!value}
            className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
          >
            {value ? format(value, "PPP") : <span>Pick a date</span>}
            <ChevronDownIcon className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={(date) => onSelect(date ? normalizeToNoonUTC(date) : undefined)}
            defaultMonth={defaultMonth}
          />
          {children}
        </PopoverContent>
      </Popover>
      <FormFieldError>{error}</FormFieldError>
    </FormField>
  );
}

export function RecurringActiveField({ form }: { form: RecurringFormApi }) {
  return (
    <FormField>
      <div className="flex items-center gap-2">
        <Controller
          name="isActive"
          control={form.control}
          render={({ field }) => (
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        <FormFieldLabel>Active</FormFieldLabel>
      </div>
    </FormField>
  );
}

export function RecurringSubmitButton({
  isLoading,
  disabled,
  className = "w-full",
  children,
}: {
  isLoading: boolean;
  disabled: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <LoaderButton
      type="submit"
      size="sm"
      isLoading={isLoading}
      disabled={disabled}
      className={className}
    >
      {children}
    </LoaderButton>
  );
}
