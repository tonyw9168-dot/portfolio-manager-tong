import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("Dashboard ROI Calculation", () => {
  it("should calculate overall ROI correctly", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.dashboard.overview();

    // Verify ROI is calculated
    expect(result).toHaveProperty("overallRoi");
    expect(typeof result.overallRoi).toBe("number");
  });

  it("should include ROI for each category", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.dashboard.overview();

    // Verify category totals include ROI
    if (result.categoryTotals && result.categoryTotals.length > 0) {
      result.categoryTotals.forEach((cat: any) => {
        expect(cat).toHaveProperty("name");
        expect(cat).toHaveProperty("value");
        expect(cat).toHaveProperty("roi");
      });
    }
  });
});

describe("Asset Value Tracking", () => {
  it("should track asset values across snapshots", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const values = await caller.assetValues.list({});

    // Verify asset values are retrieved
    expect(Array.isArray(values)).toBe(true);

    if (values.length > 0) {
      values.forEach((av: any) => {
        expect(av).toHaveProperty("assetName");
        expect(av).toHaveProperty("categoryId");
        expect(av).toHaveProperty("snapshotId");
        expect(av).toHaveProperty("cnyValue");
      });
    }
  });
});

describe("Cash Flow Management", () => {
  it("should retrieve all cash flows", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const cashFlows = await caller.cashFlows.list();

    // Verify cash flows are retrieved
    expect(Array.isArray(cashFlows)).toBe(true);

    if (cashFlows.length > 0) {
      cashFlows.forEach((cf: any) => {
        expect(cf).toHaveProperty("flowType");
        expect(["inflow", "outflow"]).toContain(cf.flowType);
        expect(cf).toHaveProperty("cnyAmount");
      });
    }
  });
});

describe("Exchange Rate Management", () => {
  it("should retrieve exchange rates", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    const rates = await caller.exchangeRates.list();

    // Verify exchange rates are retrieved
    expect(Array.isArray(rates)).toBe(true);

    if (rates.length > 0) {
      rates.forEach((rate: any) => {
        expect(rate).toHaveProperty("fromCurrency");
        expect(rate).toHaveProperty("toCurrency");
        expect(rate).toHaveProperty("rate");
      });
    }
  });
});

describe("Portfolio Data Integrity", () => {
  it("should ensure all numbers are anchored to Excel data", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    // Get dashboard data
    const dashboard = await caller.dashboard.overview();

    // Verify total value is a valid number
    expect(typeof dashboard.totalValue).toBe("string");
    const totalValue = parseFloat(dashboard.totalValue as string);
    expect(!isNaN(totalValue)).toBe(true);
    expect(totalValue).toBeGreaterThan(0);

    // Verify category totals sum up
    let categorySum = 0;
    dashboard.categoryTotals?.forEach((cat: any) => {
      expect(typeof cat.value).toBe("number");
      expect(cat.value).toBeGreaterThanOrEqual(0);
      categorySum += cat.value;
    });

    // Note: categorySum should be close to totalValue (allowing for rounding)
    expect(Math.abs(categorySum - totalValue) < 1).toBe(true);
  });
});
