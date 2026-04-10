import { db } from "@/lib/db";
import { entries, transactions } from "@/lib/db/schema";
import { NewEntry, NewTransaction } from "./transactions.models";

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

async function getOne(id: string) {
  return await db.query.transactions.findFirst({
    with: {
      entries: {
        with: {
          products: true,
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

export const transactionRepo = {
  getAll,
  getOne,
  save,
  saveEntry,
};
