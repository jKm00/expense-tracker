import { db } from "@/lib/db";
import { homeWidgets } from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { shortcutRepo } from "../shortcuts/shortcuts.repo";
import { HomeWidget } from "./home.models";

async function getWidgets(userId: string): Promise<HomeWidget[]> {
  return await db
    .select({ type: homeWidgets.type, enabled: homeWidgets.enabled })
    .from(homeWidgets)
    .where(eq(homeWidgets.userId, userId))
    .orderBy(asc(homeWidgets.position));
}

async function saveConfig(
  userId: string,
  config: {
    widgets: HomeWidget[];
    shortcutIds: string[];
    shortcutOrder: string[];
  },
) {
  await db.transaction(async (tx) => {
    await tx
      .insert(homeWidgets)
      .values(
        config.widgets.map((widget, position) => ({
          userId,
          ...widget,
          position,
        })),
      )
      .onConflictDoUpdate({
        target: [homeWidgets.userId, homeWidgets.type],
        set: {
          position: sql`excluded.position`,
          enabled: sql`excluded.enabled`,
          updatedAt: new Date(),
        },
      });
    await shortcutRepo.setShowOnHomeInTx(tx, userId, config.shortcutIds);
    await shortcutRepo.reorderInTx(tx, userId, config.shortcutOrder);
  });
}

export const homeRepo = {
  getWidgets,
  saveConfig,
};
