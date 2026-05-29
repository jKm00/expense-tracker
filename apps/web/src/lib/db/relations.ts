import {
  account,
  session,
  user,
  verification,
} from "@/features/auth/auth.schema";
import {
  automationEvents,
  automationRequestLogs,
  automationTokens,
} from "@/features/automation/automation.schema";
import {
  productAliases,
  products,
  productTags,
} from "@/features/products/products.schema";
import {
  shoppingListItems,
  shoppingLists,
} from "@/features/shopping/shopping.schema";
import { recurring } from "@/features/recurring/recurring.schema";
import { tags } from "@/features/tags/tags.schema";
import {
  entries,
  entryTags,
  transactions,
} from "@/features/transactions/transactions.schema";
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
    // Automation
      automationTokens,
      automationEvents,
      automationRequestLogs,
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
      automationTokens: r.many.automationTokens(),
      automationEvents: r.many.automationEvents(),
      automationRequestLogs: r.many.automationRequestLogs(),
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
      automationEvents: r.many.automationEvents({
        from: r.transactions.id,
        to: r.automationEvents.transactionId,
      }),
    },
    automationTokens: {
      user: r.one.user({
        from: r.automationTokens.userId,
        to: r.user.id,
      }),
      events: r.many.automationEvents({
        from: r.automationTokens.id,
        to: r.automationEvents.tokenId,
      }),
      requestLogs: r.many.automationRequestLogs({
        from: r.automationTokens.id,
        to: r.automationRequestLogs.tokenId,
      }),
    },
    automationEvents: {
      user: r.one.user({
        from: r.automationEvents.userId,
        to: r.user.id,
      }),
      token: r.one.automationTokens({
        from: r.automationEvents.tokenId,
        to: r.automationTokens.id,
      }),
      transaction: r.one.transactions({
        from: r.automationEvents.transactionId,
        to: r.transactions.id,
      }),
    },
    automationRequestLogs: {
      user: r.one.user({
        from: r.automationRequestLogs.userId,
        to: r.user.id,
      }),
      token: r.one.automationTokens({
        from: r.automationRequestLogs.tokenId,
        to: r.automationTokens.id,
      }),
      transaction: r.one.transactions({
        from: r.automationRequestLogs.transactionId,
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
