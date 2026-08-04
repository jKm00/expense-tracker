// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataPortabilityExport, ImportSummary } from "./data-portability.dtos";
import { DataPortabilityCard } from "./data-portability.card";

const mockController = vi.hoisted(() => ({
  exportData: vi.fn(),
  previewImport: vi.fn(),
  applyImport: vi.fn(),
}));

vi.mock("./data-portability.controller", () => ({
  dataPortabilityController: mockController,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const now = "2026-01-01T00:00:00.000Z";

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <DataPortabilityCard />
    </QueryClientProvider>,
  );
}

function makePayload(): DataPortabilityExport {
  return {
    format: "expense-tracker-export",
    version: 1,
    exportedAt: now,
    period: { type: "all" },
    counts: {},
    data: {
      tags: [],
      products: [],
      productAliases: [],
      productTags: [],
      transactions: [],
      entries: [],
      entryTags: [],
      recurring: [],
      receiptItemMappings: [],
      analytics: {
        chartPreferences: null,
        excludedTagIds: [],
        excludedProductIds: [],
      },
    },
  };
}

function makeSummary(): ImportSummary {
  return {
    creates: { transactions: 1, entries: 1 },
    skips: { products: 1 },
    conflicts: [],
    errors: [],
  };
}

describe("DataPortabilityCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("previews and confirms a valid import file", async () => {
    const payload = makePayload();
    const summary = makeSummary();
    mockController.previewImport.mockResolvedValue([null, summary]);
    mockController.applyImport.mockResolvedValue([null, summary]);
    renderCard();

    const input = screen.getByLabelText(/json export file/i);
    const file = new File([JSON.stringify(payload)], "export.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", {
      value: vi.fn().mockResolvedValue(JSON.stringify(payload)),
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockController.previewImport).toHaveBeenCalledWith({
        data: { payload },
      });
    });
    expect(
      (await screen.findByRole("button", { name: /confirm import/i })).hasAttribute("disabled"),
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /confirm import/i }));

    await waitFor(() => {
      expect(mockController.applyImport).toHaveBeenCalledWith({ data: { payload } });
    });
  });
});
