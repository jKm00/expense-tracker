import { db } from "@/lib/db";

async function getAll(userId: string) {
  return await db.query.tags.findMany({
    with: {
      products: true,
    },
    where: {
      userId,
    },
  });
}

async function getFirst(id: string) {
  return await db.query.tags.findFirst({
    where: {
      id,
    },
  });
}

export const tagsRepo = {
  getAll,
  getFirst,
};
