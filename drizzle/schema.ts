import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Asset categories - 资产大类
 */
export const assetCategories = mysqlTable("asset_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(), // 美股, A+H股, 日股, 黄金, 虚拟货币, 现金
  suggestedRatio: decimal("suggestedRatio", { precision: 5, scale: 4 }), // 建议配置比例
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssetCategory = typeof assetCategories.$inferSelect;
export type InsertAssetCategory = typeof assetCategories.$inferInsert;

/**
 * Assets - 具体标的
 */
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  name: varchar("name", { length: 128 }).notNull(), // 谷歌, QQQ, 贵州茅台等
  currency: varchar("currency", { length: 8 }).default("CNY").notNull(), // CNY, USD, HKD
  suggestedRatio: decimal("suggestedRatio", { precision: 5, scale: 4 }), // 建议配置比例
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

/**
 * Snapshots - 时间点快照
 */
export const snapshots = mysqlTable("snapshots", {
  id: int("id").autoincrement().primaryKey(),
  snapshotDate: date("snapshotDate").notNull(), // 快照日期
  label: varchar("label", { length: 16 }).notNull(), // 1119, 1122, 1127, 1207, 1216, 0107
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Snapshot = typeof snapshots.$inferSelect;
export type InsertSnapshot = typeof snapshots.$inferInsert;

/**
 * Asset Values - 资产价值记录
 */
export const assetValues = mysqlTable("asset_values", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  snapshotId: int("snapshotId").notNull(),
  originalValue: decimal("originalValue", { precision: 18, scale: 2 }), // 原始货币价值
  cnyValue: decimal("cnyValue", { precision: 18, scale: 2 }).notNull(), // 人民币价值
  changeFromPrevious: decimal("changeFromPrevious", { precision: 18, scale: 2 }), // 期末减期初
  currentRatio: decimal("currentRatio", { precision: 8, scale: 6 }), // 当前占比
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssetValue = typeof assetValues.$inferSelect;
export type InsertAssetValue = typeof assetValues.$inferInsert;

/**
 * Cash Flows - 现金流记录
 */
export const cashFlows = mysqlTable("cash_flows", {
  id: int("id").autoincrement().primaryKey(),
  flowDate: date("flowDate").notNull(), // 交易日期
  flowType: mysqlEnum("flowType", ["inflow", "outflow"]).notNull(), // 流入/流出
  sourceAccount: varchar("sourceAccount", { length: 64 }), // 来源账户
  targetAccount: varchar("targetAccount", { length: 64 }), // 目标账户
  assetName: varchar("assetName", { length: 128 }), // 资产名称（如USDT）
  originalAmount: decimal("originalAmount", { precision: 18, scale: 2 }).notNull(), // 原始金额
  currency: varchar("currency", { length: 8 }).default("CNY").notNull(), // 货币类型
  cnyAmount: decimal("cnyAmount", { precision: 18, scale: 2 }).notNull(), // 人民币金额
  description: text("description"), // 描述
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CashFlow = typeof cashFlows.$inferSelect;
export type InsertCashFlow = typeof cashFlows.$inferInsert;

/**
 * Exchange Rates - 汇率表
 */
export const exchangeRates = mysqlTable("exchange_rates", {
  id: int("id").autoincrement().primaryKey(),
  fromCurrency: varchar("fromCurrency", { length: 8 }).notNull(), // USD, HKD
  toCurrency: varchar("toCurrency", { length: 8 }).default("CNY").notNull(),
  rate: decimal("rate", { precision: 10, scale: 4 }).notNull(), // 汇率
  effectiveDate: date("effectiveDate").notNull(), // 生效日期
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = typeof exchangeRates.$inferInsert;

/**
 * Portfolio Summary - 投资组合汇总
 */
export const portfolioSummary = mysqlTable("portfolio_summary", {
  id: int("id").autoincrement().primaryKey(),
  snapshotId: int("snapshotId").notNull(),
  totalValue: decimal("totalValue", { precision: 18, scale: 2 }).notNull(), // 总资产
  changeFromPrevious: decimal("changeFromPrevious", { precision: 18, scale: 2 }), // 对比上次盈亏
  changeFromTwoPrevious: decimal("changeFromTwoPrevious", { precision: 18, scale: 2 }), // 对比上上次盈亏
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PortfolioSummary = typeof portfolioSummary.$inferSelect;
export type InsertPortfolioSummary = typeof portfolioSummary.$inferInsert;
