import {
  Form,
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { updateRecurringSchema, type UpdateRecurringDTO } from "@/features/recurring/shared/recurring.dtos";
import { RecurringWithProduct } from "@/features/recurring/shared/recurring.models";
import { recurringIntervals } from "@/features/recurring/shared/recurring.models";
import { entryTypes } from "@/features/transactions/shared/transactions.models";
import { LoaderButton } from "@/components/custom/loader.button";
import { recurringMutations } from "../recurring.mutations";
import { toast } from "sonner";
import { ProductSelect } from "@/components/custom/product-select";
import { Product } from "@/features/products/shared/products.models";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { productQueries } from "@/features/products/client/products.queries";
import { normalizeToNoonUTC } from "@/utils/date";

export function EditRecurringForm({
  recurring,
}: {
  recurring: RecurringWithProduct;
}) {
  type EditRecurringFormValues = Omit<UpdateRecurringDTO, "recurringId"> & {
    product: NonNullable<UpdateRecurringDTO["product"]>;
    price: NonNullable<UpdateRecurringDTO["price"]>;
    interval: NonNullable<UpdateRecurringDTO["interval"]>;
    type: NonNullable<UpdateRecurringDTO["type"]>;
    start: NonNullable<UpdateRecurringDTO["start"]>;
    isActive: NonNullable<UpdateRecurringDTO["isActive"]>;
    end?: UpdateRecurringDTO["end"];
  };

  const {
    data: [_, productsResult],
  } = useSuspenseQuery(productQueries.getProductsOptions());

  const products = productsResult ?? [];

  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<EditRecurringFormValues>({
    resolver: zodResolver(
      updateRecurringSchema
        .omit({ recurringId: true })
        .required({
          product: true,
          price: true,
          interval: true,
          type: true,
          start: true,
          isActive: true,
        }),
    ),
    defaultValues: {
      product: { id: recurring.productId, name: recurring.products?.name ?? "" },
      price: recurring.price,
      interval: recurring.interval,
      type: recurring.type,
      start: normalizeToNoonUTC(new Date(recurring.start)),
      end: recurring.end ? normalizeToNoonUTC(new Date(recurring.end)) : undefined,
      isActive: recurring.isActive,
    },
  });

  const startDate = watch("start");
  const endDate = watch("end");

  const mutation = recurringMutations.updateRecurring();

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(
      { recurringId: recurring.id, ...data },
      {
        onSuccess: (res) => {
          const [error] = res;
          if (error) {
            let message: string;
            const reason = error.reason;
            switch (reason) {
              case "RECURRING_NOT_FOUND":
                message = "Recurring transaction not found";
                break;
              case "RECURRING_UNAUTHORIZED":
                message = "You do not have permission to update this";
                break;
              case "RECURRING_UPDATE_FAILED":
              case "RECURRING_DB_ERROR":
                message = "Failed to update. Please try again!";
                break;
              case "PRODUCT_NOT_FOUND":
                message = "The selected product could not be found";
                break;
              case "PRODUCT_UNAUTHORIZED":
                message = "You do not have permission to use the selected product";
                break;
              case "PRODUCT_DB_ERROR":
              case "UNEXPECTED_DB_ERROR":
                message = "Failed to load the selected product. Please try again!";
                break;
              case "PRODUCT_NOT_RETURNED":
                message = "Failed to create the selected product. Please try again!";
                break;
              default:
                message = `Unexpected error: ${reason satisfies never}. Please try again!`;
            }
            toast.error(message);
          } else {
            toast.success("Recurring transaction updated!");
          }
        },
      },
    );
  });

  function handleProductSelect(product: Product) {
    if (product.id.length === 0) {
      setValue("product", { id: null, name: product.name }, { shouldDirty: true });
    } else {
      setValue("product", { id: product.id, name: product.name }, { shouldDirty: true });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Recurring transaction details</CardDescription>
      </CardHeader>
      <CardContent>
        <Form onSubmit={onSubmit}>
          <div className="space-y-6">
            <FormField>
              <FormFieldLabel required>Product</FormFieldLabel>
              <ProductSelect
                products={products}
                defaultValue={recurring.products?.name}
                onValueChange={handleProductSelect}
              />
              <FormFieldError>{errors.product?.id?.message ?? errors.product?.name?.message}</FormFieldError>
            </FormField>

            <FormField>
              <FormFieldLabel required>Price</FormFieldLabel>
              <Input
                {...register("price")}
                inputMode="decimal"
                placeholder="9.99"
              />
              <FormFieldError>{errors.price?.message}</FormFieldError>
            </FormField>

            <FormField>
              <FormFieldLabel required>Interval</FormFieldLabel>
              <Controller
                name="interval"
                control={control}
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
              <FormFieldError>{errors.interval?.message}</FormFieldError>
            </FormField>

            <FormField>
              <FormFieldLabel required>Type</FormFieldLabel>
              <Controller
                name="type"
                control={control}
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
              <FormFieldError>{errors.type?.message}</FormFieldError>
            </FormField>

            <FormField>
              <FormFieldLabel required>Start Date</FormFieldLabel>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    data-empty={!startDate}
                    className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                  >
                    {startDate ? (
                      format(startDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <ChevronDownIcon className="size-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setValue("start", date ? normalizeToNoonUTC(date) : normalizeToNoonUTC(new Date()), {
                        shouldDirty: true,
                      });
                      setStartDateOpen(false);
                    }}
                    defaultMonth={startDate}
                  />
                </PopoverContent>
              </Popover>
              <FormFieldError>{errors.start?.message}</FormFieldError>
            </FormField>

            <FormField>
              <FormFieldLabel>
                End Date{" "}
                <span className="text-muted-foreground/60">(Optional)</span>
              </FormFieldLabel>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    data-empty={!endDate}
                    className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                  >
                    {endDate ? (
                      format(endDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <ChevronDownIcon className="size-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex flex-col">
                    <Calendar
                      mode="single"
                      selected={endDate ?? undefined}
                      onSelect={(date) => {
                        setValue("end", date ? normalizeToNoonUTC(date) : null, {
                          shouldDirty: true,
                        });
                        setEndDateOpen(false);
                      }}
                      defaultMonth={endDate || new Date()}
                    />
                    <div className="border-t p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setValue("end", null, {
                            shouldDirty: true,
                          });
                          setEndDateOpen(false);
                        }}
                      >
                        Clear end date
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <FormFieldError>{errors.end?.message}</FormFieldError>
            </FormField>

            <FormField>
              <div className="flex items-center gap-2">
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <FormFieldLabel>Active</FormFieldLabel>
              </div>
            </FormField>

            <LoaderButton
              type="submit"
              size="sm"
              isLoading={mutation.isPending}
              disabled={!isDirty || mutation.isPending}
              className="w-full mt-2"
            >
              Save changes
            </LoaderButton>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
