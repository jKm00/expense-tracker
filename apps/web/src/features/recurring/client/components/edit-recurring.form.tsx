import {
  Form,
} from "@/components/custom/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateRecurringSchema, type UpdateRecurringDTO } from "@/features/recurring/shared/recurring.dtos";
import { RecurringWithProduct } from "@/features/recurring/shared/recurring.models";
import { recurringMutations } from "../recurring.mutations";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { productQueries } from "@/features/products/client/products.queries";
import { normalizeToNoonUTC } from "@/utils/date";
import {
  RecurringActiveField,
  RecurringDateField,
  RecurringIntervalField,
  RecurringPriceField,
  RecurringProductField,
  RecurringSubmitButton,
  RecurringTypeField,
} from "./recurring-form-fields";

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

  const form = { control, register, setValue, errors, dirty: true };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Recurring transaction details</CardDescription>
      </CardHeader>
      <CardContent>
        <Form onSubmit={onSubmit}>
          <div className="space-y-6">
            <RecurringProductField
              products={products}
              defaultValue={recurring.products?.name}
              form={form}
            />
            <RecurringPriceField form={form} />
            <RecurringIntervalField form={form} />
            <RecurringTypeField form={form} />
            <RecurringDateField
              name="start"
              label="Start Date"
              required
              value={startDate}
              error={errors.start?.message}
              open={startDateOpen}
              onOpenChange={setStartDateOpen}
              defaultMonth={startDate}
              onSelect={(date) => {
                setValue("start", date ?? normalizeToNoonUTC(new Date()), {
                  shouldDirty: true,
                });
                setStartDateOpen(false);
              }}
            />
            <RecurringDateField
              name="end"
              label="End Date"
              value={endDate}
              error={errors.end?.message}
              open={endDateOpen}
              onOpenChange={setEndDateOpen}
              defaultMonth={endDate || new Date()}
              onSelect={(date) => {
                setValue("end", date ?? null, { shouldDirty: true });
                setEndDateOpen(false);
              }}
            >
              <div className="border-t p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setValue("end", null, { shouldDirty: true });
                    setEndDateOpen(false);
                  }}
                >
                  Clear end date
                </Button>
              </div>
            </RecurringDateField>
            <RecurringActiveField form={form} />
            <RecurringSubmitButton
              isLoading={mutation.isPending}
              disabled={!isDirty || mutation.isPending}
              className="w-full mt-2"
            >
              Save changes
            </RecurringSubmitButton>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
