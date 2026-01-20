/**
 * 汇率服务模块
 * 提供实时汇率获取和缓存功能
 * 使用 ExchangeRate-API 免费版
 */

// 汇率缓存
interface ExchangeRateCache {
  rates: Record<string, number>;
  lastUpdated: Date;
  baseCurrency: string;
}

let rateCache: ExchangeRateCache | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1小时缓存

// 默认汇率（当API不可用时使用）
const DEFAULT_RATES: Record<string, Record<string, number>> = {
  CNY: {
    USD: 0.1389,  // 1 CNY = 0.1389 USD
    HKD: 1.0833,  // 1 CNY = 1.0833 HKD
    JPY: 21.43,   // 1 CNY = 21.43 JPY
    CNY: 1,
  },
  USD: {
    CNY: 7.2,     // 1 USD = 7.2 CNY
    HKD: 7.8,     // 1 USD = 7.8 HKD
    JPY: 154.3,   // 1 USD = 154.3 JPY
    USD: 1,
  },
};

/**
 * 从 ExchangeRate-API 获取实时汇率
 * @param baseCurrency 基准货币
 * @returns 汇率数据
 */
async function fetchExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number> | null> {
  try {
    // 使用免费的 ExchangeRate-API
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`[ExchangeRate] API request failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data && data.rates) {
      console.log(`[ExchangeRate] Successfully fetched rates for ${baseCurrency}`);
      return data.rates;
    }
    
    return null;
  } catch (error) {
    console.error('[ExchangeRate] Failed to fetch rates:', error);
    return null;
  }
}

/**
 * 获取汇率（带缓存）
 * @param baseCurrency 基准货币
 * @returns 汇率数据
 */
export async function getExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
  // 检查缓存是否有效
  if (rateCache && 
      rateCache.baseCurrency === baseCurrency &&
      (new Date().getTime() - rateCache.lastUpdated.getTime()) < CACHE_DURATION_MS) {
    console.log('[ExchangeRate] Using cached rates');
    return rateCache.rates;
  }

  // 获取新汇率
  const rates = await fetchExchangeRates(baseCurrency);
  
  if (rates) {
    // 更新缓存
    rateCache = {
      rates,
      lastUpdated: new Date(),
      baseCurrency,
    };
    return rates;
  }

  // 如果API失败，使用默认汇率
  console.log('[ExchangeRate] Using default rates');
  return DEFAULT_RATES[baseCurrency] || DEFAULT_RATES.USD;
}

/**
 * 货币转换
 * @param amount 金额
 * @param fromCurrency 源货币
 * @param toCurrency 目标货币
 * @returns 转换后的金额
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  try {
    // 获取以USD为基准的汇率
    const rates = await getExchangeRates('USD');
    
    // 计算转换
    // 先将源货币转换为USD，再转换为目标货币
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;
    
    // amount / fromRate 得到USD金额，再 * toRate 得到目标货币金额
    const usdAmount = amount / fromRate;
    const result = usdAmount * toRate;
    
    return result;
  } catch (error) {
    console.error('[ExchangeRate] Conversion error:', error);
    // 使用默认汇率进行转换
    if (fromCurrency === 'CNY' && toCurrency === 'USD') {
      return amount * 0.1389;
    } else if (fromCurrency === 'USD' && toCurrency === 'CNY') {
      return amount * 7.2;
    }
    return amount;
  }
}

/**
 * 获取指定货币对的汇率
 * @param fromCurrency 源货币
 * @param toCurrency 目标货币
 * @returns 汇率
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  try {
    const rates = await getExchangeRates('USD');
    
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;
    
    // 计算 fromCurrency 到 toCurrency 的汇率
    return toRate / fromRate;
  } catch (error) {
    console.error('[ExchangeRate] Get rate error:', error);
    // 返回默认汇率
    if (fromCurrency === 'USD' && toCurrency === 'CNY') {
      return 7.2;
    } else if (fromCurrency === 'CNY' && toCurrency === 'USD') {
      return 0.1389;
    } else if (fromCurrency === 'HKD' && toCurrency === 'CNY') {
      return 0.923;
    } else if (fromCurrency === 'JPY' && toCurrency === 'CNY') {
      return 0.0467;
    }
    return 1;
  }
}

/**
 * 批量获取多个货币对的汇率
 * @param pairs 货币对数组 [{from, to}]
 * @returns 汇率映射
 */
export async function getBatchExchangeRates(
  pairs: Array<{ from: string; to: string }>
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  
  try {
    const rates = await getExchangeRates('USD');
    
    for (const pair of pairs) {
      const key = `${pair.from}_${pair.to}`;
      if (pair.from === pair.to) {
        result[key] = 1;
      } else {
        const fromRate = rates[pair.from] || 1;
        const toRate = rates[pair.to] || 1;
        result[key] = toRate / fromRate;
      }
    }
  } catch (error) {
    console.error('[ExchangeRate] Batch get rates error:', error);
    // 使用默认值
    for (const pair of pairs) {
      const key = `${pair.from}_${pair.to}`;
      result[key] = await getExchangeRate(pair.from, pair.to);
    }
  }
  
  return result;
}

/**
 * 获取所有支持的货币列表
 * @returns 货币代码数组
 */
export function getSupportedCurrencies(): string[] {
  return ['CNY', 'USD', 'HKD', 'JPY', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'KRW'];
}

/**
 * 获取货币显示名称
 * @param code 货币代码
 * @returns 货币名称
 */
export function getCurrencyName(code: string): string {
  const names: Record<string, string> = {
    CNY: '人民币',
    USD: '美元',
    HKD: '港币',
    JPY: '日元',
    EUR: '欧元',
    GBP: '英镑',
    AUD: '澳元',
    CAD: '加元',
    SGD: '新加坡元',
    KRW: '韩元',
  };
  return names[code] || code;
}

/**
 * 获取货币符号
 * @param code 货币代码
 * @returns 货币符号
 */
export function getCurrencySymbol(code: string): string {
  const symbols: Record<string, string> = {
    CNY: '¥',
    USD: '$',
    HKD: 'HK$',
    JPY: '¥',
    EUR: '€',
    GBP: '£',
    AUD: 'A$',
    CAD: 'C$',
    SGD: 'S$',
    KRW: '₩',
  };
  return symbols[code] || code;
}
