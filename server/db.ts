import { eq, and, asc, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { 
  InsertUser, users,
  assetCategories, InsertAssetCategory,
  assets, InsertAsset,
  snapshots, InsertSnapshot,
  assetValues, InsertAssetValue,
  cashFlows, InsertCashFlow,
  exchangeRates, InsertExchangeRate,
  portfolioSummary, InsertPortfolioSummary,
  familyMembers, InsertFamilyMember,
  insurancePolicies, InsertInsurancePolicy
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
  cashFlows: Array<{ id: number; flowDate: Date; flowType: string; amount: string; currency: string; description?: string; sourceAccount?: string; targetAccount?: string; assetName?: string; originalAmount: string; cnyAmount: string }>;
  exchangeRates: Array<{ id: number; fromCurrency: string; toCurrency: string; rate: string; effectiveDate: Date }>;
  portfolioSummary: Array<{ id: number; snapshotId: number; totalValue: string; changeFromPrevious?: string; changeFromTwoPrevious?: string }>;
  familyMembers: Array<{ id: number; name: string; role: string; relationship?: string; birthDate?: Date; age?: number; sortOrder: number }>;
  insurancePolicies: Array<{
    id: number;
    name: string;
    company: string;
    insuranceType: string;
    insuredMemberId: number;
    policyholderMemberId?: number;
    coverageAmount?: string;
    coverageAmountText?: string;
    annualPremium?: string;
    currency: string;
    effectiveDate?: Date;
    expiryDate?: Date;
    coveragePeriod?: string;
    paymentMethod?: string;
    coverageDetails?: string;
    claimConditions?: string;
    status: string;
    notes?: string;
  }>;
  nextIds: { 
    categories: number; 
    assets: number; 
    snapshots: number; 
    assetValues: number; 
    cashFlows: number; 
    exchangeRates: number; 
    portfolioSummary: number;
    familyMembers: number;
    insurancePolicies: number;
  };
}

let localData: LocalData = {
  categories: [],
  assets: [],
  snapshots: [],
  assetValues: [],
  cashFlows: [],
  exchangeRates: [],
  portfolioSummary: [],
  familyMembers: [],
  insurancePolicies: [],
  nextIds: { 
    categories: 1, 
    assets: 1, 
    snapshots: 1, 
    assetValues: 1, 
    cashFlows: 1, 
    exchangeRates: 1, 
    portfolioSummary: 1,
    familyMembers: 1,
    insurancePolicies: 1
  }
};

function loadLocalData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      localData = {
        ...localData,
        ...parsed,
        nextIds: { ...localData.nextIds, ...parsed.nextIds }
      };
      // Convert date strings back to Date objects
      localData.snapshots = localData.snapshots.map(s => ({ ...s, snapshotDate: new Date(s.snapshotDate) }));
      localData.cashFlows = localData.cashFlows.map(c => ({ ...c, flowDate: new Date(c.flowDate) }));
      localData.exchangeRates = localData.exchangeRates.map(e => ({ ...e, effectiveDate: new Date(e.effectiveDate) }));
      if (localData.familyMembers) {
        localData.familyMembers = localData.familyMembers.map(m => ({ ...m, birthDate: m.birthDate ? new Date(m.birthDate) : undefined }));
      }
      if (localData.insurancePolicies) {
        localData.insurancePolicies = localData.insurancePolicies.map(p => ({
          ...p,
          effectiveDate: p.effectiveDate ? new Date(p.effectiveDate) : undefined,
          expiryDate: p.expiryDate ? new Date(p.expiryDate) : undefined
        }));
      }
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
let _connection: mysql.Connection | null = null;

export async function getDb() {
  // Check if existing connection is still valid
  if (_connection) {
    try {
      await _connection.ping();
    } catch (error) {
      console.log("[Database] Connection lost, reconnecting...");
      _db = null;
      _connection = null;
    }
  }
  
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Parse DATABASE_URL for TiDB Cloud SSL connection
      const url = new URL(process.env.DATABASE_URL);
      
      _connection = await mysql.createConnection({
        host: url.hostname,
        port: parseInt(url.port) || 4000,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.slice(1),
        ssl: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: false
        },
        connectTimeout: 30000,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      
      _db = drizzle({ client: _connection });
      console.log("[Database] Connected to TiDB Cloud successfully");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _connection = null;
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

export async function upsertAsset(asset: InsertAsset): Promise<number | undefined> {
  const db = await getDb();
  if (db) {
    const existing = await db.select().from(assets)
      .where(and(eq(assets.name, asset.name), eq(assets.categoryId, asset.categoryId)))
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
  const existing = localData.assets.find(a => a.name === asset.name && a.categoryId === asset.categoryId);
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

export async function getAssetById(id: number) {
  const db = await getDb();
  if (db) {
    const result = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
    return result[0];
  }
  // Use local storage
  return localData.assets.find(a => a.id === id);
}

export async function deleteAsset(id: number) {
  const db = await getDb();
  if (db) {
    // First delete related asset values
    await db.delete(assetValues).where(eq(assetValues.assetId, id));
    // Then delete the asset
    await db.delete(assets).where(eq(assets.id, id));
    return;
  }
  // Use local storage
  localData.assetValues = localData.assetValues.filter(av => av.assetId !== id);
  localData.assets = localData.assets.filter(a => a.id !== id);
  saveLocalData();
}

export async function updateAsset(id: number, data: Partial<InsertAsset>) {
  const db = await getDb();
  if (db) {
    await db.update(assets).set(data).where(eq(assets.id, id));
    return;
  }
  // Use local storage
  const asset = localData.assets.find(a => a.id === id);
  if (asset) {
    Object.assign(asset, data);
    saveLocalData();
  }
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

export async function upsertSnapshot(snapshot: InsertSnapshot): Promise<number | undefined> {
  const db = await getDb();
  if (db) {
    const existing = await db.select().from(snapshots).where(eq(snapshots.label, snapshot.label)).limit(1);
    if (existing.length > 0) {
      return existing[0].id;
    }
    const result = await db.insert(snapshots).values(snapshot);
    return result[0].insertId;
  }
  // Use local storage
  const existing = localData.snapshots.find(s => s.label === snapshot.label);
  if (existing) {
    return existing.id;
  }
  const newId = localData.nextIds.snapshots++;
  localData.snapshots.push({
    id: newId,
    snapshotDate: snapshot.snapshotDate,
    label: snapshot.label
  });
  saveLocalData();
  return newId;
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
export async function getAssetValues(filter?: { categoryId?: number; snapshotId?: number }) {
  const db = await getDb();
  if (db) {
    let query = db.select({
      id: assetValues.id,
      assetId: assetValues.assetId,
      snapshotId: assetValues.snapshotId,
      originalValue: assetValues.originalValue,
      cnyValue: assetValues.cnyValue,
      changeFromPrevious: assetValues.changeFromPrevious,
      currentRatio: assetValues.currentRatio,
      assetName: assets.name,
      categoryId: assets.categoryId,
    })
    .from(assetValues)
    .innerJoin(assets, eq(assetValues.assetId, assets.id));
    
    if (filter?.categoryId) {
      query = query.where(eq(assets.categoryId, filter.categoryId)) as typeof query;
    }
    if (filter?.snapshotId) {
      query = query.where(eq(assetValues.snapshotId, filter.snapshotId)) as typeof query;
    }
    
    return query;
  }
  // Use local storage
  let result = localData.assetValues.map(av => {
    const asset = localData.assets.find(a => a.id === av.assetId);
    return {
      ...av,
      assetName: asset?.name || '',
      categoryId: asset?.categoryId || 0,
    };
  });
  
  if (filter?.categoryId) {
    result = result.filter(av => av.categoryId === filter.categoryId);
  }
  if (filter?.snapshotId) {
    result = result.filter(av => av.snapshotId === filter.snapshotId);
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
    sourceAccount: flow.sourceAccount,
    targetAccount: flow.targetAccount,
    assetName: flow.assetName,
    originalAmount: flow.originalAmount,
    currency: flow.currency,
    cnyAmount: flow.cnyAmount,
    description: flow.description,
    amount: flow.cnyAmount,
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
  localData.cashFlows = localData.cashFlows.filter(cf => cf.id !== id);
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
    familyMembers: localData.familyMembers || [],
    insurancePolicies: localData.insurancePolicies || [],
    nextIds: { 
      categories: 1, 
      assets: 1, 
      snapshots: 1, 
      assetValues: 1, 
      cashFlows: 1, 
      exchangeRates: 1, 
      portfolioSummary: 1,
      familyMembers: localData.nextIds.familyMembers || 1,
      insurancePolicies: localData.nextIds.insurancePolicies || 1
    }
  };
  saveLocalData();
}

// ============ Family Member Functions ============
export async function getAllFamilyMembers() {
  const db = await getDb();
  if (db) {
    return db.select().from(familyMembers).orderBy(asc(familyMembers.sortOrder));
  }
  // Use local storage
  return [...(localData.familyMembers || [])].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getFamilyMemberById(id: number) {
  const db = await getDb();
  if (db) {
    const result = await db.select().from(familyMembers).where(eq(familyMembers.id, id)).limit(1);
    return result[0];
  }
  // Use local storage
  return localData.familyMembers?.find(m => m.id === id);
}

export async function addFamilyMember(member: InsertFamilyMember): Promise<number> {
  const db = await getDb();
  if (db) {
    const result = await db.insert(familyMembers).values(member);
    return result[0].insertId;
  }
  // Use local storage
  if (!localData.familyMembers) localData.familyMembers = [];
  if (!localData.nextIds.familyMembers) localData.nextIds.familyMembers = 1;
  
  const newId = localData.nextIds.familyMembers++;
  localData.familyMembers.push({
    id: newId,
    name: member.name,
    role: member.role,
    relationship: member.relationship,
    birthDate: member.birthDate,
    age: member.age,
    sortOrder: member.sortOrder ?? 0
  });
  saveLocalData();
  return newId;
}

export async function updateFamilyMember(id: number, member: Partial<InsertFamilyMember>) {
  const db = await getDb();
  if (db) {
    await db.update(familyMembers).set(member).where(eq(familyMembers.id, id));
    return;
  }
  // Use local storage
  const existing = localData.familyMembers?.find(m => m.id === id);
  if (existing) {
    if (member.name !== undefined) existing.name = member.name;
    if (member.role !== undefined) existing.role = member.role;
    if (member.relationship !== undefined) existing.relationship = member.relationship;
    if (member.birthDate !== undefined) existing.birthDate = member.birthDate;
    if (member.age !== undefined) existing.age = member.age;
    if (member.sortOrder !== undefined) existing.sortOrder = member.sortOrder;
    saveLocalData();
  }
}

export async function deleteFamilyMember(id: number) {
  const db = await getDb();
  if (db) {
    await db.delete(familyMembers).where(eq(familyMembers.id, id));
    return;
  }
  // Use local storage
  if (localData.familyMembers) {
    localData.familyMembers = localData.familyMembers.filter(m => m.id !== id);
    saveLocalData();
  }
}

// ============ Insurance Policy Functions ============
export async function getAllInsurancePolicies() {
  const db = await getDb();
  if (db) {
    return db.select().from(insurancePolicies).orderBy(asc(insurancePolicies.insuranceType));
  }
  // Use local storage
  return [...(localData.insurancePolicies || [])].sort((a, b) => a.insuranceType.localeCompare(b.insuranceType));
}

export async function getInsurancePolicyById(id: number) {
  const db = await getDb();
  if (db) {
    const result = await db.select().from(insurancePolicies).where(eq(insurancePolicies.id, id)).limit(1);
    return result[0];
  }
  // Use local storage
  return localData.insurancePolicies?.find(p => p.id === id);
}

export async function getInsurancePoliciesByMember(memberId: number) {
  const db = await getDb();
  if (db) {
    return db.select().from(insurancePolicies).where(eq(insurancePolicies.insuredMemberId, memberId));
  }
  // Use local storage
  return localData.insurancePolicies?.filter(p => p.insuredMemberId === memberId) || [];
}

export async function getInsurancePoliciesByType(insuranceType: string) {
  const db = await getDb();
  if (db) {
    return db.select().from(insurancePolicies).where(eq(insurancePolicies.insuranceType, insuranceType));
  }
  // Use local storage
  return localData.insurancePolicies?.filter(p => p.insuranceType === insuranceType) || [];
}

export async function addInsurancePolicy(policy: InsertInsurancePolicy): Promise<number> {
  const db = await getDb();
  if (db) {
    // Convert empty strings to undefined for optional fields to avoid database type errors
    const cleanedPolicy = {
      ...policy,
      coverageAmount: policy.coverageAmount === '' ? undefined : policy.coverageAmount,
      coverageAmountText: policy.coverageAmountText === '' ? undefined : policy.coverageAmountText,
      annualPremium: policy.annualPremium === '' ? undefined : policy.annualPremium,
      effectiveDate: policy.effectiveDate === '' || policy.effectiveDate === undefined ? undefined : policy.effectiveDate,
      expiryDate: policy.expiryDate === '' || policy.expiryDate === undefined ? undefined : policy.expiryDate,
      coveragePeriod: policy.coveragePeriod === '' ? undefined : policy.coveragePeriod,
      paymentMethod: policy.paymentMethod === '' ? undefined : policy.paymentMethod,
      coverageDetails: policy.coverageDetails === '' ? undefined : policy.coverageDetails,
      claimConditions: policy.claimConditions === '' ? undefined : policy.claimConditions,
      notes: policy.notes === '' ? undefined : policy.notes,
      policyholderMemberId: policy.policyholderMemberId === undefined || policy.policyholderMemberId === null ? undefined : policy.policyholderMemberId,
    };
    const result = await db.insert(insurancePolicies).values(cleanedPolicy);
    return result[0].insertId;
  }
  // Use local storage
  if (!localData.insurancePolicies) localData.insurancePolicies = [];
  if (!localData.nextIds.insurancePolicies) localData.nextIds.insurancePolicies = 1;
  
  const newId = localData.nextIds.insurancePolicies++;
  localData.insurancePolicies.push({
    id: newId,
    name: policy.name,
    company: policy.company,
    insuranceType: policy.insuranceType,
    insuredMemberId: policy.insuredMemberId,
    policyholderMemberId: policy.policyholderMemberId,
    coverageAmount: policy.coverageAmount,
    coverageAmountText: policy.coverageAmountText,
    annualPremium: policy.annualPremium,
    currency: policy.currency,
    effectiveDate: policy.effectiveDate,
    expiryDate: policy.expiryDate,
    coveragePeriod: policy.coveragePeriod,
    paymentMethod: policy.paymentMethod,
    coverageDetails: policy.coverageDetails,
    claimConditions: policy.claimConditions,
    status: policy.status,
    notes: policy.notes
  });
  saveLocalData();
  return newId;
}

export async function updateInsurancePolicy(id: number, policy: Partial<InsertInsurancePolicy>) {
  const db = await getDb();
  if (db) {
    await db.update(insurancePolicies).set(policy).where(eq(insurancePolicies.id, id));
    return;
  }
  // Use local storage
  const existing = localData.insurancePolicies?.find(p => p.id === id);
  if (existing) {
    Object.assign(existing, policy);
    saveLocalData();
  }
}

export async function deleteInsurancePolicy(id: number) {
  const db = await getDb();
  if (db) {
    await db.delete(insurancePolicies).where(eq(insurancePolicies.id, id));
    return;
  }
  // Use local storage
  if (localData.insurancePolicies) {
    localData.insurancePolicies = localData.insurancePolicies.filter(p => p.id !== id);
    saveLocalData();
  }
}

