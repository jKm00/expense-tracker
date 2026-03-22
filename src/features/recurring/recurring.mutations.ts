import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  NewRecurringProductDTO,
  recurringController,
  UpdateReucrringProductDTO,
} from "./recurring.controller";
import { RECURRING_QUERY_KEY } from "./recurring.queries";

function addRecurringProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: NewRecurringProductDTO) =>
      recurringController.addRecurringProduct({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [RECURRING_QUERY_KEY],
      });
    },
  });
}

function updateRecurringProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateReucrringProductDTO) =>
      recurringController.updateRecurringProduct({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [RECURRING_QUERY_KEY],
      });
    },
  });
}

function deleteRecurringProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string }) =>
      recurringController.deleteRecurringProduct({ data }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [RECURRING_QUERY_KEY],
      });
    },
  });
}

export const recurringMutations = {
  addRecurringProduct,
  updateRecurringProduct,
  deleteRecurringProduct,
};
