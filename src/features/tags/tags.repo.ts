import { db } from "@/lib/db";

async function getAll(userId: string) {
  return await db.query.tags.findMany({
    where: {
      userId,
    },
  });
}

export const tagsRepo = {
  getAll,
};
