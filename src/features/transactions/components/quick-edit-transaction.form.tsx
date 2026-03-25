import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDownIcon, SquarePen } from "lucide-react";
import { transactionMutations } from "../transaction.mutations";
import { useForm } from "@tanstack/react-form-start";
import { Transaction } from "../transaction.models";
import { transactionValidators } from "../transaction.validators";
import { toast } from "sonner";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import FieldError from "@/components/custom/field-error";
import { Calendar } from "@/components/ui/calendar";

export function QuickEditTransactionForm({
  transaction,
}: {
  transaction: Transaction;
}) {
  const [open, setOpen] = useState(false);

  const mutation = transactionMutations.updateTransaction();

  const form = useForm({
    defaultValues: {
      price: transaction.price,
      type: transaction.type,
      date: transaction.date,
      description: transaction.description ?? "",
    },
    validators: {
      onBlur: transactionValidators.editFormValidation as any,
    },
    onSubmit: ({ value }) => {
      console.log(value);
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
              setOpen(false);
            }
          },
        },
      );
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <SquarePen className="text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Edit the date of when the transaction occured
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <form.Field
            name="date"
            children={(field) => (
              <>
                <label>Date</label>
                <Input
                  type="date"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </>
            )}
          />
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={form.handleSubmit}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
