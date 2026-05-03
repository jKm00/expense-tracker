// Shared factory functions for service tests

export function makeTag(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "tag-1",
    userId: "user-1",
    name: "Groceries",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    products: [],
    ...overrides,
  };
}

export function makeProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "product-1",
    userId: "user-1",
    name: "Milk",
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    tags: [],
    ...overrides,
  };
}

export function makeTransaction(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    id: "tx-1",
    userId: "user-1",
    store: "Supermarket",
    description: null,
    source: "manual" as const,
    date: new Date("2024-01-15"),
    totalPrice: "-10",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    entries: [],
    ...overrides,
  };
}

export function makeEntry(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "entry-1",
    transactionId: "tx-1",
    productId: "product-1",
    quantity: 1,
    price: "10",
    type: "expense" as const,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    products: makeProduct(),
    tags: [],
    ...overrides,
  };
}

export function makeRecurring(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    id: "rec-1",
    productId: "product-1",
    price: "9.99",
    interval: "monthly" as const,
    type: "expense" as const,
    start: new Date("2024-01-01"),
    end: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    products: makeProduct(),
    ...overrides,
  };
}
