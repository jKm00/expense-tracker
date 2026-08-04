import z from "zod";
import { entryTypes, transactionSources } from "@/features/transactions/transactions.models";

const isoDateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Must be a valid ISO date string",
});

const decimalString = z.string().regex(/^-?\d+(\.\d{1,2})?$/, {
  message: "Must be a decimal string with up to two decimals",
});

export const exportPeriodSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("all") }).strict(),
  z
    .object({
      type: z.literal("range"),
      from: isoDateString,
      to: isoDateString,
    })
    .strict()
    .refine((value) => Date.parse(value.from) <= Date.parse(value.to), {
      message: "From date must be before or equal to to date",
      path: ["from"],
    }),
]);

const exportTagSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    color: z.string().nullable(),
    createdAt: isoDateString,
    updatedAt: isoDateString,
  })
  .strict();

const exportProductSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    createdAt: isoDateString,
    updatedAt: isoDateString,
    deletedAt: isoDateString.nullable(),
  })
  .strict();

const exportProductAliasSchema = z
  .object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    name: z.string().min(1),
    normalizedName: z.string().min(1),
    createdAt: isoDateString,
    updatedAt: isoDateString,
  })
  .strict();

const exportProductTagSchema = z
  .object({
    productId: z.string().uuid(),
    tagId: z.string().uuid(),
  })
  .strict();

const exportTransactionSchema = z
  .object({
    id: z.string().uuid(),
    store: z.string().nullable(),
    description: z.string().nullable(),
    source: z.enum(transactionSources),
    needsReview: z.boolean(),
    totalPrice: decimalString,
    date: isoDateString,
    createdAt: isoDateString,
    updatedAt: isoDateString,
  })
  .strict();

const exportEntrySchema = z
  .object({
    id: z.string().uuid(),
    transactionId: z.string().uuid(),
    productId: z.string().uuid(),
    price: decimalString,
    quantity: z.number().int().positive(),
    type: z.enum(entryTypes),
  })
  .strict();

const exportEntryTagSchema = z
  .object({
    entryId: z.string().uuid(),
    tagId: z.string().uuid(),
  })
  .strict();

const exportRecurringSchema = z
  .object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    price: decimalString,
    interval: z.enum(["weekly", "monthly", "yearly"]),
    type: z.enum(entryTypes),
    start: isoDateString,
    end: isoDateString.nullable(),
    isActive: z.boolean(),
    createdAt: isoDateString,
    updatedAt: isoDateString,
  })
  .strict();

const exportReceiptMappingSchema = z
  .object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    itemName: z.string().min(1),
    normalizedItemName: z.string().min(1),
    confirmationCount: z.number().int().positive(),
    lastConfirmedAt: isoDateString,
    createdAt: isoDateString,
    updatedAt: isoDateString,
  })
  .strict();

const exportAnalyticsSchema = z
  .object({
    chartPreferences: z
      .object({
        hideUntagged: z.boolean(),
        hideUnknownProduct: z.boolean(),
        createdAt: isoDateString,
        updatedAt: isoDateString,
      })
      .strict()
      .nullable(),
    excludedTagIds: z.array(z.string().uuid()),
    excludedProductIds: z.array(z.string().uuid()),
  })
  .strict();

export const dataPortabilityExportSchema = z
  .object({
    format: z.literal("expense-tracker-export"),
    version: z.literal(1),
    exportedAt: isoDateString,
    period: exportPeriodSchema,
    counts: z.record(z.string(), z.number().int().nonnegative()),
    data: z
      .object({
        tags: z.array(exportTagSchema),
        products: z.array(exportProductSchema),
        productAliases: z.array(exportProductAliasSchema),
        productTags: z.array(exportProductTagSchema),
        transactions: z.array(exportTransactionSchema),
        entries: z.array(exportEntrySchema),
        entryTags: z.array(exportEntryTagSchema),
        recurring: z.array(exportRecurringSchema),
        receiptItemMappings: z.array(exportReceiptMappingSchema),
        analytics: exportAnalyticsSchema,
      })
      .strict(),
  })
  .strict();

export const previewImportSchema = z.object({
  payload: dataPortabilityExportSchema,
});

export const applyImportSchema = previewImportSchema;

export type ExportPeriod = z.infer<typeof exportPeriodSchema>;
export type DataPortabilityExport = z.infer<typeof dataPortabilityExportSchema>;
export type DataPortabilityData = DataPortabilityExport["data"];

export type ImportReportItem = {
  type: string;
  id: string;
  name?: string;
  reason: string;
};

export type ImportSummary = {
  creates: Record<string, number>;
  skips: Record<string, number>;
  conflicts: ImportReportItem[];
  errors: ImportReportItem[];
};
