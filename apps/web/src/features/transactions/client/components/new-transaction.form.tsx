import { Form } from "@/components/custom/form";
import { LoaderButton } from "@/components/custom/loader.button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Product } from "@/features/products/shared/products.models";
import { Tag } from "@/features/tags/shared/tags.models";
import type { NewTransactionDTO } from "@/features/transactions/shared/transactions.dtos";
import { saveTransactionSchema } from "@/features/transactions/shared/transactions.dtos";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { transactionMutations } from "../transactions.mutations";
import {
  TransactionEntriesField,
  TransactionMetadataFields,
  type TransactionFormEntry,
} from "./transaction-form-fields";

export function NewTransactionForm({
  products,
  tags,
}: {
  products: Product[];
  tags: Tag[];
}) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [entries, setEntries] = useState<TransactionFormEntry[]>([]);
  const navigate = useNavigate();
  const mutation = transactionMutations.saveTransaction();

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<NewTransactionDTO>({
    defaultValues: {
      date: new Date(),
      entries: [],
    },
    resolver: zodResolver(saveTransactionSchema),
  });

  const selectedDate = watch("date");
  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data, {
      onSuccess: (data) => {
        const [error, transaction] = data;
        if (error) {
          // TODO: Handle errors
        } else {
          navigate({
            to: "/dashboard/transactions/$id",
            params: {
              id: transaction.id,
            },
          });
        }
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
            showTotal
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
          <Input {...register("source")} value="manual" className="hidden" />
        </CardContent>
        <CardFooter>
          <LoaderButton type="submit" className="w-full" isLoading={mutation.isPending}>
            Save transaction
          </LoaderButton>
        </CardFooter>
      </Card>
    </Form>
  );
}
