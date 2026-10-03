// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductWithTag } from "@/features/products/products.models";
import type { ReceiptScanMatchResult } from "@/features/receipt-scanning/receipt-scanning.models";
import type { ShoppingListWithItems } from "@/features/shopping/shopping.models";
import type { Tag } from "@/features/tags/tags.models";
import type { FullTransaction } from "../transactions.models";
import { TransactionDraftWorkspace } from "./transaction-draft-workspace";

const mocks = vi.hoisted(() => ({
  queryData: new Map<string, unknown>(),
  save: vi.fn(),
  update: vi.fn(),
  checkout: vi.fn(),
  scan: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: () => null,
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey, enabled }: { queryKey: string[]; enabled?: boolean }) => ({
    data: enabled === false ? undefined : mocks.queryData.get(queryKey[0]),
    isLoading: false,
  }),
}));
vi.mock("@/features/receipt-scanning/receipt-scanning.controller", () => ({
  receiptScanningController: {},
}));
vi.mock("@/features/receipt-scanning/receipt-scanning.queries", () => ({
  receiptScanningQueries: {
    listScansOptions: () => ({ queryKey: ["usage"] }),
    getScanOptions: () => ({ queryKey: ["scan"] }),
    matchScanOptions: () => ({ queryKey: ["match"] }),
  },
}));
vi.mock("../transactions.queries", () => ({
  transactionQueries: {
    getTransactionsOptions: () => ({ queryKey: ["transactions"] }),
  },
}));
vi.mock("../transactions.mutations", () => ({
  transactionMutations: {
    saveTransaction: () => ({ mutate: mocks.save, isPending: false }),
    updateTransaction: () => ({ mutate: mocks.update, isPending: false }),
  },
}));
vi.mock("@/features/shopping/shopping.mutations", () => ({
  shoppingMutations: {
    completeShopping: () => ({ mutate: mocks.checkout, isPending: false }),
  },
}));
vi.mock("@/features/receipt-scanning/receipt-scanning.mutations", () => ({
  receiptScanningMutations: {
    createScanUpload: () => ({ mutate: vi.fn(), isPending: false }),
    completeTransactionScan: () => ({ mutate: mocks.scan, isPending: false }),
    completeTransactionReplacementScan: () => ({ mutate: vi.fn(), isPending: false }),
    completeCheckoutScan: () => ({ mutate: vi.fn(), isPending: false }),
  },
}));

const date = new Date("2026-01-01T12:00:00");
function tag(id: string, name: string): Tag {
  return { id, name, userId: "user-1", color: "#123456", createdAt: date, updatedAt: date };
}
const dairy = tag("dairy", "Dairy");
const bakery = tag("bakery", "Bakery");
const oldTag = tag("old", "Saved product tag");
const entryTag = tag("entry", "For guests");
const tags = [dairy, bakery, oldTag, entryTag];

function product(id: string, name: string, tags: Tag[] = []): ProductWithTag {
  return {
    id, name, tags, userId: "user-1", createdAt: date, updatedAt: date,
    deletedAt: null, aliases: [],
  };
}
const milk = product("milk", "Milk", [dairy]);
const bread = product("bread", "Bread", [bakery]);
const water = product("water", "Water");
const products = [milk, bread, water];

function transaction(savedProduct: ProductWithTag): FullTransaction {
  return {
    id: "transaction-1", userId: "user-1", store: "Store", description: null,
    source: "manual", needsReview: false, totalPrice: "-5", date,
    createdAt: date, updatedAt: date,
    entries: [{
      id: "entry-1", transactionId: "transaction-1", productId: savedProduct.id,
      products: savedProduct, quantity: 1, price: "5", type: "expense", tags: [entryTag],
    }],
  };
}

function editor() {
  return within(screen.getByRole("dialog", { name: "Transaction item" }));
}

function selectProduct(name: string, current = "Select product", create = false) {
  fireEvent.click(editor().getByRole("button", { name: current }));
  fireEvent.change(screen.getByRole("textbox", { name: "Search products" }), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole("button", {
    name: create ? `Create '${name}'` : name,
  }));
}

function setPrice() {
  // FormFieldLabel is not associated with the input, so scope to its field.
  const field = editor().getByText("Unit price").parentElement!;
  fireEvent.change(within(field).getByRole("textbox"), { target: { value: "5" } });
}

function expectProductTags(...names: string[]) {
  const field = editor().getByText("Product", { exact: true }).parentElement!;
  const selector = within(field).getByRole("button");
  expect(editor().queryByText("Product tags", { exact: true })).toBeNull();
  expect(editor().queryByText("These tags apply automatically from the product.")).toBeNull();
  expect(editor().queryByText("This product has no tags.")).toBeNull();
  expect(editor().queryByText("Product tags are unavailable.")).toBeNull();
  expect(field.children).toHaveLength(names.length ? 3 : 2);

  if (names.length) {
    const badges = selector.nextElementSibling!;
    expect(Array.from(badges.children, (badge) => badge.textContent)).toEqual(names);
    expect(badges.querySelectorAll('span[data-slot="badge"]')).toHaveLength(names.length);
    expect(within(badges as HTMLElement).queryByRole("button")).toBeNull();
    expect(within(badges as HTMLElement).queryByRole("combobox")).toBeNull();
  } else {
    expect(selector.nextElementSibling).toBeNull();
  }
}

function expectEntryTags(...names: string[]) {
  const field = editor().getByPlaceholderText("Add entry tags").parentElement!;
  for (const tag of tags) {
    expect(Boolean(within(field).queryByText(tag.name))).toBe(names.includes(tag.name));
  }
}

async function expectEntryTagOptions(...excluded: string[]) {
  const input = editor().getByPlaceholderText("Add entry tags");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  const list = within(await screen.findByRole("listbox"));
  for (const tag of tags) {
    expect(Boolean(list.queryByRole("option", { name: tag.name }))).toBe(
      !excluded.includes(tag.name),
    );
  }
  fireEvent.pointerDown(editor().getByText("Quantity"));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryData.clear();
});
afterEach(cleanup);

describe("TransactionDraftWorkspace product tags", () => {
  it.each(["row", "badge"] as const)(
    "selects entry tags by clicking the %s inside the item dialog",
    async (target) => {
      render(<TransactionDraftWorkspace kind="new" products={products} tags={tags} />);
      fireEvent.click(screen.getByRole("button", { name: "Add item" }));
      selectProduct("Milk");
      setPrice();

      const dialog = screen.getByRole("dialog", { name: "Transaction item" });
      const input = editor().getByPlaceholderText("Add entry tags");
      fireEvent.keyDown(input, { key: "ArrowDown" });
      const list = await screen.findByRole("listbox");
      expect(dialog.contains(list)).toBe(true);
      const row = within(list).getByRole("option", { name: entryTag.name });
      const element = target === "badge" ? within(row).getByText(entryTag.name) : row;
      expect(window.getComputedStyle(element).pointerEvents).toBe("auto");
      fireEvent(element, new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
      fireEvent.mouseDown(element);
      fireEvent.mouseUp(element);
      fireEvent.click(element);

      expectEntryTags(entryTag.name);
      expect(screen.getByRole("dialog", { name: "Transaction item" })).toBe(dialog);
      fireEvent.input(input, {
        target: { value: bakery.name }, inputType: "insertText",
      });
      await screen.findByRole("option", { name: bakery.name });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "Enter" });
      expectEntryTags(entryTag.name, bakery.name);
      fireEvent.click(editor().getByRole("button", { name: "Expense" }));
      fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));
      expect(mocks.save.mock.calls[0][0].entries[0].tagIds).toEqual([
        entryTag.id, bakery.id,
      ]);
    },
  );

  it("filters only the selected product's tags from entry tag options", async () => {
    render(<TransactionDraftWorkspace kind="new" products={products} tags={tags} />);
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    await expectEntryTagOptions();

    selectProduct("Milk");
    await expectEntryTagOptions(dairy.name);

    selectProduct("Bread", "Milk");
    await expectEntryTagOptions(bakery.name);

    selectProduct("Water", "Bread");
    await expectEntryTagOptions();

    selectProduct("Fresh fruit", "Water", true);
    await expectEntryTagOptions();
    expectEntryTags();
  });

  it("preserves recorded entry tags even when they also belong to the product", async () => {
    const recorded = transaction(milk);
    recorded.entries[0].tags = [dairy, entryTag];
    render(<TransactionDraftWorkspace kind="edit" transaction={recorded} products={products} tags={tags} />);
    fireEvent.click(screen.getByRole("button", { name: /^Milk 1 x/ }));

    expectEntryTags(dairy.name, entryTag.name);
    await expectEntryTagOptions(dairy.name);
    expectEntryTags(dairy.name, entryTag.name);
    fireEvent.input(editor().getByPlaceholderText("Add entry tags"), {
      target: { value: bakery.name }, inputType: "insertText",
    });
    fireEvent.click(await screen.findByRole("option", { name: bakery.name }));
    expectEntryTags(dairy.name, entryTag.name, bakery.name);
    fireEvent.click(editor().getByRole("button", { name: "Expense" }));
    fireEvent.click(screen.getByRole("button", { name: "Update transaction" }));

    expect(mocks.update.mock.calls[0][0].entries[0].tagIds).toEqual([
      dairy.id, entryTag.id, bakery.id,
    ]);
  });

  it("updates read-only product tags on selection without changing entry tags through save and submit", async () => {
    render(<TransactionDraftWorkspace kind="new" products={products} tags={tags} />);
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));

    expectProductTags();
    expect(editor().getByText("Entry tags")).toBeTruthy();
    expectEntryTags();

    selectProduct("Milk");
    expectProductTags("Dairy");
    expectEntryTags();

    const tagInput = editor().getByPlaceholderText("Add entry tags");
    fireEvent.input(tagInput, {
      target: { value: entryTag.name }, inputType: "insertText",
    });
    fireEvent.click(await screen.findByRole("option", { name: entryTag.name }));
    expectEntryTags(entryTag.name);

    selectProduct("Bread", "Milk");
    expectProductTags("Bakery");
    expectEntryTags(entryTag.name);

    selectProduct("Water", "Bread");
    expectProductTags();
    expectEntryTags(entryTag.name);

    selectProduct("Fresh fruit", "Water", true);
    expectProductTags();
    expectEntryTags(entryTag.name);

    selectProduct("Bread", "Fresh fruit");
    setPrice();
    fireEvent.click(editor().getByRole("button", { name: "Expense" }));
    fireEvent.click(screen.getByRole("button", { name: /^Bread 1 x/ }));
    expectProductTags("Bakery");
    expectEntryTags(entryTag.name);
    fireEvent.click(editor().getByRole("button", { name: "Expense" }));
    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));

    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save.mock.calls[0][0].entries).toEqual([{
      product: { id: bread.id, name: bread.name }, quantity: "1", price: "5",
      type: "expense", tagIds: [entryTag.id],
    }]);
  });

  it("submits a newly created product with no inherited entry tags", () => {
    render(<TransactionDraftWorkspace kind="new" products={products} tags={tags} />);
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    selectProduct("Fresh fruit", "Select product", true);
    expectProductTags();
    setPrice();
    fireEvent.click(editor().getByRole("button", { name: "Expense" }));
    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));

    expect(mocks.save.mock.calls[0][0].entries).toEqual([{
      product: { id: null, name: "Fresh fruit" }, quantity: "1", price: "5",
      type: "expense", tagIds: [],
    }]);
  });

  it.each([
    { name: "current product tags instead of saved tags", available: products, expected: ["Dairy"] },
    { name: "archived product tags from the saved transaction", available: [bread], expected: [oldTag.name] },
    { name: "an empty current tag list instead of saved tags", available: [product(milk.id, milk.name)], expected: [] },
  ])("prefills edits using $name without leaking tags into the product DTO", async ({ available, expected }) => {
    const savedProduct = { ...milk, name: "Milk before rename", tags: [oldTag], deletedAt: date };
    render(<TransactionDraftWorkspace kind="edit" transaction={transaction(savedProduct)} products={available} tags={tags} />);
    fireEvent.click(screen.getByRole("button", { name: /^Milk before rename 1 x/ }));

    expectProductTags(...expected);
    await expectEntryTagOptions(...expected);
    expectEntryTags(entryTag.name);
    fireEvent.click(editor().getByRole("button", { name: "Expense" }));
    fireEvent.click(screen.getByRole("button", { name: "Update transaction" }));

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update.mock.calls[0][0].entries).toEqual([{
      id: "entry-1", product: { id: milk.id, name: savedProduct.name },
      quantity: "1", price: "5", type: "expense", tagIds: [entryTag.id],
    }]);
  });

  it.each(["matched", "suggestion", "unavailable"] as const)(
    "resolves tags for scan products (%s) without adding entry tags",
    async (mode) => {
      const scanProduct = { id: milk.id, name: milk.name };
      const result: ReceiptScanMatchResult = {
        receipt: { confidence: 1, warnings: [], items: [] },
        lines: [{
          id: "scan-line", receiptItemName: "Transaction item",
          product: mode === "suggestion" ? null : scanProduct,
          suggestions: [{ product: scanProduct, score: 1, reason: "product" }],
          quantity: "1", price: "5", lineTotal: "5", confidence: 1,
        }],
      };
      mocks.queryData.set("scan", [null, { status: "completed" }]);
      mocks.queryData.set("match", [null, result]);
      render(<TransactionDraftWorkspace kind="new" initialScanId="scan-1" products={mode === "unavailable" ? [] : products} tags={tags} />);
      fireEvent.click(await screen.findByRole("button", {
        name: mode === "suggestion" ? /^Transaction item Needs match/ : /^Milk Matched/,
      }));

      if (mode === "suggestion") {
        const field = editor().getByText("Product", { exact: true }).parentElement!;
        expect(field.querySelector('[data-slot="badge"]')).toBeNull();
        fireEvent.click(editor().getByRole("button", { name: "Milk" }));
      }
      expectProductTags(...(mode === "unavailable" ? [] : ["Dairy"]));
      await expectEntryTagOptions(...(mode === "unavailable" ? [] : ["Dairy"]));
      expectEntryTags();
      fireEvent.click(editor().getByRole("button", { name: "Save item" }));
      fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));

      expect(mocks.scan).toHaveBeenCalledTimes(1);
      expect(mocks.scan.mock.calls[0][0].entries).toEqual([{
        receiptItemName: "Transaction item", product: scanProduct,
        quantity: "1", price: "5", type: "expense", tagIds: [],
      }]);
      expect(mocks.save).not.toHaveBeenCalled();
    },
  );

  it("shows product tags for prefilled shopping items without submitting them as entry tags", async () => {
    const shoppingList: ShoppingListWithItems = {
      id: "list-1", userId: "user-1", createdAt: date, updatedAt: date,
      items: [{
        id: "shopping-item", shoppingListId: "list-1", productId: milk.id,
        product: milk, checked: true, createdAt: date, updatedAt: date,
      }],
    };
    render(<TransactionDraftWorkspace kind="checkout" shoppingList={shoppingList} products={products} tags={tags} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: /^Milk 1 x/ }));

    expectProductTags("Dairy");
    await expectEntryTagOptions(dairy.name);
    expectEntryTags();
    setPrice();
    fireEvent.click(editor().getByRole("button", { name: "Expense" }));
    fireEvent.click(screen.getByRole("button", { name: "Review summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete checkout" }));

    expect(mocks.checkout).toHaveBeenCalledTimes(1);
    expect(mocks.checkout.mock.calls[0][0].entries).toEqual([{
      shoppingItemId: "shopping-item", product: { id: milk.id, name: milk.name },
      quantity: "1", price: "5", type: "expense", tagIds: [],
    }]);
  });
});
