import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as XLSX from "xlsx";
import {
  getAllCategories, upsertCategory, getCategoryByName,
  getAllAssets, getAssetsByCategory, upsertAsset, getAssetByNameAndCategory,
  getAllSnapshots, upsertSnapshot, getSnapshotByLabel,
  getAssetValues, upsertAssetValue,
  getAllCashFlows, addCashFlow, deleteCashFlow,
  getAllExchangeRates, getLatestExchangeRate, upsertExchangeRate,
  getAllPortfolioSummaries, upsertPortfolioSummary,
  clearAllData
} from "./db";

// Password for access control
const ACCESS_PASSWORD = "portfolio2026";

// Verify password procedure
const verifyPassword = publicProcedure.input(z.object({ password: z.string() }));

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    verifyPassword: publicProcedure
      .input(z.object({ password: z.string() }))
      .mutation(({ input }) => {
        return { success: input.password === ACCESS_PASSWORD };
      }),
  }),

  // Categories
  categories: router({
    list: publicProcedure.query(async () => {
      return getAllCategories();
    }),
  }),

  // Assets
  assets: router({
    list: publicProcedure.query(async () => {
      return getAllAssets();
    }),
    byCategory: publicProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(async ({ input }) => {
        return getAssetsByCategory(input.categoryId);
      }),
  }),

  // Snapshots
  snapshots: router({
    list: publicProcedure.query(async () => {
      return getAllSnapshots();
    }),
  }),

  // Asset Values
  assetValues: router({
    list: publicProcedure
      .input(z.object({ 
        categoryId: z.number().optional(), 
        snapshotId: z.number().optional() 
      }).optional())
      .query(async ({ input }) => {
        return getAssetValues(input);
      }),
  }),

  // Cash Flows
  cashFlows: router({
    list: publicProcedure.query(async () => {
      return getAllCashFlows();
    }),
    add: publicProcedure
      .input(z.object({
        flowDate: z.string(),
        flowType: z.enum(["inflow", "outflow"]),
        sourceAccount: z.string().optional(),
        targetAccount: z.string().optional(),
        assetName: z.string().optional(),
        originalAmount: z.string(),
        currency: z.string().default("CNY"),
        cnyAmount: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await addCashFlow({
          flowDate: new Date(input.flowDate),
          flowType: input.flowType,
          sourceAccount: input.sourceAccount,
          targetAccount: input.targetAccount,
          assetName: input.assetName,
          originalAmount: input.originalAmount,
          currency: input.currency,
          cnyAmount: input.cnyAmount,
          description: input.description,
        });
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCashFlow(input.id);
        return { success: true };
      }),
  }),

  // Exchange Rates
  exchangeRates: router({
    list: publicProcedure.query(async () => {
      return getAllExchangeRates();
    }),
    upsert: publicProcedure
      .input(z.object({
        fromCurrency: z.string(),
        rate: z.string(),
        effectiveDate: z.string(),
      }))
      .mutation(async ({ input }) => {
        await upsertExchangeRate({
          fromCurrency: input.fromCurrency,
          toCurrency: "CNY",
          rate: input.rate,
          effectiveDate: new Date(input.effectiveDate),
        });
        return { success: true };
      }),
    getLatest: publicProcedure
      .input(z.object({ fromCurrency: z.string() }))
      .query(async ({ input }) => {
        return getLatestExchangeRate(input.fromCurrency);
      }),
  }),

  // Portfolio Summary
  portfolioSummary: router({
    list: publicProcedure.query(async () => {
      return getAllPortfolioSummaries();
    }),
  }),

  // Import Excel
  import: router({
    excel: publicProcedure
      .input(z.object({ data: z.string() })) // Base64 encoded Excel file
      .mutation(async ({ input }) => {
        try {
          // Decode base64
          const buffer = Buffer.from(input.data, "base64");
          const workbook = XLSX.read(buffer, { type: "buffer" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

          // Clear existing data
          await clearAllData();

          // Parse headers to get snapshot dates
          const headers = jsonData[0] as string[];
          const snapshotLabels: string[] = [];
          const snapshotIndices: { label: string; valueIndex: number; changeIndex: number }[] = [];

          // Find snapshot columns (format: MMDD人民币价值)
          for (let i = 0; i < headers.length; i++) {
            const header = headers[i]?.toString() || "";
            const match = header.match(/^(\d{4})人民币价值$/);
            if (match) {
              const label = match[1];
              snapshotLabels.push(label);
              // Find corresponding change column
              let changeIndex = -1;
              for (let j = i + 1; j < headers.length; j++) {
                const nextHeader = headers[j]?.toString() || "";
                if (nextHeader.includes("期末减期初")) {
                  changeIndex = j;
                  break;
                }
                if (nextHeader.includes("人民币价值")) break;
              }
              snapshotIndices.push({ label, valueIndex: i, changeIndex });
            }
          }

          // Create snapshots
          const snapshotMap: Record<string, number> = {};
          for (const label of snapshotLabels) {
            // Convert label to date (assume 2024 for 11xx, 12xx; 2025 for 01xx)
            const month = parseInt(label.substring(0, 2));
            const day = parseInt(label.substring(2, 4));
            const year = month >= 11 ? 2024 : 2025;
            const date = new Date(year, month - 1, day);
            const id = await upsertSnapshot({ snapshotDate: date, label });
            if (id) snapshotMap[label] = id;
          }

          // Get snapshot IDs
          for (const label of snapshotLabels) {
            if (!snapshotMap[label]) {
              const snapshot = await getSnapshotByLabel(label);
              if (snapshot) snapshotMap[label] = snapshot.id;
            }
          }

          // Parse categories and assets
          const categoryMap: Record<string, number> = {};
          let currentCategory = "";
          let categoryOrder = 0;
          let assetOrder = 0;

          // Define category mapping
          const categoryNames = ["股票/基金", "美股", "A+H股", "日股", "黄金", "虚拟货币", "现金"];

          for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
            const row = jsonData[rowIndex];
            if (!row || row.length === 0) continue;

            const col0 = row[0]?.toString()?.trim() || "";
            const col1 = row[1]?.toString()?.trim() || "";

            // Skip summary rows
            if (col0 === "总计" || col0.includes("对比") || col0.includes("标的里")) continue;
            if (!col0 && !col1) continue;

            // Check if this is a category row
            if (col0 && categoryNames.includes(col0)) {
              currentCategory = col0;
              if (!categoryMap[currentCategory]) {
                await upsertCategory({ name: currentCategory, sortOrder: categoryOrder++ });
                const cat = await getCategoryByName(currentCategory);
                if (cat) categoryMap[currentCategory] = cat.id;
              }
              assetOrder = 0;
              
              // If col1 is empty, this is just a category header, skip
              if (!col1) continue;
            }

            // Skip if no current category or no asset name
            if (!currentCategory || !col1) continue;
            if (col1 === "合计") continue;

            const categoryId = categoryMap[currentCategory];
            if (!categoryId) continue;

            // Determine currency from asset name
            let currency = "CNY";
            if (col1.includes("USD") || col1.includes("美股")) currency = "USD";
            if (col1.includes("HKD") || col1.includes("港股")) currency = "HKD";

            // Create asset
            const assetId = await upsertAsset({
              categoryId,
              name: col1,
              currency,
              sortOrder: assetOrder++,
            });

            // Get actual asset ID
            let actualAssetId = assetId;
            if (!actualAssetId) {
              const asset = await getAssetByNameAndCategory(col1, categoryId);
              if (asset) actualAssetId = asset.id;
            }
            if (!actualAssetId) continue;

            // Parse asset values for each snapshot
            for (const { label, valueIndex, changeIndex } of snapshotIndices) {
              const snapshotId = snapshotMap[label];
              if (!snapshotId) continue;

              const cnyValue = parseFloat(row[valueIndex]?.toString() || "0") || 0;
              const change = changeIndex >= 0 ? (parseFloat(row[changeIndex]?.toString() || "0") || 0) : 0;

              if (cnyValue !== 0) {
                await upsertAssetValue({
                  assetId: actualAssetId,
                  snapshotId,
                  cnyValue: cnyValue.toString(),
                  changeFromPrevious: change.toString(),
                });
              }
            }
          }

          // Parse portfolio summary (total row)
          for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
            const row = jsonData[rowIndex];
            if (!row) continue;
            const col0 = row[0]?.toString()?.trim() || "";
            
            if (col0 === "总计") {
              for (const { label, valueIndex } of snapshotIndices) {
                const snapshotId = snapshotMap[label];
                if (!snapshotId) continue;
                const totalValue = parseFloat(row[valueIndex]?.toString() || "0") || 0;
                if (totalValue > 0) {
                  await upsertPortfolioSummary({
                    snapshotId,
                    totalValue: totalValue.toString(),
                  });
                }
              }
            }
          }

          // Set default exchange rates
          await upsertExchangeRate({
            fromCurrency: "USD",
            toCurrency: "CNY",
            rate: "7.1",
            effectiveDate: new Date(),
          });
          await upsertExchangeRate({
            fromCurrency: "HKD",
            toCurrency: "CNY",
            rate: "0.91",
            effectiveDate: new Date(),
          });

          return { success: true, message: "数据导入成功" };
        } catch (error) {
          console.error("Import error:", error);
          return { success: false, message: `导入失败: ${error}` };
        }
      }),
  }),

  // Export Excel
  export: router({
    excel: publicProcedure.query(async () => {
      const categories = await getAllCategories();
      const assets = await getAllAssets();
      const snapshotsList = await getAllSnapshots();
      const values = await getAssetValues();
      const summaries = await getAllPortfolioSummaries();

      // Build export data
      const headers = ["资产大类", "标的"];
      for (const snapshot of snapshotsList) {
        headers.push(`${snapshot.label}人民币价值`);
        headers.push("期末减期初");
      }

      const rows: any[][] = [headers];

      // Group values by asset
      const valuesByAsset: Record<number, Record<number, { cnyValue: string; change: string }>> = {};
      for (const v of values) {
        if (!valuesByAsset[v.assetId]) valuesByAsset[v.assetId] = {};
        valuesByAsset[v.assetId][v.snapshotId] = {
          cnyValue: v.cnyValue?.toString() || "0",
          change: v.changeFromPrevious?.toString() || "0",
        };
      }

      // Build rows by category
      for (const category of categories) {
        const categoryAssets = assets.filter(a => a.categoryId === category.id);
        for (let i = 0; i < categoryAssets.length; i++) {
          const asset = categoryAssets[i];
          const row: any[] = [i === 0 ? category.name : "", asset.name];
          for (const snapshot of snapshotsList) {
            const val = valuesByAsset[asset.id]?.[snapshot.id];
            row.push(val?.cnyValue || "0");
            row.push(val?.change || "0");
          }
          rows.push(row);
        }
      }

      // Add summary row
      const summaryRow: any[] = ["总计", ""];
      for (const snapshot of snapshotsList) {
        const summary = summaries.find(s => s.snapshotId === snapshot.id);
        summaryRow.push(summary?.totalValue || "0");
        summaryRow.push("");
      }
      rows.push(summaryRow);

      // Create workbook
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "投资组合");

      // Generate base64
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      const base64 = Buffer.from(buffer).toString("base64");

      return { data: base64, filename: `portfolio_${new Date().toISOString().split("T")[0]}.xlsx` };
    }),
  }),

  // Dashboard data
  dashboard: router({
    overview: publicProcedure.query(async () => {
      const categories = await getAllCategories();
      const snapshotsList = await getAllSnapshots();
      const values = await getAssetValues();
      const summaries = await getAllPortfolioSummaries();

      // Get latest snapshot
      const latestSnapshot = snapshotsList[snapshotsList.length - 1];
      const latestSummary = summaries.find(s => s.snapshotId === latestSnapshot?.id);
      
      // Get first snapshot for ROI calculation
      const firstSnapshot = snapshotsList[0];
      const firstSummary = summaries.find(s => s.snapshotId === firstSnapshot?.id);

      // Calculate category totals for latest snapshot
      const categoryTotals: { name: string; value: number; roi?: number }[] = [];
      if (latestSnapshot) {
        for (const category of categories) {
          const categoryValues = values.filter(
            v => v.categoryId === category.id && v.snapshotId === latestSnapshot.id
          );
          const total = categoryValues.reduce((sum, v) => sum + parseFloat(v.cnyValue?.toString() || "0"), 0);
          
          // Calculate ROI for this category
          let roi = 0;
          if (firstSnapshot) {
            const firstCategoryValues = values.filter(
              v => v.categoryId === category.id && v.snapshotId === firstSnapshot.id
            );
            const firstTotal = firstCategoryValues.reduce((sum, v) => sum + parseFloat(v.cnyValue?.toString() || "0"), 0);
            if (firstTotal > 0) {
              roi = ((total - firstTotal) / firstTotal) * 100;
            }
          }
          
          if (total > 0) {
            categoryTotals.push({ 
              name: category.name, 
              value: total,
              roi: parseFloat(roi.toFixed(2))
            });
          }
        }
      }

      // Calculate trend data
      const trendData = summaries.map(s => ({
        label: s.snapshotLabel,
        date: s.snapshotDate,
        value: parseFloat(s.totalValue?.toString() || "0"),
        change: parseFloat(s.changeFromPrevious?.toString() || "0"),
      }));
      
      // Calculate overall ROI
      const firstTotalValue = parseFloat(firstSummary?.totalValue?.toString() || "0");
      const latestTotalValue = parseFloat(latestSummary?.totalValue?.toString() || "0");
      const overallRoi = firstTotalValue > 0 ? ((latestTotalValue - firstTotalValue) / firstTotalValue) * 100 : 0;

      return {
        totalValue: latestSummary?.totalValue || "0",
        latestSnapshot: latestSnapshot?.label || "",
        categoryTotals,
        trendData,
        snapshotCount: snapshotsList.length,
        assetCount: values.length,
        overallRoi: parseFloat(overallRoi.toFixed(2)),
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
