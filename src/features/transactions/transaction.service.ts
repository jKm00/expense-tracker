import { NewTransaction } from "./transaction.dtos";

async function addTransaction(userId: string, data: NewTransaction) {
  // Check if product exist
  //  If not, create a new product
  // Create transaction with link to product
}

export const transactionService = {
  addTransaction,
};
