import { defineRelations } from "drizzle-orm";
import {
  user,
  session,
  account,
  verification,
} from "@/features/auth/auth.schema";
import {
  product,
  recurringProduct,
  tag,
  productTag,
} from "@/features/products/product.schema";
import { transaction } from "@/features/transactions/transaction.schema";

export const relations = defineRelations(
  {
    // Auth tables
    user,
    session,
    account,
    verification,
    // Product tables
    product,
    recurringProduct,
    tag,
    productTag,
    // Transaction table
    transaction,
  },
  (r) => ({
    // User relations
    user: {
      sessions: r.many.session(),
      accounts: r.many.account(),
      products: r.many.product(),
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

    // Product relations
    product: {
      user: r.one.user({
        from: r.product.userId,
        to: r.user.id,
      }),
      recurringProduct: r.one.recurringProduct({
        from: r.product.id,
        to: r.recurringProduct.productId,
      }),
      tags: r.many.tag({
        from: r.product.id.through(r.productTag.productId),
        to: r.tag.id.through(r.productTag.tagId),
      }),
      transactions: r.many.transaction(),
    },

    // Recurring product relations
    recurringProduct: {
      product: r.one.product({
        from: r.recurringProduct.productId,
        to: r.product.id,
      }),
    },

    // Tag relations
    tag: {
      user: r.one.user({
        from: r.tag.userId,
        to: r.user.id,
      }),
      products: r.many.product({
        from: r.tag.id.through(r.productTag.tagId),
        to: r.product.id.through(r.productTag.productId),
      }),
    },

    // Transaction relations
    transaction: {
      user: r.one.user({
        from: r.transaction.userId,
        to: r.user.id,
      }),
      product: r.one.product({
        from: r.transaction.productId,
        to: r.product.id,
      }),
    },
  })
);
