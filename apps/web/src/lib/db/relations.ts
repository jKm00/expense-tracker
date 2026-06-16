import {
  account,
  session,
  user,
  verification,
} from "@/features/auth/server/auth.schema";
import {
  integrationEvents,
  integrationRequestLogs,
  integrationTokens,
} from "@/features/integrations/server/integration.schema";
import {
  productAliases,
  products,
  productTags,
} from "@/features/products/server/products.schema";
import {
  shoppingListItems,
  shoppingLists,
} from "@/features/shopping/server/shopping.schema";
import { recurring } from "@/features/recurring/server/recurring.schema";
import { tags } from "@/features/tags/server/tags.schema";
import {
  entries,
  entryTags,
  transactions,
} from "@/features/transactions/server/transactions.schema";
import { defineRelations } from "drizzle-orm";

export const relations = defineRelations(
  {
    // Auth
    user,
    session,
    account,
    verification,
    // Product
    products,
    shoppingLists,
    shoppingListItems,
    recurring,
    tags,
    productAliases,
    productTags,
    // Integrations
    integrationTokens,
    integrationEvents,
    integrationRequestLogs,
    // Transactions
    transactions,
    entries,
    entryTags,
  },
  (r) => ({
    user: {
      sessions: r.many.session(),
      accounts: r.many.account(),
      products: r.many.products(),
      shoppingLists: r.many.shoppingLists(),
      tags: r.many.tags(),
      transactions: r.many.transactions(),
      integrationTokens: r.many.integrationTokens(),
      integrationEvents: r.many.integrationEvents(),
      integrationRequestLogs: r.many.integrationRequestLogs(),
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
      aliases: r.many.productAliases({
        from: r.products.id,
        to: r.productAliases.productId,
      }),
      entries: r.many.entries({
        from: r.products.id,
        to: r.entries.productId,
      }),
      shoppingListItems: r.many.shoppingListItems({
        from: r.products.id,
        to: r.shoppingListItems.productId,
      }),
    },
    shoppingLists: {
      user: r.one.user({
        from: r.shoppingLists.userId,
        to: r.user.id,
      }),
      items: r.many.shoppingListItems({
        from: r.shoppingLists.id,
        to: r.shoppingListItems.shoppingListId,
      }),
    },
    shoppingListItems: {
      shoppingList: r.one.shoppingLists({
        from: r.shoppingListItems.shoppingListId,
        to: r.shoppingLists.id,
      }),
      product: r.one.products({
        from: r.shoppingListItems.productId,
        to: r.products.id,
      }),
    },
    productAliases: {
      products: r.one.products({
        from: r.productAliases.productId,
        to: r.products.id,
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
      integrationEvents: r.many.integrationEvents({
        from: r.transactions.id,
        to: r.integrationEvents.transactionId,
      }),
    },
    integrationTokens: {
      user: r.one.user({
        from: r.integrationTokens.userId,
        to: r.user.id,
      }),
      events: r.many.integrationEvents({
        from: r.integrationTokens.id,
        to: r.integrationEvents.tokenId,
      }),
      requestLogs: r.many.integrationRequestLogs({
        from: r.integrationTokens.id,
        to: r.integrationRequestLogs.tokenId,
      }),
    },
    integrationEvents: {
      user: r.one.user({
        from: r.integrationEvents.userId,
        to: r.user.id,
      }),
      token: r.one.integrationTokens({
        from: r.integrationEvents.tokenId,
        to: r.integrationTokens.id,
      }),
      transaction: r.one.transactions({
        from: r.integrationEvents.transactionId,
        to: r.transactions.id,
      }),
    },
    integrationRequestLogs: {
      user: r.one.user({
        from: r.integrationRequestLogs.userId,
        to: r.user.id,
      }),
      token: r.one.integrationTokens({
        from: r.integrationRequestLogs.tokenId,
        to: r.integrationTokens.id,
      }),
      transaction: r.one.transactions({
        from: r.integrationRequestLogs.transactionId,
        to: r.transactions.id,
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
