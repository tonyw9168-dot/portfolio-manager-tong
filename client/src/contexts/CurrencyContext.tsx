import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

// 支持的币种类型
export type CurrencyDisplay = "CNY" | "USD" | "HKD";

// 默认汇率（兑人民币）
const DEFAULT_RATES: Record<string, number> = {
  CNY: 1,
  USD: 7.25,
  HKD: 0.93,
  JPY: 0.047,
};

// 币种信息
export const CURRENCY_INFO: Record<CurrencyDisplay, { symbol: string; name: string; locale: string }> = {
  CNY: { symbol: "¥", name: "人民币", locale: "zh-CN" },
  USD: { symbol: "$", name: "美元", locale: "en-US" },
  HKD: { symbol: "HK$", name: "港币", locale: "zh-HK" },
};

interface CurrencyContextType {
  displayCurrency: CurrencyDisplay;
  setDisplayCurrency: (currency: CurrencyDisplay) => void;
  exchangeRates: Record<string, number>;
  convertFromCNY: (cnyValue: number) => number;
  formatCurrency: (value: number | string, compact?: boolean) => string;
  formatCurrencyValue: (cnyValue: number | string) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyDisplay>("CNY");
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(DEFAULT_RATES);

  // 从服务器获取汇率
  const { data: ratesData, isLoading } = trpc.exchangeRates.list.useQuery();

  useEffect(() => {
    if (ratesData && ratesData.length > 0) {
      const rates: Record<string, number> = { CNY: 1 };
      ratesData.forEach((rate) => {
        if (rate.fromCurrency && rate.rate) {
          rates[rate.fromCurrency] = parseFloat(rate.rate);
        }
      });
      setExchangeRates({ ...DEFAULT_RATES, ...rates });
    }
  }, [ratesData]);

  // 从人民币转换到显示币种
  const convertFromCNY = (cnyValue: number): number => {
    if (displayCurrency === "CNY") return cnyValue;
    const rate = exchangeRates[displayCurrency] || 1;
    return rate > 0 ? cnyValue / rate : cnyValue;
  };

  // 格式化货币
  const formatCurrency = (value: number | string, compact: boolean = false): string => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return `${CURRENCY_INFO[displayCurrency].symbol}0.00`;

    const convertedValue = convertFromCNY(num);
    const info = CURRENCY_INFO[displayCurrency];

    if (compact && Math.abs(convertedValue) >= 10000) {
      return `${info.symbol}${(convertedValue / 10000).toFixed(2)}万`;
    }

    return new Intl.NumberFormat(info.locale, {
      style: "currency",
      currency: displayCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(convertedValue);
  };

  // 格式化货币值（简化版）
  const formatCurrencyValue = (cnyValue: number | string): string => {
    return formatCurrency(cnyValue, true);
  };

  return (
    <CurrencyContext.Provider
      value={{
        displayCurrency,
        setDisplayCurrency,
        exchangeRates,
        convertFromCNY,
        formatCurrency,
        formatCurrencyValue,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

// 币种选择器组件
export function CurrencySelector() {
  const { displayCurrency, setDisplayCurrency } = useCurrency();

  return (
    <select
      value={displayCurrency}
      onChange={(e) => setDisplayCurrency(e.target.value as CurrencyDisplay)}
      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
    >
      <option value="CNY">人民币 ¥</option>
      <option value="USD">美元 $</option>
      <option value="HKD">港币 HK$</option>
    </select>
  );
}
