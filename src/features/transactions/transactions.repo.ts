import { db } from "@/lib/db";

async function getAll(userId: string, start: Date, end: Date) {
  return await db.query.transactions.findMany({
    with: {
      entries: {
        with: {
          products: true,
        },
      },
    },
    where: {
      userId,
      createdAt: { gte: start, lte: end },
    },
  });
}

export const transactionRepo = {
  getAll,
};
