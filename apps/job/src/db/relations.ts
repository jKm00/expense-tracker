import {
  account,
  session,
  user,
  verification,
} from "./schemas/auth.schema.js";
import { products, productTags } from "./schemas/products.schema.js";
import { recurring } from "./schemas/recurring.schema.js";
import { tags } from "./schemas/tags.schema.js";
import {
  entries,
  entryTags,
  transactions,
} from "./schemas/transactions.schema.js";
import { defineRelations } from "drizzle-orm";

export const relations = defineRelations(
  {
    user,
    session,
    account,
    verification,
    products,
    recurring,
    tags,
    productTags,
    transactions,
    entries,
    entryTags,
  },
  (r) => ({
    user: {
      sessions: r.many.session(),
      accounts: r.many.account(),
      products: r.many.products(),
      tags: r.many.tags(),
      transactions: r.many.transactions(),
    },
    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
      }),
    },
    account: {
      user: r.one.user({
        from: r.account.userId,
        to: r.user.id,
      }),
    },
    products: {
      user: r.one.user({
        from: r.products.userId,
        to: r.user.id,
      }),
      recurring: r.many.recurring({
        from: r.products.id,
        to: r.recurring.productId,
      }),
      tags: r.many.tags({
        from: r.products.id.through(r.productTags.productId),
        to: r.tags.id.through(r.productTags.tagId),
      }),
      entries: r.many.entries({
        from: r.products.id,
        to: r.entries.productId,
      }),
    },
    recurring: {
      products: r.one.products({
        from: r.recurring.productId,
        to: r.products.id,
      }),
    },
    tags: {
      user: r.one.user({
        from: r.tags.userId,
        to: r.user.id,
      }),
      products: r.many.products({
        from: r.tags.id.through(r.productTags.tagId),
        to: r.products.id.through(r.productTags.productId),
      }),
      entries: r.many.entries({
        from: r.tags.id.through(r.entryTags.tagId),
        to: r.entries.id.through(r.entryTags.entryId),
      }),
    },
    transactions: {
      user: r.one.user({
        from: r.transactions.userId,
        to: r.user.id,
      }),
      entries: r.many.entries({
        from: r.transactions.id,
        to: r.entries.transactionId,
      }),
    },
    entries: {
      products: r.one.products({
        from: r.entries.productId,
        to: r.products.id,
      }),
      transactions: r.one.transactions({
        from: r.entries.transactionId,
        to: r.transactions.id,
      }),
      tags: r.many.tags({
        from: r.entries.id.through(r.entryTags.entryId),
        to: r.tags.id.through(r.entryTags.tagId),
      }),
    },
  }),
);
