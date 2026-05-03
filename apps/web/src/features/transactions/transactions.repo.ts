import { db } from "@/lib/db";
import { entries, entryTags, transactions } from "@/lib/db/schema";
import { NewEntry, NewTransaction } from "./transactions.models";
import { and, eq } from "drizzle-orm";

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
          tags: true,
        },
      },
    },
    where: {
      userId,
      date: { gte: start, lte: end },
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
          tags: true,
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

async function update(id: string, transaction: Partial<NewTransaction>) {
  return await db
    .update(transactions)
    .set({ ...transaction, updatedAt: new Date() })
    .where(eq(transactions.id, id))
    .returning();
}

async function updateEntry(id: string, entry: Partial<NewEntry>) {
  return await db
    .update(entries)
    .set(entry)
    .where(eq(entries.id, id))
    .returning();
}

async function removeEntry(entryId: string) {
  return await db.delete(entries).where(eq(entries.id, entryId)).returning();
}

async function saveEntryTagLink(entryId: string, tagId: string) {
  return await db.insert(entryTags).values({ entryId, tagId }).returning();
}

async function removeEntryTagLink(entryId: string, tagId: string) {
  return await db
    .delete(entryTags)
    .where(and(eq(entryTags.entryId, entryId), eq(entryTags.tagId, tagId)))
    .returning();
}

async function removeAllEntryTagLinks(entryId: string) {
  return await db.delete(entryTags).where(eq(entryTags.entryId, entryId)).returning();
}

export const transactionRepo = {
  getAll,
  getOne,
  save,
  saveEntry,
  remove,
  update,
  updateEntry,
  removeEntry,
  saveEntryTagLink,
  removeEntryTagLink,
  removeAllEntryTagLinks,
};
