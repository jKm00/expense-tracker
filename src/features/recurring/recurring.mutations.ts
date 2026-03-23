import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  NewRecurringProductDTO,
  recurringController,
  UpdateReucrringProductDTO,
} from "./recurring.controller";
import { RECURRING_QUERY_KEY } from "./recurring.queries";
import { assertOnline } from "@/lib/offline-guard";

function addRecurringProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: NewRecurringProductDTO) => {
      assertOnline();
      return await recurringController.addRecurringProduct({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [RECURRING_QUERY_KEY],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

function updateRecurringProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateReucrringProductDTO) => {
      assertOnline();
      return await recurringController.updateRecurringProduct({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [RECURRING_QUERY_KEY],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

function deleteRecurringProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string }) => {
      assertOnline();
      return await recurringController.deleteRecurringProduct({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [RECURRING_QUERY_KEY],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export const recurringMutations = {
  addRecurringProduct,
  updateRecurringProduct,
  deleteRecurringProduct,
};
