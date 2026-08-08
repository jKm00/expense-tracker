import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { userPreferences } from "./themes.schema";

async function getPreferences(userId: string) {
  const [row] = await db
    .select({
      palette: userPreferences.palette,
      mode: userPreferences.mode,
    })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  return row ?? null;
}

async function upsertPreferences(
  userId: string,
  data: { palette: string; mode: string },
) {
  const [row] = await db
    .insert(userPreferences)
    .values({ userId, ...data })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { ...data, updatedAt: new Date() },
    })
    .returning({
      palette: userPreferences.palette,
      mode: userPreferences.mode,
    });

  return row ?? null;
}

export const themesRepo = {
  getPreferences,
  upsertPreferences,
};
