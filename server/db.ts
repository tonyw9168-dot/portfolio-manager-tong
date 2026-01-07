import { eq, and, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  assetCategories, InsertAssetCategory,
  assets, InsertAsset,
  snapshots, InsertSnapshot,
  assetValues, InsertAssetValue,
  cashFlows, InsertCashFlow,
  exchangeRates, InsertExchangeRate,
  portfolioSummary, InsertPortfolioSummary
} from "../drizzle/schema";
import { ENV } from './_core/env';
import * as fs from 'fs';
import * as path from 'path';

// ============ Local Storage Implementation ============
const DATA_FILE = path.join(process.cwd(), 'data.json');

interface LocalData {
  categories: Array<{ id: number; name: string; suggestedRatio?: string; sortOrder: number }>;
  assets: Array<{ id: number; categoryId: number; name: string; currency: string; suggestedRatio?: string; sortOrder: number }>;
  snapshots: Array<{ id: number; snapshotDate: Date; label: string }>;
  assetValues: Array<{ id: number; assetId: number; snapshotId: number; originalValue?: string; cnyValue: string; changeFromPrevious?: string; currentRatio?: string }>;
  cashFlows: Array<{ id: number; flowDate: Date; flowType: string; amount: string; currency: string; description?: string }>;
  exchangeRates: Array<{ id: number; fromCurrency: string; toCurrency: string; rate: string; effectiveDate: Date }>;
  portfolioSummary: Array<{ id: number; snapshotId: number; totalValue: string; changeFromPrevious?: string; changeFromTwoPrevious?: string }>;
  nextIds: { categories: number; assets: number; snapshots: number; assetValues: number; cashFlows: number; exchangeRates: number; portfolioSummary: number };
}

let localData: LocalData = {
  categories: [],
  assets: [],
  snapshots: [],
  assetValues: [],
  cashFlows: [],
  exchangeRates: [],
  portfolioSummary: [],
  nextIds: { categories: 1, assets: 1, snapshots: 1, assetValues: 1, cashFlows: 1, exchangeRates: 1, portfolioSummary: 1 }
};

function loadLocalData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      localData = JSON.parse(content);
      // Convert date strings back to Date objects
      localData.snapshots = localData.snapshots.map(s => ({ ...s, snapshotDate: new Date(s.snapshotDate) }));
      localData.cashFlows = localData.cashFlows.map(c => ({ ...c, flowDate: new Date(c.flowDate) }));
      localData.exchangeRates = localData.exchangeRates.map(e => ({ ...e, effectiveDate: new Date(e.effectiveDate) }));
    }
  } catch (error) {
    console.warn("[LocalStorage] Failed to load data:", error);
  }
}

function saveLocalData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(localData, null, 2));
  } catch (error) {
    console.warn("[LocalStorage] Failed to save data:", error);
  }
}

// Initialize local data on module load
loadLocalData();

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User Functions ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ Asset Category Functions ============
export async function getAllCategories() {
  const db = await getDb();
  if (db) {
    return db.select().from(assetCategories).orderBy(asc(assetCategories.sortOrder));
  }
  // Use local storage
  return [...localData.categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function upsertCategory(category: InsertAssetCategory) {
  const db = await getDb();
  if (db) {
    await db.insert(assetCategories).values(category).onDuplicateKeyUpdate({
      set: { suggestedRatio: category.suggestedRatio, sortOrder: category.sortOrder }
    });
    return;
  }
  // Use local storage
  const existing = localData.categories.find(c => c.name === category.name);
  if (existing) {
    existing.suggestedRatio = category.suggestedRatio;
    existing.sortOrder = category.sortOrder ?? existing.sortOrder;
  } else {
    localData.categories.push({
      id: localData.nextIds.categories++,
      name: category.name,
      suggestedRatio: category.suggestedRatio,
      sortOrder: category.sortOrder ?? 0
    });
  }
  saveLocalData();
}

export async function getCategoryByName(name: string) {
  const db = await getDb();
  if (db) {
    const result = await db.select().from(assetCategories).where(eq(assetCategories.name, name)).limit(1);
    return result[0];
  }
  // Use local storage
  return localData.categories.find(c => c.name === name);
}

// ============ Asset Functions ============
export async function getAllAssets() {
  const db = await getDb();
  if (db) {
    return db.select().from(assets).orderBy(asc(assets.categoryId), asc(assets.sortOrder));
  }
  // Use local storage
  return [...localData.assets].sort((a, b) => {
    if (a.categoryId !== b.categoryId) return a.categoryId - b.categoryId;
    return a.sortOrder - b.sortOrder;
  });
}

export async function getAssetsByCategory(categoryId: number) {
  const db = await getDb();
  if (db) {
    return db.select().from(assets).where(eq(assets.categoryId, categoryId)).orderBy(asc(assets.sortOrder));
  }
  // Use local storage
  return localData.assets.filter(a => a.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function upsertAsset(asset: InsertAsset) {
  const db = await getDb();
  if (db) {
    // Check if asset exists
    const existing = await db.select().from(assets)
      .where(and(eq(assets.categoryId, asset.categoryId), eq(assets.name, asset.name)))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(assets)
        .set({ currency: asset.currency, suggestedRatio: asset.suggestedRatio, sortOrder: asset.sortOrder })
        .where(eq(assets.id, existing[0].id));
      return existing[0].id;
    } else {
      const result = await db.insert(assets).values(asset);
      return result[0].insertId;
    }
  }
  // Use local storage
  const existing = localData.assets.find(a => a.categoryId === asset.categoryId && a.name === asset.name);
  if (existing) {
    existing.currency = asset.currency;
    existing.suggestedRatio = asset.suggestedRatio;
    existing.sortOrder = asset.sortOrder ?? existing.sortOrder;
    saveLocalData();
    return existing.id;
  } else {
    const newId = localData.nextIds.assets++;
    localData.assets.push({
      id: newId,
      categoryId: asset.categoryId,
      name: asset.name,
      currency: asset.currency,
      suggestedRatio: asset.suggestedRatio,
      sortOrder: asset.sortOrder ?? 0
    });
    saveLocalData();
    return newId;
  }
}

export async function getAssetByNameAndCategory(name: string, categoryId: number) {
  const db = await getDb();
  if (db) {
    const result = await db.select().from(assets)
      .where(and(eq(assets.name, name), eq(assets.categoryId, categoryId)))
      .limit(1);
    return result[0];
  }
  // Use local storage
  return localData.assets.find(a => a.name === name && a.categoryId === categoryId);
}

// ============ Snapshot Functions ============
export async function getAllSnapshots() {
  const db = await getDb();
  if (db) {
    return db.select().from(snapshots).orderBy(asc(snapshots.snapshotDate));
  }
  // Use local storage
  return [...localData.snapshots].sort((a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime());
}

export async function upsertSnapshot(snapshot: InsertSnapshot) {
  const db = await getDb();
  if (db) {
    const existing = await db.select().from(snapshots)
      .where(eq(snapshots.label, snapshot.label))
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0].id;
    } else {
      const result = await db.insert(snapshots).values(snapshot);
      return result[0].insertId;
    }
  }
  // Use local storage
  const existing = localData.snapshots.find(s => s.label === snapshot.label);
  if (existing) {
    return existing.id;
  } else {
    const newId = localData.nextIds.snapshots++;
    localData.snapshots.push({
      id: newId,
      snapshotDate: snapshot.snapshotDate,
      label: snapshot.label
    });
    saveLocalData();
    return newId;
  }
}

export async function getSnapshotByLabel(label: string) {
  const db = await getDb();
  if (db) {
    const result = await db.select().from(snapshots).where(eq(snapshots.label, label)).limit(1);
    return result[0];
  }
  // Use local storage
  return localData.snapshots.find(s => s.label === label);
}

// ============ Asset Value Functions ============
export async function getAssetValues(filters?: { categoryId?: number; snapshotId?: number }) {
  const db = await getDb();
  if (db) {
    const query = db.select({
      id: assetValues.id,
      assetId: assetValues.assetId,
      snapshotId: assetValues.snapshotId,
      originalValue: assetValues.originalValue,
      cnyValue: assetValues.cnyValue,
      changeFromPrevious: assetValues.changeFromPrevious,
      currentRatio: assetValues.currentRatio,
      assetName: assets.name,
      assetCurrency: assets.currency,
      categoryId: assets.categoryId,
      categoryName: assetCategories.name,
      snapshotLabel: snapshots.label,
      snapshotDate: snapshots.snapshotDate,
    })
    .from(assetValues)
    .innerJoin(assets, eq(assetValues.assetId, assets.id))
    .innerJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
    .innerJoin(snapshots, eq(assetValues.snapshotId, snapshots.id));
    
    if (filters?.categoryId && filters?.snapshotId) {
      return query.where(and(
        eq(assets.categoryId, filters.categoryId),
        eq(assetValues.snapshotId, filters.snapshotId)
      ));
    } else if (filters?.categoryId) {
      return query.where(eq(assets.categoryId, filters.categoryId));
    } else if (filters?.snapshotId) {
      return query.where(eq(assetValues.snapshotId, filters.snapshotId));
    }
    
    return query;
  }
  // Use local storage
  let result = localData.assetValues.map(av => {
    const asset = localData.assets.find(a => a.id === av.assetId);
    const category = asset ? localData.categories.find(c => c.id === asset.categoryId) : undefined;
    const snapshot = localData.snapshots.find(s => s.id === av.snapshotId);
    return {
      id: av.id,
      assetId: av.assetId,
      snapshotId: av.snapshotId,
      originalValue: av.originalValue,
      cnyValue: av.cnyValue,
      changeFromPrevious: av.changeFromPrevious,
      currentRatio: av.currentRatio,
      assetName: asset?.name || '',
      assetCurrency: asset?.currency || 'CNY',
      categoryId: asset?.categoryId || 0,
      categoryName: category?.name || '',
      snapshotLabel: snapshot?.label || '',
      snapshotDate: snapshot?.snapshotDate || new Date(),
    };
  });

  if (filters?.categoryId && filters?.snapshotId) {
    result = result.filter(r => r.categoryId === filters.categoryId && r.snapshotId === filters.snapshotId);
  } else if (filters?.categoryId) {
    result = result.filter(r => r.categoryId === filters.categoryId);
  } else if (filters?.snapshotId) {
    result = result.filter(r => r.snapshotId === filters.snapshotId);
  }

  return result;
}

export async function upsertAssetValue(value: InsertAssetValue) {
  const db = await getDb();
  if (db) {
    const existing = await db.select().from(assetValues)
      .where(and(eq(assetValues.assetId, value.assetId), eq(assetValues.snapshotId, value.snapshotId)))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(assetValues)
        .set({ 
          originalValue: value.originalValue, 
          cnyValue: value.cnyValue, 
          changeFromPrevious: value.changeFromPrevious,
          currentRatio: value.currentRatio
        })
        .where(eq(assetValues.id, existing[0].id));
    } else {
      await db.insert(assetValues).values(value);
    }
    return;
  }
  // Use local storage
  const existing = localData.assetValues.find(av => av.assetId === value.assetId && av.snapshotId === value.snapshotId);
  if (existing) {
    existing.originalValue = value.originalValue;
    existing.cnyValue = value.cnyValue;
    existing.changeFromPrevious = value.changeFromPrevious;
    existing.currentRatio = value.currentRatio;
  } else {
    localData.assetValues.push({
      id: localData.nextIds.assetValues++,
      assetId: value.assetId,
      snapshotId: value.snapshotId,
      originalValue: value.originalValue,
      cnyValue: value.cnyValue,
      changeFromPrevious: value.changeFromPrevious,
      currentRatio: value.currentRatio
    });
  }
  saveLocalData();
}

// ============ Cash Flow Functions ============
export async function getAllCashFlows() {
  const db = await getDb();
  if (db) {
    return db.select().from(cashFlows).orderBy(desc(cashFlows.flowDate));
  }
  // Use local storage
  return [...localData.cashFlows].sort((a, b) => new Date(b.flowDate).getTime() - new Date(a.flowDate).getTime());
}

export async function addCashFlow(flow: InsertCashFlow) {
  const db = await getDb();
  if (db) {
    await db.insert(cashFlows).values(flow);
    return;
  }
  // Use local storage
  localData.cashFlows.push({
    id: localData.nextIds.cashFlows++,
    flowDate: flow.flowDate,
    flowType: flow.flowType,
    amount: flow.amount,
    currency: flow.currency,
    description: flow.description
  });
  saveLocalData();
}

export async function deleteCashFlow(id: number) {
  const db = await getDb();
  if (db) {
    await db.delete(cashFlows).where(eq(cashFlows.id, id));
    return;
  }
  // Use local storage
  localData.cashFlows = localData.cashFlows.filter(c => c.id !== id);
  saveLocalData();
}

// ============ Exchange Rate Functions ============
export async function getAllExchangeRates() {
  const db = await getDb();
  if (db) {
    return db.select().from(exchangeRates).orderBy(desc(exchangeRates.effectiveDate));
  }
  // Use local storage
  return [...localData.exchangeRates].sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
}

export async function getLatestExchangeRate(fromCurrency: string) {
  const db = await getDb();
  if (db) {
    const result = await db.select().from(exchangeRates)
      .where(eq(exchangeRates.fromCurrency, fromCurrency))
      .orderBy(desc(exchangeRates.effectiveDate))
      .limit(1);
    return result[0];
  }
  // Use local storage
  const rates = localData.exchangeRates
    .filter(r => r.fromCurrency === fromCurrency)
    .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
  return rates[0];
}

export async function upsertExchangeRate(rate: InsertExchangeRate) {
  const db = await getDb();
  if (db) {
    const existing = await db.select().from(exchangeRates)
      .where(and(
        eq(exchangeRates.fromCurrency, rate.fromCurrency),
        eq(exchangeRates.effectiveDate, rate.effectiveDate)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(exchangeRates)
        .set({ rate: rate.rate })
        .where(eq(exchangeRates.id, existing[0].id));
    } else {
      await db.insert(exchangeRates).values(rate);
    }
    return;
  }
  // Use local storage
  const existing = localData.exchangeRates.find(r => 
    r.fromCurrency === rate.fromCurrency && 
    new Date(r.effectiveDate).toDateString() === new Date(rate.effectiveDate).toDateString()
  );
  if (existing) {
    existing.rate = rate.rate;
  } else {
    localData.exchangeRates.push({
      id: localData.nextIds.exchangeRates++,
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: rate.rate,
      effectiveDate: rate.effectiveDate
    });
  }
  saveLocalData();
}

// ============ Portfolio Summary Functions ============
export async function getAllPortfolioSummaries() {
  const db = await getDb();
  if (db) {
    return db.select({
      id: portfolioSummary.id,
      snapshotId: portfolioSummary.snapshotId,
      totalValue: portfolioSummary.totalValue,
      changeFromPrevious: portfolioSummary.changeFromPrevious,
      changeFromTwoPrevious: portfolioSummary.changeFromTwoPrevious,
      snapshotLabel: snapshots.label,
      snapshotDate: snapshots.snapshotDate,
    })
    .from(portfolioSummary)
    .innerJoin(snapshots, eq(portfolioSummary.snapshotId, snapshots.id))
    .orderBy(asc(snapshots.snapshotDate));
  }
  // Use local storage
  return localData.portfolioSummary.map(ps => {
    const snapshot = localData.snapshots.find(s => s.id === ps.snapshotId);
    return {
      id: ps.id,
      snapshotId: ps.snapshotId,
      totalValue: ps.totalValue,
      changeFromPrevious: ps.changeFromPrevious,
      changeFromTwoPrevious: ps.changeFromTwoPrevious,
      snapshotLabel: snapshot?.label || '',
      snapshotDate: snapshot?.snapshotDate || new Date(),
    };
  }).sort((a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime());
}

export async function upsertPortfolioSummary(summary: InsertPortfolioSummary) {
  const db = await getDb();
  if (db) {
    const existing = await db.select().from(portfolioSummary)
      .where(eq(portfolioSummary.snapshotId, summary.snapshotId))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(portfolioSummary)
        .set({ 
          totalValue: summary.totalValue, 
          changeFromPrevious: summary.changeFromPrevious,
          changeFromTwoPrevious: summary.changeFromTwoPrevious
        })
        .where(eq(portfolioSummary.id, existing[0].id));
    } else {
      await db.insert(portfolioSummary).values(summary);
    }
    return;
  }
  // Use local storage
  const existing = localData.portfolioSummary.find(ps => ps.snapshotId === summary.snapshotId);
  if (existing) {
    existing.totalValue = summary.totalValue;
    existing.changeFromPrevious = summary.changeFromPrevious;
    existing.changeFromTwoPrevious = summary.changeFromTwoPrevious;
  } else {
    localData.portfolioSummary.push({
      id: localData.nextIds.portfolioSummary++,
      snapshotId: summary.snapshotId,
      totalValue: summary.totalValue,
      changeFromPrevious: summary.changeFromPrevious,
      changeFromTwoPrevious: summary.changeFromTwoPrevious
    });
  }
  saveLocalData();
}

// ============ Clear All Data ============
export async function clearAllData() {
  const db = await getDb();
  if (db) {
    await db.delete(assetValues);
    await db.delete(portfolioSummary);
    await db.delete(cashFlows);
    await db.delete(assets);
    await db.delete(assetCategories);
    await db.delete(snapshots);
    await db.delete(exchangeRates);
    return;
  }
  // Use local storage
  localData = {
    categories: [],
    assets: [],
    snapshots: [],
    assetValues: [],
    cashFlows: [],
    exchangeRates: [],
    portfolioSummary: [],
    nextIds: { categories: 1, assets: 1, snapshots: 1, assetValues: 1, cashFlows: 1, exchangeRates: 1, portfolioSummary: 1 }
  };
  saveLocalData();
}
