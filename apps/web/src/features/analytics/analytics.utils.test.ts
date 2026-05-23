import { describe, expect, it } from "vitest";
import { filterTransactionsByTags, getMergedEntryTags } from "./analytics.utils";
import { makeEntry, makeProduct, makeTag, makeTransaction } from "../__test-fixtures__";
import { calculateVariableTotals } from "./analytics.calculations";

describe("analytics.utils", () => {
  describe("getMergedEntryTags", () => {
    it("returns deduplicated union of product and entry tags", () => {
      const shared = makeTag({ id: "tag-shared", name: "Shared" });
      const productOnly = makeTag({ id: "tag-product", name: "Product" });
      const entryOnly = makeTag({ id: "tag-entry", name: "Entry" });

      const entry = {
        ...makeEntry(),
        products: makeProduct({ tags: [shared, productOnly] }),
        tags: [shared, entryOnly],
      };

      const merged = getMergedEntryTags(entry as any);
      expect(merged.map((tag) => tag.id)).toEqual([
        "tag-shared",
        "tag-product",
        "tag-entry",
      ]);
    });
  });

  describe("filterTransactionsByTags", () => {
    it("includes entries when include tag exists on entry tags", () => {
      const social = makeTag({ id: "tag-social", name: "Social" });
      const tx = makeTransaction({
        entries: [
          {
            ...makeEntry(),
            products: makeProduct({ tags: [] }),
            tags: [social],
          },
        ],
      });

      const filtered = filterTransactionsByTags([tx as any], [social as any], []);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].entries).toHaveLength(1);
    });

    it("excludes entries when exclude tag exists on entry tags", () => {
      const social = makeTag({ id: "tag-social", name: "Social" });
      const tx = makeTransaction({
        entries: [
          {
            ...makeEntry(),
            products: makeProduct({ tags: [] }),
            tags: [social],
          },
        ],
      });

      const filtered = filterTransactionsByTags([tx as any], [], [social as any]);
      expect(filtered).toHaveLength(0);
    });

    it("includes entries when include tag exists on product tags", () => {
      const food = makeTag({ id: "tag-food", name: "Food" });
      const tx = makeTransaction({
        entries: [
          {
            ...makeEntry(),
            products: makeProduct({ tags: [food] }),
            tags: [],
          },
        ],
      });

      const filtered = filterTransactionsByTags([tx as any], [food as any], []);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].entries).toHaveLength(1);
    });

    it("counts shopping transactions as variable totals", () => {
      const tx = makeTransaction({
        source: "shopping",
        entries: [{ ...makeEntry(), price: "12", quantity: 2 }],
      });

      const totals = calculateVariableTotals([tx as any]);
      expect(totals.variableExpenses).toBe(24);
    });
  });
});
