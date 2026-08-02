import { describe, expect, it } from "vitest";
import { parseAnalyzeExpense } from "../src/textract-parser";

describe("parseAnalyzeExpense", () => {
  it("normalizes receipt summary and line items", () => {
    const receipt = parseAnalyzeExpense({
      $metadata: {},
      ExpenseDocuments: [
        {
          SummaryFields: [
            { Type: { Text: "VENDOR_NAME", Confidence: 99 }, ValueDetection: { Text: "Test Store", Confidence: 98 } },
            { Type: { Text: "INVOICE_RECEIPT_DATE", Confidence: 95 }, ValueDetection: { Text: "2026-08-02", Confidence: 95 } },
            { Type: { Text: "TOTAL", Confidence: 97 }, ValueDetection: { Text: "123,45", Confidence: 97 } },
          ],
          LineItemGroups: [
            {
              LineItems: [
                {
                  LineItemExpenseFields: [
                    { Type: { Text: "ITEM", Confidence: 99 }, ValueDetection: { Text: "Milk", Confidence: 99 } },
                    { Type: { Text: "QUANTITY", Confidence: 90 }, ValueDetection: { Text: "2", Confidence: 90 } },
                    { Type: { Text: "PRICE", Confidence: 90 }, ValueDetection: { Text: "10.00", Confidence: 90 } },
                    { Type: { Text: "TOTAL_PRICE", Confidence: 90 }, ValueDetection: { Text: "20.00", Confidence: 90 } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(receipt.store).toBe("Test Store");
    expect(receipt.date).toBe("2026-08-02");
    expect(receipt.total).toBe("123.45");
    expect(receipt.items).toEqual([
      expect.objectContaining({ name: "Milk", quantity: "2", unitPrice: "10.00", lineTotal: "20.00" }),
    ]);
  });

  it("returns an empty result for non-receipts", () => {
    expect(parseAnalyzeExpense({ $metadata: {}, ExpenseDocuments: [] }).items).toEqual([]);
  });
});
