import { db } from "@/lib/db";
import {
  analyticsChartPreferences,
  analyticsExcludedProducts,
  analyticsExcludedTags,
  entries,
  entryTags,
  productAliases,
  products,
  productTags,
  receiptItemMappings,
  recurring,
  tags,
  transactions,
} from "@/lib/db/schema";
import { ok } from "@/utils/result";
import { err } from "@/features/logger/logger.result";
import { getLogger } from "@/features/logger/logger.context";
import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { isDataImportEnabled } from "./data-portability.config";
import type {
  DataPortabilityData,
  DataPortabilityExport,
  ExportPeriod,
  ImportReportItem,
  ImportSummary,
} from "./data-portability.dtos";

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const REPORT_LIMIT = 20;

type DbClient = typeof db;

type ImportPlan = {
  summary: ImportSummary;
  tagIdMap: Map<string, string>;
  productIdMap: Map<string, string>;
  tagsToCreate: DataPortabilityData["tags"];
  productsToCreate: DataPortabilityData["products"];
  productTagsToCreate: DataPortabilityData["productTags"];
  aliasesToCreate: DataPortabilityData["productAliases"];
  recurringToCreate: DataPortabilityData["recurring"];
  transactionsToCreate: DataPortabilityData["transactions"];
  entriesToCreate: DataPortabilityData["entries"];
  entryTagsToCreate: DataPortabilityData["entryTags"];
  mappingsToCreate: DataPortabilityData["receiptItemMappings"];
};

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toDate(value: string | null) {
  return value ? new Date(value) : null;
}

function toStartOfDay(value: string) {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function toEndOfDay(value: string) {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function getPeriodBounds(period: ExportPeriod) {
  if (period.type === "all") {
    return null;
  }

  return {
    start: toStartOfDay(period.from),
    end: toEndOfDay(period.to),
  };
}

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function cents(value: string) {
  const sign = value.startsWith("-") ? -1 : 1;
  const unsigned = value.replace("-", "");
  const [whole, fraction = ""] = unsigned.split(".");
  return sign * (Number(whole) * 100 + Number(fraction.padEnd(2, "0")));
}

function formatCents(value: number) {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

function calculateTotal(entriesForTransaction: DataPortabilityData["entries"]) {
  return formatCents(
    entriesForTransaction.reduce((total, entry) => {
      const amount = cents(entry.price) * entry.quantity;
      return entry.type === "expense" ? total - amount : total + amount;
    }, 0),
  );
}

function sameDate(a: Date | string | null, b: Date | string | null) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

function addReportItem(items: ImportReportItem[], item: ImportReportItem) {
  if (items.length < REPORT_LIMIT) {
    items.push(item);
  }
}

function emptySummary(): ImportSummary {
  return {
    creates: {},
    skips: {},
    conflicts: [],
    errors: [],
  };
}

function inc(bucket: Record<string, number>, key: string, amount = 1) {
  bucket[key] = (bucket[key] ?? 0) + amount;
}

function validateUniqueIds(
  summary: ImportSummary,
  type: string,
  records: Array<{ id: string; name?: string }>,
) {
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) {
      addReportItem(summary.errors, {
        type,
        id: record.id,
        name: record.name,
        reason: "Duplicate ID in import file",
      });
    }
    seen.add(record.id);
  }
}

function validatePayloadReferences(payload: DataPortabilityExport, summary: ImportSummary) {
  const data = payload.data;
  validateUniqueIds(summary, "tag", data.tags);
  validateUniqueIds(summary, "product", data.products);
  validateUniqueIds(summary, "productAlias", data.productAliases);
  validateUniqueIds(summary, "transaction", data.transactions);
  validateUniqueIds(summary, "entry", data.entries);
  validateUniqueIds(summary, "recurring", data.recurring);
  validateUniqueIds(summary, "receiptMapping", data.receiptItemMappings);

  const productIds = new Set(data.products.map((product) => product.id));
  const tagIds = new Set(data.tags.map((tag) => tag.id));
  const transactionIds = new Set(data.transactions.map((transaction) => transaction.id));
  const entryIds = new Set(data.entries.map((entry) => entry.id));

  for (const link of data.productTags) {
    if (!productIds.has(link.productId) || !tagIds.has(link.tagId)) {
      addReportItem(summary.errors, {
        type: "productTag",
        id: `${link.productId}:${link.tagId}`,
        reason: "Product tag link references missing product or tag",
      });
    }
  }

  const entriesByTransaction = new Map<string, DataPortabilityData["entries"]>();
  for (const entry of data.entries) {
    if (!transactionIds.has(entry.transactionId) || !productIds.has(entry.productId)) {
      addReportItem(summary.errors, {
        type: "entry",
        id: entry.id,
        reason: "Entry references missing transaction or product",
      });
    }

    const current = entriesByTransaction.get(entry.transactionId) ?? [];
    current.push(entry);
    entriesByTransaction.set(entry.transactionId, current);
  }

  for (const link of data.entryTags) {
    if (!entryIds.has(link.entryId) || !tagIds.has(link.tagId)) {
      addReportItem(summary.errors, {
        type: "entryTag",
        id: `${link.entryId}:${link.tagId}`,
        reason: "Entry tag link references missing entry or tag",
      });
    }
  }

  for (const transaction of data.transactions) {
    const txEntries = entriesByTransaction.get(transaction.id) ?? [];
    const total = calculateTotal(txEntries);
    if (cents(total) !== cents(transaction.totalPrice)) {
      addReportItem(summary.errors, {
        type: "transaction",
        id: transaction.id,
        name: transaction.store ?? transaction.description ?? undefined,
        reason: `Stored total ${transaction.totalPrice} does not match entry total ${total}`,
      });
    }
  }

  for (const item of [...data.recurring, ...data.receiptItemMappings]) {
    if (!productIds.has(item.productId)) {
      addReportItem(summary.errors, {
        type: "productReference",
        id: item.id,
        reason: "Record references a missing product",
      });
    }
  }
}

async function exportData(userId: string, period: ExportPeriod) {
  const logger = getLogger();
  logger.addAttrs({ dataPortabilityAction: "exportData", exportPeriod: period.type });

  try {
    const bounds = getPeriodBounds(period);
    const exportedAt = new Date().toISOString();

    const transactionRows = await db.query.transactions.findMany({
      with: {
        entries: {
          with: {
            products: {
              with: {
                tags: true,
              },
            },
            tags: true,
          },
        },
      },
      where: bounds
        ? {
            userId,
            date: { gte: bounds.start, lte: bounds.end },
          }
        : { userId },
      orderBy: (transaction, { asc }) => [asc(transaction.date), asc(transaction.id)],
    });

    const recurringRows = await db
      .select()
      .from(recurring)
      .innerJoin(products, eq(recurring.productId, products.id))
      .where(
        bounds
          ? and(
              eq(products.userId, userId),
              isNull(products.deletedAt),
              isNull(recurring.deletedAt),
              lte(recurring.start, bounds.end),
              or(isNull(recurring.end), gte(recurring.end, bounds.start)),
            )
          : and(
              eq(products.userId, userId),
              isNull(products.deletedAt),
              isNull(recurring.deletedAt),
            ),
      );

    const transactionProductIds = transactionRows.flatMap((transaction) =>
      transaction.entries.map((entry) => entry.productId),
    );
    const recurringProductIds = recurringRows.map((row) => row.recurring.productId);
    const initialProductIds = unique([...transactionProductIds, ...recurringProductIds]);

    const activeProductRows =
      period.type === "all"
        ? await db
            .select()
            .from(products)
            .where(and(eq(products.userId, userId), isNull(products.deletedAt)))
        : [];
    const productIds = unique([...initialProductIds, ...activeProductRows.map((row) => row.id)]);

    const productRows =
      productIds.length === 0
        ? []
        : await db
            .select()
            .from(products)
            .where(and(eq(products.userId, userId), inArray(products.id, productIds)));

    const productTagRows =
      productIds.length === 0
        ? []
        : await db
            .select()
            .from(productTags)
            .innerJoin(products, eq(productTags.productId, products.id))
            .innerJoin(tags, eq(productTags.tagId, tags.id))
            .where(and(eq(products.userId, userId), inArray(productTags.productId, productIds)));

    const entryTagIds = transactionRows.flatMap((transaction) =>
      transaction.entries.flatMap((entry) => entry.tags.map((tag) => tag.id)),
    );
    const productTagIds = productTagRows.map((row) => row.product_tags.tagId);
    const initialTagIds = unique([...entryTagIds, ...productTagIds]);

    const tagRows =
      period.type === "all"
        ? await db.select().from(tags).where(eq(tags.userId, userId))
        : initialTagIds.length === 0
          ? []
          : await db
              .select()
              .from(tags)
              .where(and(eq(tags.userId, userId), inArray(tags.id, initialTagIds)));
    const tagIds = new Set(tagRows.map((tag) => tag.id));

    const aliasRows =
      productIds.length === 0
        ? []
        : await db
            .select()
            .from(productAliases)
            .where(inArray(productAliases.productId, productIds));

    const mappingRows =
      productIds.length === 0
        ? []
        : await db
            .select()
            .from(receiptItemMappings)
            .where(and(eq(receiptItemMappings.userId, userId), inArray(receiptItemMappings.productId, productIds)));

    const [chartPreferences] = await db
      .select()
      .from(analyticsChartPreferences)
      .where(eq(analyticsChartPreferences.userId, userId))
      .limit(1);

    const excludedTagRows = await db
      .select()
      .from(analyticsExcludedTags)
      .where(eq(analyticsExcludedTags.userId, userId));
    const excludedProductRows = await db
      .select()
      .from(analyticsExcludedProducts)
      .where(eq(analyticsExcludedProducts.userId, userId));

    const data: DataPortabilityData = {
      tags: tagRows.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt.toISOString(),
        updatedAt: tag.updatedAt.toISOString(),
      })),
      products: productRows.map((product) => ({
        id: product.id,
        name: product.name,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        deletedAt: toIso(product.deletedAt),
      })),
      productAliases: aliasRows.map((alias) => ({
        id: alias.id,
        productId: alias.productId,
        name: alias.name,
        normalizedName: alias.normalizedName,
        createdAt: alias.createdAt.toISOString(),
        updatedAt: alias.updatedAt.toISOString(),
      })),
      productTags: productTagRows
        .filter((row) => tagIds.has(row.product_tags.tagId))
        .map((row) => ({
          productId: row.product_tags.productId,
          tagId: row.product_tags.tagId,
        })),
      transactions: transactionRows.map((transaction) => ({
        id: transaction.id,
        store: transaction.store,
        description: transaction.description,
        source: transaction.source,
        needsReview: transaction.needsReview,
        totalPrice: transaction.totalPrice,
        date: transaction.date.toISOString(),
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
      })),
      entries: transactionRows.flatMap((transaction) =>
        transaction.entries.map((entry) => ({
          id: entry.id,
          transactionId: entry.transactionId,
          productId: entry.productId,
          price: entry.price,
          quantity: entry.quantity,
          type: entry.type,
        })),
      ),
      entryTags: transactionRows.flatMap((transaction) =>
        transaction.entries.flatMap((entry) =>
          entry.tags
            .filter((tag) => tagIds.has(tag.id))
            .map((tag) => ({ entryId: entry.id, tagId: tag.id })),
        ),
      ),
      recurring: recurringRows.map((row) => ({
        id: row.recurring.id,
        productId: row.recurring.productId,
        price: row.recurring.price,
        interval: row.recurring.interval,
        type: row.recurring.type,
        start: row.recurring.start.toISOString(),
        end: toIso(row.recurring.end),
        isActive: row.recurring.isActive,
        createdAt: row.recurring.createdAt.toISOString(),
        updatedAt: row.recurring.updatedAt.toISOString(),
      })),
      receiptItemMappings: mappingRows.map((mapping) => ({
        id: mapping.id,
        productId: mapping.productId,
        itemName: mapping.itemName,
        normalizedItemName: mapping.normalizedItemName,
        confirmationCount: mapping.confirmationCount,
        lastConfirmedAt: mapping.lastConfirmedAt.toISOString(),
        createdAt: mapping.createdAt.toISOString(),
        updatedAt: mapping.updatedAt.toISOString(),
      })),
      analytics: {
        chartPreferences: chartPreferences
          ? {
              hideUntagged: chartPreferences.hideUntagged,
              hideUnknownProduct: chartPreferences.hideUnknownProduct,
              createdAt: chartPreferences.createdAt.toISOString(),
              updatedAt: chartPreferences.updatedAt.toISOString(),
            }
          : null,
        excludedTagIds: excludedTagRows
          .map((row) => row.tagId)
          .filter((tagId) => period.type === "all" || tagIds.has(tagId)),
        excludedProductIds: excludedProductRows
          .map((row) => row.productId)
          .filter((productId) => period.type === "all" || productIds.includes(productId)),
      },
    };

    const payload: DataPortabilityExport = {
      format: "expense-tracker-export",
      version: 1,
      exportedAt,
      period,
      counts: {
        tags: data.tags.length,
        products: data.products.length,
        productAliases: data.productAliases.length,
        productTags: data.productTags.length,
        transactions: data.transactions.length,
        entries: data.entries.length,
        entryTags: data.entryTags.length,
        recurring: data.recurring.length,
        receiptItemMappings: data.receiptItemMappings.length,
      },
      data,
    };

    logger.addAttrs({ dataPortabilityTransactions: data.transactions.length });
    return ok(payload);
  } catch (error) {
    return err({
      reason: "DATA_EXPORT_ERROR" as const,
      message: "Failed to export data",
    });
  }
}

async function previewImport(userId: string, payload: DataPortabilityExport) {
  getLogger().addAttrs({ dataPortabilityAction: "previewImport" });

  if (!isDataImportEnabled()) {
    return err({
      reason: "DATA_IMPORT_DISABLED" as const,
      message: "Data import is only available on development servers",
    });
  }

  try {
    const [sizeError] = validateImportSize(payload);
    if (sizeError) return err(sizeError);

    const plan = await buildImportPlan(db, userId, payload);
    return ok(plan.summary);
  } catch (error) {
    return err({
      reason: "DATA_IMPORT_PREVIEW_ERROR" as const,
      message: "Failed to preview import",
    });
  }
}

async function applyImport(userId: string, payload: DataPortabilityExport) {
  getLogger().addAttrs({ dataPortabilityAction: "applyImport" });

  if (!isDataImportEnabled()) {
    return err({
      reason: "DATA_IMPORT_DISABLED" as const,
      message: "Data import is only available on development servers",
    });
  }

  try {
    const [sizeError] = validateImportSize(payload);
    if (sizeError) return err(sizeError);

    const summary = await db.transaction(async (tx) => {
      const client = tx as unknown as DbClient;
      const plan = await buildImportPlan(client, userId, payload);
      if (plan.summary.errors.length > 0) {
        throw new ImportValidationError(plan.summary);
      }

      await applyImportPlan(client, userId, payload, plan);
      return plan.summary;
    });

    return ok(summary);
  } catch (error) {
    if (error instanceof ImportValidationError) {
      return ok(error.summary);
    }

    return err({
      reason: "DATA_IMPORT_APPLY_ERROR" as const,
      message: "Failed to apply import",
    });
  }
}

function validateImportSize(payload: DataPortabilityExport) {
  const size = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  if (size > MAX_IMPORT_BYTES) {
    return err({
      reason: "DATA_IMPORT_TOO_LARGE" as const,
      message: "Import file is larger than 10 MB",
    });
  }

  return ok(true);
}

class ImportValidationError extends Error {
  constructor(public summary: ImportSummary) {
    super("Import payload failed validation");
  }
}

async function buildImportPlan(
  client: DbClient,
  userId: string,
  payload: DataPortabilityExport,
): Promise<ImportPlan> {
  const summary = emptySummary();
  validatePayloadReferences(payload, summary);

  const data = payload.data;
  const tagIdMap = new Map<string, string>();
  const productIdMap = new Map<string, string>();
  const tagsToCreate: DataPortabilityData["tags"] = [];
  const productsToCreate: DataPortabilityData["products"] = [];
  const productTagsToCreate: DataPortabilityData["productTags"] = [];
  const aliasesToCreate: DataPortabilityData["productAliases"] = [];
  const recurringToCreate: DataPortabilityData["recurring"] = [];
  const transactionsToCreate: DataPortabilityData["transactions"] = [];
  const entriesToCreate: DataPortabilityData["entries"] = [];
  const entryTagsToCreate: DataPortabilityData["entryTags"] = [];
  const mappingsToCreate: DataPortabilityData["receiptItemMappings"] = [];

  const importedTagIds = data.tags.map((tag) => tag.id);
  const existingTagsById = new Map(
    (importedTagIds.length === 0
      ? []
      : await client
          .select()
          .from(tags)
          .where(and(eq(tags.userId, userId), inArray(tags.id, importedTagIds)))
    ).map((tag) => [tag.id, tag]),
  );
  const allExistingTags = await client.select().from(tags).where(eq(tags.userId, userId));
  const existingTagsByName = new Map(
    allExistingTags.map((tag) => [tag.name.toLowerCase(), tag]),
  );

  for (const tag of data.tags) {
    const existingById = existingTagsById.get(tag.id);
    if (existingById) {
      tagIdMap.set(tag.id, existingById.id);
      inc(summary.skips, "tags");
      if (existingById.name !== tag.name || existingById.color !== tag.color) {
        addReportItem(summary.conflicts, {
          type: "tag",
          id: tag.id,
          name: tag.name,
          reason: "Existing tag differs; kept existing tag",
        });
      }
      continue;
    }

    const existingByName = existingTagsByName.get(tag.name.toLowerCase());
    if (existingByName) {
      tagIdMap.set(tag.id, existingByName.id);
      inc(summary.skips, "tags");
      continue;
    }

    tagIdMap.set(tag.id, tag.id);
    tagsToCreate.push(tag);
    inc(summary.creates, "tags");
  }

  const importedProductIds = data.products.map((product) => product.id);
  const existingProductsById = new Map(
    (importedProductIds.length === 0
      ? []
      : await client
          .select()
          .from(products)
          .where(and(eq(products.userId, userId), inArray(products.id, importedProductIds)))
    ).map((product) => [product.id, product]),
  );
  const activeExistingProducts = await client.query.products.findMany({
    with: { aliases: true },
    where: { userId, deletedAt: { isNull: true } },
  });
  const normalizedProductMatches = new Map<string, string[]>();
  for (const product of activeExistingProducts) {
    for (const name of [product.name, ...product.aliases.map((alias) => alias.name)]) {
      const normalized = normalizeName(name);
      if (!normalized) continue;
      normalizedProductMatches.set(normalized, [
        ...(normalizedProductMatches.get(normalized) ?? []),
        product.id,
      ]);
    }
  }

  const productConflicts = new Set<string>();
  const aliasesByProductId = new Map<string, DataPortabilityData["productAliases"]>();
  for (const alias of data.productAliases) {
    aliasesByProductId.set(alias.productId, [
      ...(aliasesByProductId.get(alias.productId) ?? []),
      alias,
    ]);
  }

  for (const product of data.products) {
    const existingById = existingProductsById.get(product.id);
    if (existingById) {
      if (existingById.deletedAt) {
        productConflicts.add(product.id);
        inc(summary.skips, "products");
        addReportItem(summary.conflicts, {
          type: "product",
          id: product.id,
          name: product.name,
          reason: "Existing product is deleted; kept deletion",
        });
        continue;
      }

      productIdMap.set(product.id, existingById.id);
      inc(summary.skips, "products");
      if (existingById.name !== product.name) {
        addReportItem(summary.conflicts, {
          type: "product",
          id: product.id,
          name: product.name,
          reason: "Existing product differs; kept existing product",
        });
      }
      continue;
    }

    const importedNames = [
      product.name,
      ...(aliasesByProductId.get(product.id) ?? []).map((alias) => alias.name),
    ];
    const naturalMatches = unique(
      importedNames.flatMap((name) => normalizedProductMatches.get(normalizeName(name)) ?? []),
    );
    if (naturalMatches.length === 1 && product.deletedAt === null) {
      productIdMap.set(product.id, naturalMatches[0]);
      inc(summary.skips, "products");
      continue;
    }

    productIdMap.set(product.id, product.id);
    productsToCreate.push(product);
    inc(summary.creates, "products");
  }

  const mappedProductIds = unique([...productIdMap.values()]);
  const existingProductTags = new Set(
    (mappedProductIds.length === 0
      ? []
      : await client
          .select()
          .from(productTags)
          .where(inArray(productTags.productId, mappedProductIds))
    ).map((link) => `${link.productId}:${link.tagId}`),
  );

  for (const link of data.productTags) {
    const productId = productIdMap.get(link.productId);
    const tagId = tagIdMap.get(link.tagId);
    if (!productId || !tagId || productConflicts.has(link.productId)) {
      inc(summary.skips, "productTags");
      continue;
    }

    const key = `${productId}:${tagId}`;
    if (existingProductTags.has(key)) {
      inc(summary.skips, "productTags");
      continue;
    }

    existingProductTags.add(key);
    productTagsToCreate.push({ productId, tagId });
    inc(summary.creates, "productTags");
  }

  const existingAliases = new Set(
    (mappedProductIds.length === 0
      ? []
      : await client
          .select()
          .from(productAliases)
          .where(inArray(productAliases.productId, mappedProductIds))
    ).map((alias) => `${alias.productId}:${alias.normalizedName}`),
  );

  for (const alias of data.productAliases) {
    const productId = productIdMap.get(alias.productId);
    if (!productId || productConflicts.has(alias.productId)) {
      inc(summary.skips, "productAliases");
      continue;
    }

    const key = `${productId}:${alias.normalizedName}`;
    if (existingAliases.has(key)) {
      inc(summary.skips, "productAliases");
      continue;
    }

    existingAliases.add(key);
    aliasesToCreate.push({ ...alias, productId });
    inc(summary.creates, "productAliases");
  }

  await planRecurring(client, userId, data, productIdMap, productConflicts, summary, recurringToCreate);
  await planTransactions(
    client,
    userId,
    data,
    productIdMap,
    tagIdMap,
    productConflicts,
    summary,
    transactionsToCreate,
    entriesToCreate,
    entryTagsToCreate,
  );
  await planMappings(
    client,
    userId,
    data,
    productIdMap,
    productConflicts,
    summary,
    mappingsToCreate,
  );

  if (data.analytics.chartPreferences) {
    inc(summary.creates, "analyticsPreferences");
  }

  return {
    summary,
    tagIdMap,
    productIdMap,
    tagsToCreate,
    productsToCreate,
    productTagsToCreate,
    aliasesToCreate,
    recurringToCreate,
    transactionsToCreate,
    entriesToCreate,
    entryTagsToCreate,
    mappingsToCreate,
  };
}

async function planRecurring(
  client: DbClient,
  userId: string,
  data: DataPortabilityData,
  productIdMap: Map<string, string>,
  productConflicts: Set<string>,
  summary: ImportSummary,
  recurringToCreate: DataPortabilityData["recurring"],
) {
  const importedIds = data.recurring.map((item) => item.id);
  const existingById = new Map(
    (importedIds.length === 0
      ? []
      : await client
          .select({ recurring, product: products })
          .from(recurring)
          .innerJoin(products, eq(recurring.productId, products.id))
          .where(and(eq(products.userId, userId), inArray(recurring.id, importedIds)))
    ).map((row) => [row.recurring.id, row]),
  );
  const existingActive = await client
    .select({ recurring, product: products })
    .from(recurring)
    .innerJoin(products, eq(recurring.productId, products.id))
    .where(and(eq(products.userId, userId), isNull(products.deletedAt), isNull(recurring.deletedAt)));

  for (const item of data.recurring) {
    const productId = productIdMap.get(item.productId);
    if (!productId || productConflicts.has(item.productId)) {
      inc(summary.skips, "recurring");
      addReportItem(summary.conflicts, {
        type: "recurring",
        id: item.id,
        reason: "Recurring rule references a product that could not be imported",
      });
      continue;
    }

    const existing = existingById.get(item.id);
    if (existing) {
      inc(summary.skips, "recurring");
      if (existing.recurring.deletedAt) {
        addReportItem(summary.conflicts, {
          type: "recurring",
          id: item.id,
          reason: "Existing recurring rule is deleted; kept deletion",
        });
      }
      continue;
    }

    const naturalMatch = existingActive.find(
      (row) =>
        row.recurring.productId === productId &&
        row.recurring.price === item.price &&
        row.recurring.interval === item.interval &&
        row.recurring.type === item.type &&
        sameDate(row.recurring.start, item.start) &&
        sameDate(row.recurring.end, item.end),
    );
    if (naturalMatch) {
      inc(summary.skips, "recurring");
      continue;
    }

    recurringToCreate.push({ ...item, productId });
    inc(summary.creates, "recurring");
  }
}

async function planTransactions(
  client: DbClient,
  userId: string,
  data: DataPortabilityData,
  productIdMap: Map<string, string>,
  tagIdMap: Map<string, string>,
  productConflicts: Set<string>,
  summary: ImportSummary,
  transactionsToCreate: DataPortabilityData["transactions"],
  entriesToCreate: DataPortabilityData["entries"],
  entryTagsToCreate: DataPortabilityData["entryTags"],
) {
  const importedTransactionIds = data.transactions.map((transaction) => transaction.id);
  const existingTransactionsById = new Map(
    (importedTransactionIds.length === 0
      ? []
      : await client
          .select()
          .from(transactions)
          .where(and(eq(transactions.userId, userId), inArray(transactions.id, importedTransactionIds)))
    ).map((transaction) => [transaction.id, transaction]),
  );
  const entriesByTransaction = new Map<string, DataPortabilityData["entries"]>();
  for (const entry of data.entries) {
    entriesByTransaction.set(entry.transactionId, [
      ...(entriesByTransaction.get(entry.transactionId) ?? []),
      entry,
    ]);
  }

  for (const transaction of data.transactions) {
    const existing = existingTransactionsById.get(transaction.id);
    if (existing) {
      inc(summary.skips, "transactions");
      if (
        existing.totalPrice !== transaction.totalPrice ||
        !sameDate(existing.date, transaction.date) ||
        existing.store !== transaction.store ||
        existing.description !== transaction.description
      ) {
        addReportItem(summary.conflicts, {
          type: "transaction",
          id: transaction.id,
          name: transaction.store ?? transaction.description ?? undefined,
          reason: "Existing transaction differs; kept existing aggregate",
        });
      }
      continue;
    }

    const txEntries = entriesByTransaction.get(transaction.id) ?? [];
    const blockedEntry = txEntries.find(
      (entry) => !productIdMap.has(entry.productId) || productConflicts.has(entry.productId),
    );
    if (blockedEntry) {
      inc(summary.skips, "transactions");
      addReportItem(summary.conflicts, {
        type: "transaction",
        id: transaction.id,
        name: transaction.store ?? transaction.description ?? undefined,
        reason: "Transaction references a product that could not be imported",
      });
      continue;
    }

    transactionsToCreate.push(transaction);
    inc(summary.creates, "transactions");
    for (const entry of txEntries) {
      const productId = productIdMap.get(entry.productId)!;
      entriesToCreate.push({ ...entry, productId });
      inc(summary.creates, "entries");
    }
  }

  const creatableEntryIds = new Set(entriesToCreate.map((entry) => entry.id));
  for (const link of data.entryTags) {
    if (!creatableEntryIds.has(link.entryId)) {
      inc(summary.skips, "entryTags");
      continue;
    }

    const tagId = tagIdMap.get(link.tagId);
    if (!tagId) {
      inc(summary.skips, "entryTags");
      continue;
    }

    entryTagsToCreate.push({ entryId: link.entryId, tagId });
    inc(summary.creates, "entryTags");
  }
}

async function planMappings(
  client: DbClient,
  userId: string,
  data: DataPortabilityData,
  productIdMap: Map<string, string>,
  productConflicts: Set<string>,
  summary: ImportSummary,
  mappingsToCreate: DataPortabilityData["receiptItemMappings"],
) {
  const normalizedNames = unique(data.receiptItemMappings.map((mapping) => mapping.normalizedItemName));
  const existingByNormalizedName = new Map(
    (normalizedNames.length === 0
      ? []
      : await client
          .select()
          .from(receiptItemMappings)
          .where(and(eq(receiptItemMappings.userId, userId), inArray(receiptItemMappings.normalizedItemName, normalizedNames)))
    ).map((mapping) => [mapping.normalizedItemName, mapping]),
  );

  for (const mapping of data.receiptItemMappings) {
    const productId = productIdMap.get(mapping.productId);
    if (!productId || productConflicts.has(mapping.productId)) {
      inc(summary.skips, "receiptItemMappings");
      continue;
    }

    const existing = existingByNormalizedName.get(mapping.normalizedItemName);
    if (existing) {
      inc(summary.skips, "receiptItemMappings");
      if (existing.productId !== productId) {
        addReportItem(summary.conflicts, {
          type: "receiptMapping",
          id: mapping.id,
          name: mapping.itemName,
          reason: "Existing receipt mapping points to another product; kept existing mapping",
        });
      }
      continue;
    }

    mappingsToCreate.push({ ...mapping, productId });
    inc(summary.creates, "receiptItemMappings");
  }
}

async function applyImportPlan(
  client: DbClient,
  userId: string,
  payload: DataPortabilityExport,
  plan: ImportPlan,
) {
  if (plan.tagsToCreate.length > 0) {
    await client.insert(tags).values(
      plan.tagsToCreate.map((tag) => ({
        id: tag.id,
        userId,
        name: tag.name,
        color: tag.color,
        createdAt: new Date(tag.createdAt),
        updatedAt: new Date(tag.updatedAt),
      })),
    ).onConflictDoNothing();
  }

  if (plan.productsToCreate.length > 0) {
    await client.insert(products).values(
      plan.productsToCreate.map((product) => ({
        id: product.id,
        userId,
        name: product.name,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt),
        deletedAt: toDate(product.deletedAt),
      })),
    ).onConflictDoNothing();
  }

  if (plan.productTagsToCreate.length > 0) {
    await client.insert(productTags).values(plan.productTagsToCreate).onConflictDoNothing();
  }

  if (plan.aliasesToCreate.length > 0) {
    await client.insert(productAliases).values(
      plan.aliasesToCreate.map((alias) => ({
        id: alias.id,
        productId: alias.productId,
        name: alias.name,
        normalizedName: alias.normalizedName,
        createdAt: new Date(alias.createdAt),
        updatedAt: new Date(alias.updatedAt),
      })),
    ).onConflictDoNothing();
  }

  if (plan.recurringToCreate.length > 0) {
    await client.insert(recurring).values(
      plan.recurringToCreate.map((item) => ({
        id: item.id,
        productId: item.productId,
        price: item.price,
        interval: item.interval,
        type: item.type,
        start: new Date(item.start),
        end: toDate(item.end),
        isActive: item.isActive,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        deletedAt: null,
      })),
    ).onConflictDoNothing();
  }

  if (plan.transactionsToCreate.length > 0) {
    await client.insert(transactions).values(
      plan.transactionsToCreate.map((transaction) => ({
        id: transaction.id,
        userId,
        store: transaction.store,
        description: transaction.description,
        source: transaction.source,
        needsReview: transaction.needsReview,
        totalPrice: calculateTotal(
          payload.data.entries.filter((entry) => entry.transactionId === transaction.id),
        ),
        date: new Date(transaction.date),
        createdAt: new Date(transaction.createdAt),
        updatedAt: new Date(transaction.updatedAt),
      })),
    ).onConflictDoNothing();
  }

  if (plan.entriesToCreate.length > 0) {
    await client.insert(entries).values(
      plan.entriesToCreate.map((entry) => ({
        id: entry.id,
        transactionId: entry.transactionId,
        productId: entry.productId,
        price: entry.price,
        quantity: entry.quantity,
        type: entry.type,
      })),
    ).onConflictDoNothing();
  }

  if (plan.entryTagsToCreate.length > 0) {
    await client.insert(entryTags).values(plan.entryTagsToCreate).onConflictDoNothing();
  }

  if (plan.mappingsToCreate.length > 0) {
    await client.insert(receiptItemMappings).values(
      plan.mappingsToCreate.map((mapping) => ({
        id: mapping.id,
        userId,
        productId: mapping.productId,
        itemName: mapping.itemName,
        normalizedItemName: mapping.normalizedItemName,
        confirmationCount: mapping.confirmationCount,
        lastConfirmedAt: new Date(mapping.lastConfirmedAt),
        createdAt: new Date(mapping.createdAt),
        updatedAt: new Date(mapping.updatedAt),
      })),
    ).onConflictDoNothing();
  }

  const analytics = payload.data.analytics;
  if (analytics.chartPreferences) {
    await client
      .insert(analyticsChartPreferences)
      .values({
        userId,
        hideUntagged: analytics.chartPreferences.hideUntagged,
        hideUnknownProduct: analytics.chartPreferences.hideUnknownProduct,
        createdAt: new Date(analytics.chartPreferences.createdAt),
        updatedAt: new Date(analytics.chartPreferences.updatedAt),
      })
      .onConflictDoUpdate({
        target: analyticsChartPreferences.userId,
        set: {
          hideUntagged: analytics.chartPreferences.hideUntagged,
          hideUnknownProduct: analytics.chartPreferences.hideUnknownProduct,
          updatedAt: new Date(),
        },
      });

    await client
      .delete(analyticsExcludedTags)
      .where(eq(analyticsExcludedTags.userId, userId));
    await client
      .delete(analyticsExcludedProducts)
      .where(eq(analyticsExcludedProducts.userId, userId));

    const excludedTagIds = unique(
      analytics.excludedTagIds.map((tagId) => plan.tagIdMap.get(tagId)).filter(Boolean),
    ) as string[];
    const excludedProductIds = unique(
      analytics.excludedProductIds
        .map((productId) => plan.productIdMap.get(productId))
        .filter(Boolean),
    ) as string[];

    if (excludedTagIds.length > 0) {
      await client
        .insert(analyticsExcludedTags)
        .values(excludedTagIds.map((tagId) => ({ userId, tagId })))
        .onConflictDoNothing();
    }

    if (excludedProductIds.length > 0) {
      await client
        .insert(analyticsExcludedProducts)
        .values(excludedProductIds.map((productId) => ({ userId, productId })))
        .onConflictDoNothing();
    }
  }
}

export const dataPortabilityService = {
  exportData,
  previewImport,
  applyImport,
};
