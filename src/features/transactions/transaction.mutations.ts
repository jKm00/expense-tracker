import { useMutation } from "@tanstack/react-query";
import { NewTransaction } from "./transaction.dtos";

function addTransaction() {
  return useMutation({
    mutationFn: async (data: NewTransaction) => console.log(data),
  });
}

export const transactionMutations = {
  addTransaction,
};
