import { err, ok } from "@/utils/result";
import { transactionRepo } from "./transactions.repo";
import dayjs from "dayjs";

async function getTransactions(userId: string, year?: number, month?: number) {
  try {
    let start: Date;
    if (!year || !month) {
      start = dayjs().startOf("month").toDate();
    } else {
      start = new Date(year, month, 1);
    }

    const end = dayjs(start).add(1, "month").toDate();
    const transactions = await transactionRepo.getAll(userId, start, end);
    return ok(transactions);
  } catch (error) {
    return err({
      reason: "TRANSACTION_DB_ERROR",
      message: `Failed to fetch transactions for user ${userId}`,
    });
  }
}

export const transactionService = {
  getTransactions,
};
