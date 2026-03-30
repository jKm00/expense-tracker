import { Transaction } from "../transaction.models";
import { useForm } from "@tanstack/react-form-start";
import { transactionValidators } from "../transaction.validators";
import { transactionMutations } from "../transaction.mutations";
import { Input } from "@/components/ui/input";
import FieldError from "@/components/custom/field-error";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoaderButton } from "@/components/custom/loader.button";
import { toast } from "sonner";
import { FormField } from "@/components/custom/form-field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

export function EditTransactionForm({
  transaction,
}: {
  transaction: Transaction;
}) {
  const mutation = transactionMutations.updateTransaction();

  const form = useForm({
    defaultValues: {
      price: transaction.price,
      type: transaction.type,
      date: new Date(transaction.date),
      description: transaction.description ?? "",
    },
    validators: {
      onBlur: transactionValidators.editFormValidation as any,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(
        {
          id: transaction.id,
          price: Number(value.price),
          type: value.type,
          date: value.date,
          description: value.description || undefined,
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
                    : "Failed to update transaction";
              toast.error(errorMsg);
            } else {
              toast.success("Transaction updated");
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
      className="space-y-4"
    >
      <form.Field
        name="price"
        children={(field) => (
          <FormField label="Price">
            <Input
              name={field.name}
              type="text"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </FormField>
        )}
      />
      <form.Field
        name="type"
        children={(field) => (
          <FormField label="Type">
            <Select
              value={field.state.value}
              onValueChange={(v) =>
                field.handleChange(v as "income" | "expense")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Type</SelectLabel>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError field={field} />
          </FormField>
        )}
      />
      <form.Field
        name="date"
        children={(field) => (
          <FormField label="Start Date">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  data-empty={!field.state.value}
                  className="min-w-50 w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
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
          </FormField>
        )}
      />
      <form.Field
        name="description"
        children={(field) => (
          <FormField label="Description (Optional)">
            <Input
              name={field.name}
              type="text"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Optional description..."
            />
            <FieldError field={field} />
          </FormField>
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
            {isSubmitting ? "..." : "Save Changes"}
          </LoaderButton>
        )}
      />
    </form>
  );
}
