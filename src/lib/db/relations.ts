import { defineRelations } from "drizzle-orm";
import {
  user,
  session,
  account,
  verification,
} from "@/features/auth/auth.schema";
import {
  item,
  recurringItem,
  tag,
  itemTag,
} from "@/features/items/item.schema";
import { transaction } from "@/features/transactions/transaction.schema";

export const relations = defineRelations(
  {
    // Auth tables
    user,
    session,
    account,
    verification,
    // Item tables
    item,
    recurringItem,
    tag,
    itemTag,
    // Transaction table
    transaction,
  },
  (r) => ({
    // User relations
    user: {
      sessions: r.many.session(),
      accounts: r.many.account(),
      items: r.many.item(),
      tags: r.many.tag(),
      transactions: r.many.transaction(),
    },

    // Session relations
    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
      }),
    },

    // Account relations
    account: {
      user: r.one.user({
        from: r.account.userId,
        to: r.user.id,
      }),
    },

    // Item relations
    item: {
      user: r.one.user({
        from: r.item.userId,
        to: r.user.id,
      }),
      recurringItem: r.one.recurringItem({
        from: r.item.id,
        to: r.recurringItem.itemId,
      }),
      tags: r.many.tag({
        from: r.item.id.through(r.itemTag.itemId),
        to: r.tag.id.through(r.itemTag.tagId),
      }),
      transactions: r.many.transaction(),
    },

    // Recurring item relations
    recurringItem: {
      item: r.one.item({
        from: r.recurringItem.itemId,
        to: r.item.id,
      }),
    },

    // Tag relations
    tag: {
      user: r.one.user({
        from: r.tag.userId,
        to: r.user.id,
      }),
      items: r.many.item({
        from: r.tag.id.through(r.itemTag.tagId),
        to: r.item.id.through(r.itemTag.itemId),
      }),
    },

    // Transaction relations
    transaction: {
      user: r.one.user({
        from: r.transaction.userId,
        to: r.user.id,
      }),
      item: r.one.item({
        from: r.transaction.itemId,
        to: r.item.id,
      }),
    },
  })
);
