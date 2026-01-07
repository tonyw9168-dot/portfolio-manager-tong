import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Create a mock context for testing
function createMockContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.verifyPassword", () => {
  it("returns success true for correct password", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.verifyPassword({ password: "portfolio2026" });

    expect(result).toEqual({ success: true });
  });

  it("returns success false for incorrect password", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.verifyPassword({ password: "wrongpassword" });

    expect(result).toEqual({ success: false });
  });
});

describe("categories.list", () => {
  it("returns an array of categories", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.categories.list();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("snapshots.list", () => {
  it("returns an array of snapshots", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.snapshots.list();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("assetValues.list", () => {
  it("returns an array of asset values", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.assetValues.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("accepts optional filter parameters", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.assetValues.list({ categoryId: 1 });

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("cashFlows.list", () => {
  it("returns an array of cash flows", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cashFlows.list();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("exchangeRates.list", () => {
  it("returns an array of exchange rates", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.exchangeRates.list();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("dashboard.overview", () => {
  it("returns dashboard overview data", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.overview();

    expect(result).toHaveProperty("totalValue");
    expect(result).toHaveProperty("latestSnapshot");
    expect(result).toHaveProperty("categoryTotals");
    expect(result).toHaveProperty("trendData");
    expect(result).toHaveProperty("snapshotCount");
    expect(result).toHaveProperty("assetCount");
  });
});
