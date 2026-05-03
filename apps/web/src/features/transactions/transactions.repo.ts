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

export interface EntryCreateInput {
  entryData: Omit<NewEntry, "id">;
  tagIds: string[];
}

export interface EntryUpdateInput {
  id: string;
  entryData: Pick<NewEntry, "productId" | "price" | "quantity" | "type">;
  tagIds: string[];
}

async function runTransactionalUpdate(params: {
  transactionId: string;
  transactionData: Partial<NewTransaction>;
  entryIdsToDelete: string[];
  entriesToCreate: EntryCreateInput[];
  entriesToUpdate: EntryUpdateInput[];
}): Promise<void> {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(transactions)
      .set({ ...params.transactionData, updatedAt: new Date() })
      .where(eq(transactions.id, params.transactionId))
      .returning();

    if (updated.length === 0) {
      tx.rollback();
    }

    for (const entryId of params.entryIdsToDelete) {
      await tx.delete(entries).where(eq(entries.id, entryId));
    }

    for (const { id, entryData, tagIds } of params.entriesToUpdate) {
      await tx.update(entries).set(entryData).where(eq(entries.id, id));
      await tx.delete(entryTags).where(eq(entryTags.entryId, id));
      for (const tagId of tagIds) {
        await tx.insert(entryTags).values({ entryId: id, tagId });
      }
    }

    for (const { entryData, tagIds } of params.entriesToCreate) {
      const saved = await tx.insert(entries).values(entryData).returning();
      if (saved.length > 0) {
        const savedId = saved[0].id;
        for (const tagId of tagIds) {
          await tx.insert(entryTags).values({ entryId: savedId, tagId });
        }
      }
    }
  });
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
  runTransactionalUpdate,
};
