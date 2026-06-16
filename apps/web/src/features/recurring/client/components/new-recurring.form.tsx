import {
  Form,
} from "@/components/custom/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { recurringMutations } from "../recurring.mutations";
import { createRecurringSchema, CreateRecurringDTO } from "@/features/recurring/shared/recurring.dtos";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
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

export function NewRecurringForm() {
  const navigate = useNavigate();
  const mutation = recurringMutations.createRecurring();

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
    formState: { errors },
  } = useForm<CreateRecurringDTO>({
    resolver: zodResolver(createRecurringSchema),
    defaultValues: {
      isActive: true,
      type: "expense",
      interval: "monthly",
      start: normalizeToNoonUTC(new Date()),
    },
  });

  const startDate = watch("start");
  const endDate = watch("end");

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data, {
      onSuccess: (res) => {
        const [error] = res;
        if (error) {
          let message: string;
            const reason = error.reason;
            switch (reason) {
              case "RECURRING_NOT_RETURNED":
              case "RECURRING_DB_ERROR":
                message =
                  "Failed to save recurring transaction. Please try again!";
                break;
              case "PRODUCT_NOT_FOUND":
                message = "The selected product could not be found";
                break;
              case "PRODUCT_UNAUTHORIZED":
                message = "You do not have permission to use the selected product";
                break;
              case "PRODUCT_DB_ERROR":
              case "UNEXPECTED_DB_ERROR":
                message =
                  "Failed to load the selected product. Please try again!";
                break;
              case "PRODUCT_NOT_RETURNED":
                message =
                  "Failed to create the selected product. Please try again!";
                break;
              default:
                message = `Unexpected error: ${reason satisfies never}`;
            }
          toast.error(message);
        } else {
          navigate({ to: "/dashboard/recurring" });
        }
      },
    });
  });

  const form = { control, register, setValue, errors };

  return (
    <Form onSubmit={onSubmit}>
      <div className="space-y-6">
        <RecurringProductField products={products} form={form} />
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
          defaultMonth={new Date()}
          onSelect={(date) => {
            setValue("start", date ?? normalizeToNoonUTC(new Date()));
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
          defaultMonth={new Date()}
          onSelect={(date) => {
            setValue("end", date);
            setEndDateOpen(false);
          }}
        />
        <RecurringActiveField form={form} />
        <RecurringSubmitButton
          isLoading={mutation.isPending}
          disabled={mutation.isPending}
        >
          Create recurring transaction
        </RecurringSubmitButton>
      </div>
    </Form>
  );
}
