import { db } from "@/lib/db";
import { entries, transactions } from "@/lib/db/schema";
import { NewEntry, NewTransaction } from "./transactions.models";
import { eq } from "drizzle-orm";

async function getAll(userId: string, start: Date, end: Date) {
  return await db.query.transactions.findMany({
    with: {
      entries: {
        with: {
          products: {
            with: {
              tags: true,
            },
          },
        },
      },
    },
    where: {
      userId,
      createdAt: { gte: start, lte: end },
    },
  });
}

async function getOne(id: string) {
  return await db.query.transactions.findFirst({
    with: {
      entries: {
        with: {
          products: {
            with: {
              tags: true,
            },
          },
        },
      },
    },
    where: {
      id,
    },
  });
}

async function save(transaction: NewTransaction) {
  return await db.insert(transactions).values(transaction).returning();
}

async function saveEntry(entry: NewEntry) {
  return await db.insert(entries).values(entry).returning();
}

async function remove(transactionId: string) {
  return await db
    .delete(transactions)
    .where(eq(transactions.id, transactionId))
    .returning();
}

export const transactionRepo = {
  getAll,
  getOne,
  save,
  saveEntry,
  remove,
};
