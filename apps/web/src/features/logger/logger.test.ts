import { beforeEach, describe, expect, it, vi } from "vitest";

const { infoMock, errorMock } = vi.hoisted(() => {
  return {
    infoMock: vi.fn(),
    errorMock: vi.fn(),
  };
});

vi.mock("pino", () => {
  return {
    default: () => ({
      info: infoMock,
      error: errorMock,
    }),
  };
});

import { getLogger, runWithLogContext } from "./logger.context";

beforeEach(() => {
  infoMock.mockClear();
  errorMock.mockClear();
});

describe("logger context", () => {
  it("adds attr to the current request context", async () => {
    const ctx = {
      requestId: "req_123",
      sampled: true,
      attrs: {},
    };

    await runWithLogContext(ctx, async () => {
      const logger = getLogger();

      logger.addAttrs({
        userId: "user_123",
      });

      logger.info("hello");
    });

    expect(ctx.attrs).toEqual({
      userId: "user_123",
    });

    expect(infoMock).toHaveBeenCalledWith(
      {
        requestId: "req_123",
        userId: "user_123",
      },
      "hello",
    );
  });

  it("does nothing when addAttrs is called without context", () => {
    const logger = getLogger();

    logger.addAttrs({
      userId: "user_123",
    });

    expect(infoMock).not.toHaveBeenCalled();
    expect(errorMock).not.toHaveBeenCalled();
  });

  it("does not log info when request is not sampled", async () => {
    const ctx = {
      requestId: "req_123",
      sampled: false,
      attrs: {},
    };

    await runWithLogContext(ctx, async () => {
      getLogger().info("boring success");
    });

    expect(infoMock).not.toHaveBeenCalled();
  });

  it("always logs error even when request is not sampled", async () => {
    const ctx = {
      requestId: "req_123",
      sampled: false,
      attrs: {},
    };

    await runWithLogContext(ctx, async () => {
      getLogger().error("something failed", {
        error: "boom",
      });
    });

    expect(errorMock).toHaveBeenCalledWith(
      {
        requestId: "req_123",
        error: "boom",
      },
      "something failed",
    );
  });

  it("keeps concurrent request context isloated", async () => {
    const ctxA = {
      requestId: "req_A",
      sampled: true,
      attrs: {},
    };

    const ctxB = {
      requestId: "req_B",
      sampled: true,
      attrs: {},
    };

    await Promise.all([
      runWithLogContext(ctxA, async () => {
        getLogger().addAttrs({ userId: "user_A" });
        await new Promise((res) => setTimeout(res, 10));
        getLogger().info("done A");
      }),
      runWithLogContext(ctxB, async () => {
        getLogger().addAttrs({ userId: "user_B" });
        await new Promise((res) => setTimeout(res, 1));
        getLogger().info("done B");
      }),
    ]);

    expect(infoMock).toHaveBeenCalledWith(
      {
        requestId: "req_A",
        userId: "user_A",
      },
      "done A",
    );

    expect(infoMock).toHaveBeenCalledWith(
      {
        requestId: "req_B",
        userId: "user_B",
      },
      "done B",
    );
  });
});
