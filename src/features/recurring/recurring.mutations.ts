import { assertOnline } from "@/lib/offline-guard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateRecurringDTO,
  DeleteRecurringDTO,
  UpdateRecurringDTO,
} from "./recurring.dtos";
import { recurringController } from "./recurring.controller";
import { RECURRING_QUERY_KEY } from "./recurring.queries";
import { toast } from "sonner";

function createRecurring() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRecurringDTO) => {
      assertOnline();
      return await recurringController.createRecurring({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECURRING_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Failed to create recurring transaction. Please try again!");
    },
  });
}

function updateRecurring() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateRecurringDTO) => {
      assertOnline();
      return await recurringController.updateRecurring({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECURRING_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Failed to update recurring transaction. Please try again!");
    },
  });
}

function deleteRecurring() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteRecurringDTO) => {
      assertOnline();
      return await recurringController.deleteRecurring({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECURRING_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Failed to delete recurring transaction. Please try again!");
    },
  });
}

export const recurringMutations = {
  createRecurring,
  updateRecurring,
  deleteRecurring,
};
