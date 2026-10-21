import { db } from "@/lib/db";
import { homeWidgets } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { HomeWidget } from "./home.models";

async function getWidgets(userId: string): Promise<HomeWidget[]> {
  return await db
    .select({ type: homeWidgets.type, enabled: homeWidgets.enabled })
    .from(homeWidgets)
    .where(eq(homeWidgets.userId, userId))
    .orderBy(asc(homeWidgets.position));
}

async function saveWidgets(userId: string, widgets: HomeWidget[]) {
  await db.transaction(async (tx) => {
    for (const [position, widget] of widgets.entries()) {
      await tx
        .insert(homeWidgets)
        .values({ userId, ...widget, position })
        .onConflictDoUpdate({
          target: [homeWidgets.userId, homeWidgets.type],
          set: { position, enabled: widget.enabled, updatedAt: new Date() },
        });
    }
  });
}

export const homeRepo = {
  getWidgets,
  saveWidgets,
};
