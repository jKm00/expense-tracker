import { Form } from "@/components/custom/form";
import { LoaderButton } from "@/components/custom/loader.button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Product } from "@/features/products/shared/products.models";
import { Tag } from "@/features/tags/shared/tags.models";
import {
  updateTransactionSchema,
  type UpdateTransactionDTO,
} from "@/features/transactions/shared/transactions.dtos";
import { FullTransaction } from "@/features/transactions/shared/transactions.models";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { transactionMutations } from "../transactions.mutations";
import {
  mapTransactionEntries,
  TransactionEntriesField,
  TransactionMetadataFields,
  type TransactionFormEntry,
} from "./transaction-form-fields";

export function EditTransactionForm({
  products,
  tags,
  transaction,
}: {
  products: Product[];
  tags: Tag[];
  transaction: FullTransaction;
}) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [entries, setEntries] = useState<TransactionFormEntry[]>([]);
  const navigate = useNavigate();
  const mutation = transactionMutations.updateTransaction();

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateTransactionDTO>({
    defaultValues: {
      transactionId: transaction.id,
      store: transaction.store || "",
      description: transaction.description || "",
      date: new Date(transaction.date),
      entries: [],
    },
    resolver: zodResolver(updateTransactionSchema),
  });

  useEffect(() => {
    const initialEntries = mapTransactionEntries(transaction);
    setEntries(initialEntries);
    setValue("entries", initialEntries);
  }, [transaction, setValue]);

  const selectedDate = watch("date");
  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data, {
      onSuccess: (data) => {
        const [error, updatedTransaction] = data;
        if (error) {
          return;
        }

        navigate({
          to: "/dashboard/transactions/$id",
          params: {
            id: updatedTransaction.id,
          },
        });
      },
    });
  });

  function handleEntriesChange(nextEntries: TransactionFormEntry[]) {
    setEntries(nextEntries);
    setValue("entries", nextEntries);
  }

  function handleDateSelect(date: Date | undefined) {
    setValue("date", date || new Date());
    setDatePickerOpen(false);
  }

  return (
    <Form onSubmit={onSubmit}>
      <Card>
        <CardContent className="space-y-4">
          <TransactionEntriesField
            products={products}
            tags={tags}
            entries={entries}
            error={errors.entries?.message}
            onEntriesChange={handleEntriesChange}
          />

          <Separator />

          <TransactionMetadataFields
            storeRegistration={register("store")}
            descriptionRegistration={register("description")}
            selectedDate={selectedDate}
            datePickerOpen={datePickerOpen}
            storeError={errors.store?.message}
            descriptionError={errors.description?.message}
            dateError={errors.date?.message}
            onDatePickerOpenChange={setDatePickerOpen}
            onDateSelect={handleDateSelect}
          />

          <Input {...register("transactionId")} value={transaction.id} className="hidden" />
        </CardContent>
        <CardFooter>
          <LoaderButton type="submit" className="w-full" isLoading={mutation.isPending}>
            Update transaction
          </LoaderButton>
        </CardFooter>
      </Card>
    </Form>
  );
}
