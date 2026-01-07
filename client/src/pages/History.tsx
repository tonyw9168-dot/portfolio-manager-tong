import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine
} from "recharts";
import { TrendingUp, TrendingDown, History as HistoryIcon, BarChart3 } from "lucide-react";

// 图表颜色配置
const CATEGORY_COLORS: Record<string, string> = {
  "美股": "#f59e0b",
  "A+H股": "#3b82f6",
  "日股": "#8b5cf6",
  "黄金": "#eab308",
  "虚拟货币": "#10b981",
  "现金": "#6b7280",
};

export default function HistoryPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: snapshots } = trpc.snapshots.list.useQuery();
  const { data: assetValues } = trpc.assetValues.list.useQuery();
  const { data: exchangeRates } = trpc.exchangeRates.list.useQuery();

  // 获取汇率
  const getExchangeRate = (currency: string) => {
    if (currency === "CNY") return 1;
    const rate = exchangeRates?.find(r => r.fromCurrency === currency && r.toCurrency === "CNY");
    return rate?.rate ? Number(rate.rate) : 1;
  };

  // 计算各类别在各时间点的总值
  const categoryHistoryData = useMemo(() => {
    if (!snapshots || !assetValues || !categories) return [];

    const sortedSnapshots = [...snapshots].sort((a, b) => 
      new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
    );

    return sortedSnapshots.map(snapshot => {
      const snapshotAssets = assetValues.filter(av => av.snapshotId === snapshot.id);
      const categoryTotals: Record<string, number> = {};
      
      categories.forEach(cat => {
        const catAssets = snapshotAssets.filter(av => av.categoryId === cat.id);
        const total = catAssets.reduce((sum, av) => {
          return sum + Number(av.cnyValue || 0);
        }, 0);
        categoryTotals[cat.name] = total;
      });

      const date = new Date(snapshot.snapshotDate);
      const dateLabel = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;

      return {
        date: dateLabel,
        fullDate: snapshot.snapshotDate,
        ...categoryTotals,
        total: Object.values(categoryTotals).reduce((a, b) => a + b, 0)
      };
    });
  }, [snapshots, assetValues, categories, exchangeRates]);

  // 计算盈亏数据
  const profitLossData = useMemo(() => {
    if (!categoryHistoryData || categoryHistoryData.length < 2 || !categories) return [];

    const firstData = categoryHistoryData[0] as Record<string, unknown>;
    const lastData = categoryHistoryData[categoryHistoryData.length - 1] as Record<string, unknown>;

    return categories.map(cat => {
      const firstValue = (firstData?.[cat.name] as number) || 0;
      const lastValue = (lastData?.[cat.name] as number) || 0;
      const change = lastValue - firstValue;
      const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;

      return {
        name: cat.name,
        value: lastValue,
        change,
        changePercent,
        color: CATEGORY_COLORS[cat.name] || "#888888"
      };
    }).filter(item => item.value > 0 || item.change !== 0);
  }, [categoryHistoryData, categories]);

  // 计算各时间点的盈亏变化
  const periodProfitLoss = useMemo(() => {
    if (!categoryHistoryData || categoryHistoryData.length < 2) return [];

    return categoryHistoryData.slice(1).map((current, index) => {
      const previous = categoryHistoryData[index];
      const change = current.total - previous.total;
      const changePercent = previous.total > 0 ? (change / previous.total) * 100 : 0;

      return {
        date: current.date,
        change,
        changePercent,
        total: current.total
      };
    });
  }, [categoryHistoryData]);

  // 格式化金额
  const formatCurrency = (value: number) => {
    if (value >= 10000) {
      return `¥${(value / 10000).toFixed(2)}万`;
    }
    return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
  };

  // 格式化百分比
  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // 筛选后的历史数据
  const filteredHistoryData = useMemo(() => {
    if (selectedCategory === "all") return categoryHistoryData;
    
    return categoryHistoryData.map(item => {
      const itemAny = item as Record<string, unknown>;
      const categoryValue = (itemAny[selectedCategory] as number) || 0;
      return {
        date: item.date,
        fullDate: item.fullDate,
        [selectedCategory]: categoryValue,
        total: categoryValue
      };
    });
  }, [categoryHistoryData, selectedCategory]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <HistoryIcon className="w-6 h-6 text-primary" />
              历史数据对比
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              追踪各投资类别的历史表现和盈亏变化
            </p>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="选择类别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类别</SelectItem>
              {categories?.map(cat => (
                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 盈亏概览卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {profitLossData.slice(0, 4).map((item) => (
            <Card key={item.name} className="stat-card">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">{item.name}</span>
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                </div>
                <div className="text-base sm:text-lg font-bold text-foreground">
                  {formatCurrency(item.value)}
                </div>
                <div className={`flex items-center gap-1 text-xs sm:text-sm mt-1 ${
                  item.change >= 0 ? 'profit-indicator' : 'loss-indicator'
                }`}>
                  {item.change >= 0 ? (
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                  <span>{formatPercent(item.changePercent)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 历史趋势图 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-primary" />
              资产历史趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredHistoryData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 75)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="oklch(0.5 0.02 250)"
                  />
                  <YAxis 
                    tickFormatter={(value) => value >= 10000 ? `${(value / 10000).toFixed(0)}万` : value}
                    tick={{ fontSize: 12 }}
                    stroke="oklch(0.5 0.02 250)"
                    width={50}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    contentStyle={{
                      backgroundColor: 'oklch(1 0 0)',
                      border: '1px solid oklch(0.92 0.01 75)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {selectedCategory === "all" ? (
                    categories?.map(cat => (
                      <Line
                        key={cat.name}
                        type="monotone"
                        dataKey={cat.name}
                        stroke={CATEGORY_COLORS[cat.name] || "#888888"}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))
                  ) : (
                    <Line
                      type="monotone"
                      dataKey={selectedCategory}
                      stroke={CATEGORY_COLORS[selectedCategory] || "#888888"}
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      activeDot={{ r: 8 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 盈亏分析图 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              各类别盈亏分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitLossData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 75)" />
                  <XAxis 
                    type="number"
                    tickFormatter={(value) => value >= 10000 || value <= -10000 ? `${(value / 10000).toFixed(0)}万` : value.toString()}
                    tick={{ fontSize: 12 }}
                    stroke="oklch(0.5 0.02 250)"
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    stroke="oklch(0.5 0.02 250)"
                    width={60}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), '盈亏']}
                    contentStyle={{
                      backgroundColor: 'oklch(1 0 0)',
                      border: '1px solid oklch(0.92 0.01 75)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <ReferenceLine x={0} stroke="oklch(0.5 0.02 250)" />
                  <Bar dataKey="change" radius={[0, 4, 4, 0]}>
                    {profitLossData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.change >= 0 ? 'oklch(0.55 0.2 145)' : 'oklch(0.55 0.22 25)'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 期间盈亏变化 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              期间盈亏变化
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodProfitLoss} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 75)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="oklch(0.5 0.02 250)"
                  />
                  <YAxis 
                    tickFormatter={(value) => value >= 10000 || value <= -10000 ? `${(value / 10000).toFixed(0)}万` : value.toString()}
                    tick={{ fontSize: 12 }}
                    stroke="oklch(0.5 0.02 250)"
                    width={50}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'change') return [formatCurrency(value), '变动'];
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: 'oklch(1 0 0)',
                      border: '1px solid oklch(0.92 0.01 75)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <ReferenceLine y={0} stroke="oklch(0.5 0.02 250)" />
                  <Bar dataKey="change" radius={[4, 4, 0, 0]}>
                    {periodProfitLoss.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.change >= 0 ? 'oklch(0.55 0.2 145)' : 'oklch(0.55 0.22 25)'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 详细数据表格 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">历史数据明细</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mobile-table-wrapper">
              <table className="data-table min-w-[600px]">
                <thead>
                  <tr>
                    <th>日期</th>
                    {categories?.map(cat => (
                      <th key={cat.id}>{cat.name}</th>
                    ))}
                    <th>总计</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryHistoryData.map((row, index) => {
                    const rowAny = row as Record<string, unknown>;
                    return (
                      <tr key={index}>
                        <td className="font-medium">{row.date}</td>
                        {categories?.map(cat => (
                          <td key={cat.id}>{formatCurrency((rowAny[cat.name] as number) || 0)}</td>
                        ))}
                        <td className="font-bold">{formatCurrency(row.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
