import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as XLSX from "xlsx";
import {
  getAllCategories, upsertCategory, getCategoryByName,
  getAllAssets, getAssetsByCategory, upsertAsset, getAssetByNameAndCategory, getAssetById, deleteAsset, updateAsset,
  getAllSnapshots, upsertSnapshot, getSnapshotByLabel,
  getAssetValues, upsertAssetValue,
  getAllCashFlows, addCashFlow, deleteCashFlow,
  getAllExchangeRates, getLatestExchangeRate, upsertExchangeRate,
  getAllPortfolioSummaries, upsertPortfolioSummary,
  clearAllData,
  // Insurance related functions
  getAllFamilyMembers, getFamilyMemberById, addFamilyMember, updateFamilyMember, deleteFamilyMember,
  getAllInsurancePolicies, getInsurancePolicyById, getInsurancePoliciesByMember, getInsurancePoliciesByType,
  addInsurancePolicy, updateInsurancePolicy, deleteInsurancePolicy
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
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getAssetById(input.id);
      }),
    create: publicProcedure
      .input(z.object({
        assetName: z.string(),
        categoryId: z.number().optional(),
        cnyValue: z.number().optional(),
        originalValue: z.number().optional(),
        originalCurrency: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const assetId = await upsertAsset({
          name: input.assetName,
          categoryId: input.categoryId || 1,
          currency: input.originalCurrency || 'CNY',
          sortOrder: 0,
        });
        
        // 为最新的 snapshot 创建 assetValue 记录
        if (assetId) {
          const snapshots = await getAllSnapshots();
          if (snapshots && snapshots.length > 0) {
            // 获取最新的 snapshot（通常是最后一个）
            const latestSnapshot = snapshots[snapshots.length - 1];
            const cnyValue = input.cnyValue || (input.originalValue || 0) * (input.originalCurrency === 'CNY' ? 1 : 1);
            
            await upsertAssetValue({
              assetId,
              snapshotId: latestSnapshot.id,
              originalValue: input.originalValue ? input.originalValue.toString() : undefined,
              cnyValue: cnyValue.toString(),
            });
          }
        }
        
        return { success: true, id: assetId };
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        assetName: z.string().optional(),
        categoryId: z.number().optional(),
        cnyValue: z.number().optional(),
        originalValue: z.number().optional(),
        originalCurrency: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, assetName, categoryId, originalCurrency } = input;
        await updateAsset(id, {
          name: assetName,
          categoryId: categoryId,
          currency: originalCurrency,
        });
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteAsset(input.id);
        return { success: true };
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

          // Try to read exchange rates from second sheet
          const exchangeRatesFromExcel: Record<string, number> = { CNY: 1, USD: 7.1, HKD: 0.91, JPY: 0.047 };
          if (workbook.SheetNames.length > 1) {
            const ratesSheet = workbook.Sheets[workbook.SheetNames[1]];
            const ratesData = XLSX.utils.sheet_to_json(ratesSheet, { header: 1 }) as any[][];
            for (let i = 1; i < ratesData.length; i++) {
              const row = ratesData[i];
              if (row && row[0] && row[2]) {
                const currency = row[0].toString().toUpperCase();
                const rate = parseFloat(row[2].toString()) || 1;
                exchangeRatesFromExcel[currency] = rate;
              }
            }
          }

          // Clear existing data
          await clearAllData();

          // Parse headers to get snapshot dates
             // Parse snapshot dates from headers
          const snapshotLabels: string[] = [];
          const snapshotIndices: { label: string; originalIndex: number; valueIndex: number; changeIndex: number }[] = [];
          
          console.log('=== DEBUG: Starting import ===');
          console.log('Headers:', headers);;

          // Find currency column index
          let currencyColIndex = -1;
          for (let i = 0; i < headers.length; i++) {
            const header = headers[i]?.toString() || "";
            if (header === "币种" || header.toLowerCase() === "currency") {
              currencyColIndex = i;
              break;
            }
          }

          // Find snapshot columns - support multiple formats:
          // 1. New format: MMDD原始金额 + MMDD人民币价值
          // 2. Old format: MMDD人民币价值 only
          // 3. Simple format: MMDD原始金额 only (for new data entry)
          for (let i = 0; i < headers.length; i++) {
            const header = headers[i]?.toString() || "";
            // New format: MMDD原始金额
            const matchOriginal = header.match(/^(\d{4})原始金额$/);
            if (matchOriginal) {
              const label = matchOriginal[1];
              if (!snapshotLabels.includes(label)) {
                snapshotLabels.push(label);
                // Find corresponding CNY value and change columns
                let valueIndex = -1;
                let changeIndex = -1;
                for (let j = i + 1; j < headers.length; j++) {
                  const nextHeader = headers[j]?.toString() || "";
                  if (nextHeader === `${label}人民币价值`) {
                    valueIndex = j;
                  }
                  if (nextHeader.includes("期末减期初")) {
                    changeIndex = j;
                    break;
                  }
                  if (nextHeader.match(/^\d{4}原始金额$/)) break;
                }
                // If no CNY value column found, use original column as value column
                // (system will auto-convert based on currency)
                if (valueIndex === -1) {
                  valueIndex = i; // Use original amount column
                }
                snapshotIndices.push({ label, originalIndex: i, valueIndex, changeIndex });
              }
              continue;
            }
            // Old format: MMDD人民币价值 (without original amount column)
            const matchCny = header.match(/^(\d{4})人民币价值$/);
            if (matchCny && !snapshotLabels.includes(matchCny[1])) {
              const label = matchCny[1];
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
              snapshotIndices.push({ label, originalIndex: -1, valueIndex: i, changeIndex });
            }
          }

          // Create snapshots
          console.log('=== DEBUG: Snapshot Labels ===');
          console.log('snapshotLabels:', snapshotLabels);
          console.log('snapshotIndices:', snapshotIndices);
          
          const snapshotMap: Record<string, number> = {};
          for (const label of snapshotLabels) {
            // Convert label to date - smart year detection
            const month = parseInt(label.substring(0, 2));
            const day = parseInt(label.substring(2, 4));
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;
            // If label month is Nov/Dec and current month is Jan-Mar, use previous year
            // If label month is Jan and current month is Nov/Dec, use next year
            let year = currentYear;
            if (month >= 11 && currentMonth <= 3) {
              year = currentYear - 1;
            } else if (month <= 3 && currentMonth >= 11) {
              year = currentYear + 1;
            }
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

            // Determine currency - first check currency column, then from asset name
            let currency = "CNY";
            if (currencyColIndex >= 0 && row[currencyColIndex]) {
              const currencyFromCol = row[currencyColIndex].toString().toUpperCase().trim();
              if (['CNY', 'USD', 'HKD', 'JPY', 'EUR', 'GBP'].includes(currencyFromCol)) {
                currency = currencyFromCol;
              }
            } else {
              // Fallback: determine from asset name
              if (col1.includes("USD") || col1.includes("美股")) currency = "USD";
              if (col1.includes("HKD") || col1.includes("港股")) currency = "HKD";
              if (col1.includes("JPY") || col1.includes("日股") || col1.includes("日元")) currency = "JPY";
            }

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

            // Get exchange rate for this currency
            const exchangeRate = exchangeRatesFromExcel[currency] || 1;

            // Parse asset values for each snapshot
            for (const { label, originalIndex, valueIndex, changeIndex } of snapshotIndices) {
              const snapshotId = snapshotMap[label];
              if (!snapshotId) continue;

              let originalValue = 0;
              let cnyValue = 0;

              // New format: read original amount and convert to CNY
              if (originalIndex >= 0) {
                originalValue = parseFloat(row[originalIndex]?.toString() || "0") || 0;
                // If CNY value column exists and is different from original column, use it
                if (valueIndex >= 0 && valueIndex !== originalIndex) {
                  cnyValue = parseFloat(row[valueIndex]?.toString() || "0") || 0;
                }
                // If CNY value is 0 but original value exists, calculate CNY value based on currency
                if (cnyValue === 0 && originalValue !== 0) {
                  cnyValue = originalValue * exchangeRate;
                }
                // If currency is CNY, original and CNY values should be the same
                if (currency === 'CNY' && originalValue !== 0) {
                  cnyValue = originalValue;
                }
              } else {
                // Old format: only CNY value column
                cnyValue = parseFloat(row[valueIndex]?.toString() || "0") || 0;
                originalValue = currency === 'CNY' ? cnyValue : (exchangeRate > 0 ? cnyValue / exchangeRate : cnyValue);
              }

              const change = changeIndex >= 0 ? (parseFloat(row[changeIndex]?.toString() || "0") || 0) : 0;

              if (cnyValue !== 0 || originalValue !== 0) {
                await upsertAssetValue({
                  assetId: actualAssetId,
                  snapshotId,
                  originalValue: originalValue.toString(),
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
      const exchangeRates = await getAllExchangeRates();

      // Get latest exchange rates
      const getRate = (currency: string): number => {
        if (currency === 'CNY') return 1;
        const rate = exchangeRates.find(r => r.fromCurrency === currency && r.toCurrency === 'CNY');
        return rate ? parseFloat(rate.rate) : (currency === 'USD' ? 7.1 : currency === 'HKD' ? 0.91 : 1);
      };

      // Build export data with currency support
      // 新格式：资产大类 | 标的 | 币种 | 最新快照的原始金额 | 最新快照的人民币价值 | 期末减期初 | ...
      const headers = ["资产大类", "标的", "币种"];
      for (const snapshot of snapshotsList) {
        headers.push(`${snapshot.label}原始金额`);
        headers.push(`${snapshot.label}人民币价值`);
        headers.push("期末减期初");
      }

      const rows: any[][] = [headers];

      // Group values by asset
      const valuesByAsset: Record<number, Record<number, { originalValue: string; cnyValue: string; change: string }>> = {};
      for (const v of values) {
        if (!valuesByAsset[v.assetId]) valuesByAsset[v.assetId] = {};
        valuesByAsset[v.assetId][v.snapshotId] = {
          originalValue: v.originalValue?.toString() || v.cnyValue?.toString() || "0",
          cnyValue: v.cnyValue?.toString() || "0",
          change: v.changeFromPrevious?.toString() || "0",
        };
      }

      // Build rows by category
      for (const category of categories) {
        const categoryAssets = assets.filter(a => a.categoryId === category.id);
        for (let i = 0; i < categoryAssets.length; i++) {
          const asset = categoryAssets[i];
          const currency = asset.currency || 'CNY';
          const row: any[] = [i === 0 ? category.name : "", asset.name, currency];
          for (const snapshot of snapshotsList) {
            const val = valuesByAsset[asset.id]?.[snapshot.id];
            // 如果有原始金额，显示原始金额；否则根据币种反算
            const cnyValue = parseFloat(val?.cnyValue || "0");
            const rate = getRate(currency);
            const originalValue = val?.originalValue ? parseFloat(val.originalValue) : (rate > 0 ? cnyValue / rate : cnyValue);
            row.push(originalValue.toFixed(2));
            row.push(val?.cnyValue || "0");
            row.push(val?.change || "0");
          }
          rows.push(row);
        }
      }

      // Add summary row
      const summaryRow: any[] = ["总计", "", "CNY"];
      for (const snapshot of snapshotsList) {
        const summary = summaries.find(s => s.snapshotId === snapshot.id);
        summaryRow.push(summary?.totalValue || "0");
        summaryRow.push(summary?.totalValue || "0");
        summaryRow.push("");
      }
      rows.push(summaryRow);

      // Add exchange rates sheet
      const ratesHeaders = ["货币代码", "货币名称", "兑人民币汇率", "说明"];
      const ratesRows: any[][] = [
        ratesHeaders,
        ["CNY", "人民币", "1", "基准货币"],
        ["USD", "美元", getRate('USD').toString(), "输入美元金额时使用此汇率换算"],
        ["HKD", "港币", getRate('HKD').toString(), "输入港币金额时使用此汇率换算"],
        ["JPY", "日元", (getRate('JPY') || 0.047).toString(), "输入日元金额时使用此汇率换算"],
      ];

      // Add instructions sheet for new data entry
      const instructionsRows: any[][] = [
        ["📋 操作指南"],
        [""],
        ["【如何添加新日期的数据】"],
        ["1. 在'投资组合'表的最后一列后面添加新列"],
        ["2. 列标题格式：MMDD原始金额（如：0114原始金额）"],
        ["3. 在对应资产行填入该币种的原始金额"],
        ["4. 系统会根据币种自动换算为人民币"],
        [""],
        ["【如何新增资产】"],
        ["1. 在对应类别下方插入新行"],
        ["2. 第一列：资产大类（如果是该类别第一个资产则填写类别名，否则留空）"],
        ["3. 第二列：资产名称（标的）"],
        ["4. 第三列：币种（CNY/USD/HKD/JPY）"],
        ["5. 后续列：填入各日期的原始金额"],
        [""],
        ["【如何减持/清仓资产】"],
        ["1. 找到对应资产行"],
        ["2. 在最新日期列填入0或减持后的金额"],
        ["3. 不要删除整行，保留历史数据"],
        [""],
        ["【币种说明】"],
        ["CNY - 人民币：直接填入人民币金额"],
        ["USD - 美元：填入美元金额，系统自动按汇率换算"],
        ["HKD - 港币：填入港币金额，系统自动按汇率换算"],
        ["JPY - 日元：填入日元金额，系统自动按汇率换算"],
        [""],
        ["【注意事项】"],
        ["- 金额只需填写数字，不要带货币符号"],
        ["- 美股资产（如谷歌、QQQ）币种应设为USD"],
        ["- 港股资产币种应设为HKD"],
        ["- 日股基金（如日经225）币种应设为USD或JPY"],
        ["- 导入后可在网站上查看换算后的人民币价值"],
      ];

      // Create workbook with multiple sheets
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const ratesWs = XLSX.utils.aoa_to_sheet(ratesRows);
      const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "投资组合");
      XLSX.utils.book_append_sheet(wb, ratesWs, "汇率参考");
      XLSX.utils.book_append_sheet(wb, instructionsWs, "操作指南");

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

  // ==================== 家庭保险相关API ====================
  
  // Family Members
  familyMembers: router({
    list: publicProcedure.query(async () => {
      return getAllFamilyMembers();
    }),
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getFamilyMemberById(input.id);
      }),
    add: publicProcedure
      .input(z.object({
        name: z.string(),
        role: z.string(),
        relationship: z.string().optional(),
        birthDate: z.string().optional(),
        age: z.number().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await addFamilyMember({
          name: input.name,
          role: input.role,
          relationship: input.relationship,
          birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
          age: input.age,
          sortOrder: input.sortOrder || 0,
        });
        return { success: true, id };
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        role: z.string().optional(),
        relationship: z.string().optional(),
        birthDate: z.string().optional(),
        age: z.number().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateFamilyMember(input.id, {
          name: input.name,
          role: input.role,
          relationship: input.relationship,
          birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
          age: input.age,
          sortOrder: input.sortOrder,
        });
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteFamilyMember(input.id);
        return { success: true };
      }),
  }),

  // Insurance Policies
  insurance: router({
    list: publicProcedure.query(async () => {
      const policies = await getAllInsurancePolicies();
      // Convert Date objects to ISO strings for frontend compatibility
      return policies.map(policy => ({
        ...policy,
        effectiveDate: policy.effectiveDate instanceof Date ? policy.effectiveDate.toISOString().split('T')[0] : policy.effectiveDate,
        expiryDate: policy.expiryDate instanceof Date ? policy.expiryDate.toISOString().split('T')[0] : policy.expiryDate,
      }));
    }),
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const policy = await getInsurancePolicyById(input.id);
        if (!policy) return null;
        return {
          ...policy,
          effectiveDate: policy.effectiveDate instanceof Date ? policy.effectiveDate.toISOString().split('T')[0] : policy.effectiveDate,
          expiryDate: policy.expiryDate instanceof Date ? policy.expiryDate.toISOString().split('T')[0] : policy.expiryDate,
        };
      }),
    byMember: publicProcedure
      .input(z.object({ memberId: z.number() }))
      .query(async ({ input }) => {
        const policies = await getInsurancePoliciesByMember(input.memberId);
        return policies.map(policy => ({
          ...policy,
          effectiveDate: policy.effectiveDate instanceof Date ? policy.effectiveDate.toISOString().split('T')[0] : policy.effectiveDate,
          expiryDate: policy.expiryDate instanceof Date ? policy.expiryDate.toISOString().split('T')[0] : policy.expiryDate,
        }));
      }),
    byType: publicProcedure
      .input(z.object({ insuranceType: z.string() }))
      .query(async ({ input }) => {
        const policies = await getInsurancePoliciesByType(input.insuranceType);
        return policies.map(policy => ({
          ...policy,
          effectiveDate: policy.effectiveDate instanceof Date ? policy.effectiveDate.toISOString().split('T')[0] : policy.effectiveDate,
          expiryDate: policy.expiryDate instanceof Date ? policy.expiryDate.toISOString().split('T')[0] : policy.expiryDate,
        }));
      }),
    add: publicProcedure
      .input(z.object({
        name: z.string(),
        company: z.string(),
        insuranceType: z.string(),
        insuredMemberId: z.number(),
        policyholderMemberId: z.number().optional(),
        coverageAmount: z.string().optional(),
        coverageAmountText: z.string().optional(),
        annualPremium: z.string().optional(),
        currency: z.string().default("CNY"),
        effectiveDate: z.string().optional(),
        expiryDate: z.string().optional(),
        coveragePeriod: z.string().optional(),
        paymentMethod: z.string().optional(),
        coverageDetails: z.string().optional(),
        claimConditions: z.string().optional(),
        status: z.string().default("active"),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          console.log('[Insurance] Adding policy, input:', JSON.stringify(input));
          const id = await addInsurancePolicy({
            name: input.name,
            company: input.company,
            insuranceType: input.insuranceType,
            insuredMemberId: input.insuredMemberId,
            policyholderMemberId: input.policyholderMemberId,
            coverageAmount: input.coverageAmount,
            coverageAmountText: input.coverageAmountText,
            annualPremium: input.annualPremium,
            currency: input.currency,
            effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : undefined,
            expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
            coveragePeriod: input.coveragePeriod,
            paymentMethod: input.paymentMethod,
            coverageDetails: input.coverageDetails,
            claimConditions: input.claimConditions,
            status: input.status,
            notes: input.notes,
          });
          console.log('[Insurance] Policy added successfully, id:', id);
          return { success: true, id };
        } catch (error) {
          console.error('[Insurance] Error adding policy:', error);
          throw error;
        }
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        company: z.string().optional(),
        insuranceType: z.string().optional(),
        insuredMemberId: z.number().optional(),
        policyholderMemberId: z.number().optional(),
        coverageAmount: z.string().optional(),
        coverageAmountText: z.string().optional(),
        annualPremium: z.string().optional(),
        currency: z.string().optional(),
        effectiveDate: z.string().optional(),
        expiryDate: z.string().optional(),
        coveragePeriod: z.string().optional(),
        paymentMethod: z.string().optional(),
        coverageDetails: z.string().optional(),
        claimConditions: z.string().optional(),
        status: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateInsurancePolicy(input.id, {
          name: input.name,
          company: input.company,
          insuranceType: input.insuranceType,
          insuredMemberId: input.insuredMemberId,
          policyholderMemberId: input.policyholderMemberId,
          coverageAmount: input.coverageAmount,
          coverageAmountText: input.coverageAmountText,
          annualPremium: input.annualPremium,
          currency: input.currency,
          effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : undefined,
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
          coveragePeriod: input.coveragePeriod,
          paymentMethod: input.paymentMethod,
          coverageDetails: input.coverageDetails,
          claimConditions: input.claimConditions,
          status: input.status,
          notes: input.notes,
        });
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteInsurancePolicy(input.id);
        return { success: true };
      }),
    
    // Export insurance data to Excel
    exportExcel: publicProcedure.query(async () => {
      const members = await getAllFamilyMembers();
      const policies = await getAllInsurancePolicies();

      // Create member map
      const memberMap: Record<number, string> = {};
      for (const m of members) {
        memberMap[m.id] = m.name;
      }

      // Build export data
      const headers = [
        "保险名称", "保险公司", "险种类型", "被保人", "投保人",
        "保额", "保额说明", "年缴保费", "币种", "生效日期", "到期日期",
        "保障期限", "缴费方式", "保障内容", "赔付条件", "状态", "备注"
      ];

      const rows: any[][] = [headers];

      for (const policy of policies) {
        rows.push([
          policy.name,
          policy.company,
          policy.insuranceType,
          memberMap[policy.insuredMemberId] || "",
          policy.policyholderMemberId ? memberMap[policy.policyholderMemberId] : "",
          policy.coverageAmount || "",
          policy.coverageAmountText || "",
          policy.annualPremium || "",
          policy.currency,
          policy.effectiveDate || "",
          policy.expiryDate || "",
          policy.coveragePeriod || "",
          policy.paymentMethod || "",
          policy.coverageDetails || "",
          policy.claimConditions || "",
          policy.status,
          policy.notes || "",
        ]);
      }

      // Create workbook
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "家庭保险");

      // Add family members sheet
      const memberHeaders = ["姓名", "家庭角色", "与户主关系", "出生日期", "年龄"];
      const memberRows: any[][] = [memberHeaders];
      for (const m of members) {
        memberRows.push([m.name, m.role, m.relationship || "", m.birthDate || "", m.age || ""]);
      }
      const memberWs = XLSX.utils.aoa_to_sheet(memberRows);
      XLSX.utils.book_append_sheet(wb, memberWs, "家庭成员");

      // Generate base64
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      const base64 = Buffer.from(buffer).toString("base64");

      return { data: base64, filename: `insurance_${new Date().toISOString().split("T")[0]}.xlsx` };
    }),

    // Import insurance data from Excel
    importExcel: publicProcedure
      .input(z.object({ data: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const buffer = Buffer.from(input.data, "base64");
          const workbook = XLSX.read(buffer, { type: "buffer" });

          // Import family members first
          const memberSheet = workbook.Sheets["家庭成员"];
          if (memberSheet) {
            const memberData = XLSX.utils.sheet_to_json(memberSheet, { header: 1 }) as any[][];
            for (let i = 1; i < memberData.length; i++) {
              const row = memberData[i];
              if (!row || !row[0]) continue;
              await addFamilyMember({
                name: row[0]?.toString() || "",
                role: row[1]?.toString() || "",
                relationship: row[2]?.toString() || undefined,
                birthDate: row[3] ? new Date(row[3]) : undefined,
                age: row[4] ? parseInt(row[4]) : undefined,
                sortOrder: i,
              });
            }
          }

          // Get updated member list
          const members = await getAllFamilyMembers();
          const memberNameMap: Record<string, number> = {};
          for (const m of members) {
            memberNameMap[m.name] = m.id;
          }

          // Import insurance policies
          const insuranceSheet = workbook.Sheets["家庭保险"];
          if (insuranceSheet) {
            const insuranceData = XLSX.utils.sheet_to_json(insuranceSheet, { header: 1 }) as any[][];
            for (let i = 1; i < insuranceData.length; i++) {
              const row = insuranceData[i];
              if (!row || !row[0]) continue;

              const insuredName = row[3]?.toString() || "";
              const policyholderName = row[4]?.toString() || "";
              const insuredMemberId = memberNameMap[insuredName];
              const policyholderMemberId = policyholderName ? memberNameMap[policyholderName] : undefined;

              if (!insuredMemberId) continue;

              await addInsurancePolicy({
                name: row[0]?.toString() || "",
                company: row[1]?.toString() || "",
                insuranceType: row[2]?.toString() || "",
                insuredMemberId,
                policyholderMemberId,
                coverageAmount: row[5]?.toString() || undefined,
                coverageAmountText: row[6]?.toString() || undefined,
                annualPremium: row[7]?.toString() || undefined,
                currency: row[8]?.toString() || "CNY",
                effectiveDate: row[9] ? new Date(row[9]) : undefined,
                expiryDate: row[10] ? new Date(row[10]) : undefined,
                coveragePeriod: row[11]?.toString() || undefined,
                paymentMethod: row[12]?.toString() || undefined,
                coverageDetails: row[13]?.toString() || undefined,
                claimConditions: row[14]?.toString() || undefined,
                status: row[15]?.toString() || "active",
                notes: row[16]?.toString() || undefined,
              });
            }
          }

          return { success: true, message: "保险数据导入成功" };
        } catch (error) {
          console.error("Import insurance error:", error);
          return { success: false, message: `导入失败: ${error}` };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
