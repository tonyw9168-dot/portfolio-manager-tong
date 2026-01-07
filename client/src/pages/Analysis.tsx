import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { 
  BarChart3, TrendingUp, TrendingDown, Layers, Grid3X3,
  ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell, LineChart, Line
} from "recharts";

// 图表颜色配置
const CATEGORY_COLORS: Record<string, string> = {
  "美股": "#f59e0b",
  "A+H股": "#3b82f6",
  "日股": "#8b5cf6",
  "黄金": "#eab308",
  "虚拟货币": "#10b981",
  "现金": "#6b7280",
};

export default function AnalysisPage() {
  const [viewMode, setViewMode] = useState<"category" | "asset" | "time">("category");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: snapshots } = trpc.snapshots.list.useQuery();
  const { data: assetValues } = trpc.assetValues.list.useQuery();

  // 获取排序后的快照
  const sortedSnapshots = useMemo(() => {
    if (!snapshots) return [];
    return [...snapshots].sort((a, b) => 
      new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
    );
  }, [snapshots]);

  // 按类别汇总数据（横向对比）
  const categoryComparisonData = useMemo(() => {
    if (!sortedSnapshots.length || !assetValues || !categories) return [];

    return categories.map(cat => {
      const dataPoints: Record<string, number | string> = {};
      
      sortedSnapshots.forEach(snapshot => {
        const catAssets = assetValues.filter(
          av => av.snapshotId === snapshot.id && av.categoryId === cat.id
        );
        const total = catAssets.reduce((sum, av) => sum + Number(av.cnyValue || 0), 0);
        const date = new Date(snapshot.snapshotDate);
        const dateLabel = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
        dataPoints[dateLabel] = total;
      });

      // 计算变化
      const values = sortedSnapshots.map(s => {
        const date = new Date(s.snapshotDate);
        const dateLabel = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
        return (dataPoints[dateLabel] as number) || 0;
      });
      
      const firstValue = values[0] || 0;
      const lastValue = values[values.length - 1] || 0;
      const change = lastValue - firstValue;
      const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;

      return {
        name: cat.name,
        ...dataPoints,
        color: CATEGORY_COLORS[cat.name] || "#888888",
        change,
        changePercent,
        currentValue: lastValue
      };
    }).filter(cat => cat.currentValue > 0);
  }, [sortedSnapshots, assetValues, categories]);

  // 按时间点汇总数据（纵向对比）
  const timeComparisonData = useMemo(() => {
    if (!sortedSnapshots.length || !assetValues || !categories) return [];

    return sortedSnapshots.map(snapshot => {
      const date = new Date(snapshot.snapshotDate);
      const dateLabel = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
      
      const dataPoint: Record<string, unknown> = { 
        date: dateLabel,
        fullDate: snapshot.snapshotDate
      };
      
      let total = 0;
      categories.forEach(cat => {
        const catAssets = assetValues.filter(
          av => av.snapshotId === snapshot.id && av.categoryId === cat.id
        );
        const catTotal = catAssets.reduce((sum, av) => sum + Number(av.cnyValue || 0), 0);
        dataPoint[cat.name] = catTotal;
        total += catTotal;
      });
      
      dataPoint.total = total;
      return dataPoint;
    });
  }, [sortedSnapshots, assetValues, categories]);

  // 按资产汇总数据
  const assetComparisonData = useMemo(() => {
    if (!sortedSnapshots.length || !assetValues) return [];

    // 获取所有唯一资产
    const assetMap = new Map<string, { name: string; categoryId: number; values: number[] }>();
    
    assetValues.forEach(av => {
      if (!assetMap.has(av.assetName)) {
        assetMap.set(av.assetName, {
          name: av.assetName,
          categoryId: av.categoryId,
          values: new Array(sortedSnapshots.length).fill(0)
        });
      }
      
      const snapshotIndex = sortedSnapshots.findIndex(s => s.id === av.snapshotId);
      if (snapshotIndex >= 0) {
        const asset = assetMap.get(av.assetName)!;
        asset.values[snapshotIndex] = Number(av.cnyValue || 0);
      }
    });

    return Array.from(assetMap.values())
      .map(asset => {
        const firstValue = asset.values[0] || 0;
        const lastValue = asset.values[asset.values.length - 1] || 0;
        const change = lastValue - firstValue;
        const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;
        const category = categories?.find(c => c.id === asset.categoryId);

        return {
          name: asset.name,
          categoryName: category?.name || '未知',
          values: asset.values,
          currentValue: lastValue,
          change,
          changePercent,
          color: CATEGORY_COLORS[category?.name || ''] || "#888888"
        };
      })
      .filter(asset => asset.currentValue > 0)
      .sort((a, b) => b.currentValue - a.currentValue);
  }, [sortedSnapshots, assetValues, categories]);

  // 筛选后的资产数据
  const filteredAssetData = useMemo(() => {
    if (selectedCategory === "all") return assetComparisonData;
    return assetComparisonData.filter(asset => asset.categoryName === selectedCategory);
  }, [assetComparisonData, selectedCategory]);

  // 格式化金额
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 10000) {
      return `¥${(value / 10000).toFixed(2)}万`;
    }
    return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
  };

  // 格式化百分比
  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // 获取变化图标
  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (change < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              高级持仓分析
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              全局横向纵向数据对比分析
            </p>
          </div>
        </div>

        {/* 视图切换 */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="category" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">按类别</span>
            </TabsTrigger>
            <TabsTrigger value="asset" className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">按标的</span>
            </TabsTrigger>
            <TabsTrigger value="time" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">按时间</span>
            </TabsTrigger>
          </TabsList>

          {/* 按类别视图 */}
          <TabsContent value="category" className="space-y-6">
            {/* 类别对比卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {categoryComparisonData.map((cat) => (
                <Card key={cat.name as string} className="stat-card">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs sm:text-sm font-medium truncate">
                          {cat.name as string}
                        </span>
                      </div>
                      {getChangeIcon(cat.change)}
                    </div>
                    <div className="text-base sm:text-lg font-bold text-foreground">
                      {formatCurrency(cat.currentValue)}
                    </div>
                    <div className={`text-xs sm:text-sm mt-1 ${
                      cat.change >= 0 ? 'profit-indicator' : 'loss-indicator'
                    }`}>
                      {formatPercent(cat.changePercent)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 类别趋势图 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">各类别历史趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeComparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                      {categories?.map(cat => (
                        <Line
                          key={cat.name}
                          type="monotone"
                          dataKey={cat.name}
                          stroke={CATEGORY_COLORS[cat.name] || "#888888"}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 类别对比矩阵 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">类别对比矩阵</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mobile-table-wrapper">
                  <table className="data-table min-w-[500px]">
                    <thead>
                      <tr>
                        <th>类别</th>
                        {sortedSnapshots.map(s => {
                          const date = new Date(s.snapshotDate);
                          return (
                            <th key={s.id}>
                              {(date.getMonth() + 1).toString().padStart(2, '0')}/{date.getDate().toString().padStart(2, '0')}
                            </th>
                          );
                        })}
                        <th>变化</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryComparisonData.map((cat) => (
                        <tr key={cat.name as string}>
                          <td className="font-medium">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name as string}
                            </div>
                          </td>
                          {sortedSnapshots.map(s => {
                            const date = new Date(s.snapshotDate);
                            const dateLabel = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
                            const value = (cat as Record<string, unknown>)[dateLabel] as number || 0;
                            return (
                              <td key={s.id}>{formatCurrency(value)}</td>
                            );
                          })}
                          <td className={cat.change >= 0 ? 'profit-indicator' : 'loss-indicator'}>
                            {formatPercent(cat.changePercent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 按标的视图 */}
          <TabsContent value="asset" className="space-y-6">
            {/* 筛选器 */}
            <div className="flex justify-end">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[150px]">
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

            {/* 资产排行 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">资产排行榜</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={filteredAssetData.slice(0, 10)} 
                      layout="vertical" 
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 75)" />
                      <XAxis 
                        type="number"
                        tickFormatter={(value) => value >= 10000 ? `${(value / 10000).toFixed(0)}万` : value.toString()}
                        tick={{ fontSize: 12 }}
                        stroke="oklch(0.5 0.02 250)"
                      />
                      <YAxis 
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        stroke="oklch(0.5 0.02 250)"
                        width={75}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), '当前价值']}
                        contentStyle={{
                          backgroundColor: 'oklch(1 0 0)',
                          border: '1px solid oklch(0.92 0.01 75)',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="currentValue" radius={[0, 4, 4, 0]}>
                        {filteredAssetData.slice(0, 10).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 资产详情表格 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">资产详情</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mobile-table-wrapper">
                  <table className="data-table min-w-[600px]">
                    <thead>
                      <tr>
                        <th>资产名称</th>
                        <th>类别</th>
                        <th>当前价值</th>
                        <th>期间变化</th>
                        <th>变化率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssetData.map((asset, index) => (
                        <tr key={index}>
                          <td className="font-medium">{asset.name}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: asset.color }}
                              />
                              {asset.categoryName}
                            </div>
                          </td>
                          <td>{formatCurrency(asset.currentValue)}</td>
                          <td className={asset.change >= 0 ? 'profit-indicator' : 'loss-indicator'}>
                            {formatCurrency(asset.change)}
                          </td>
                          <td className={asset.changePercent >= 0 ? 'profit-indicator' : 'loss-indicator'}>
                            {formatPercent(asset.changePercent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 按时间视图 */}
          <TabsContent value="time" className="space-y-6">
            {/* 时间点对比 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">各时间点资产构成</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeComparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                      {categories?.map(cat => (
                        <Bar
                          key={cat.name}
                          dataKey={cat.name}
                          stackId="a"
                          fill={CATEGORY_COLORS[cat.name] || "#888888"}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 时间点详情 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">时间点详情</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mobile-table-wrapper">
                  <table className="data-table min-w-[500px]">
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
                      {timeComparisonData.map((row, index) => (
                        <tr key={index}>
                          <td className="font-medium">{row.date as string}</td>
                          {categories?.map(cat => (
                            <td key={cat.id}>{formatCurrency((row[cat.name] as number) || 0)}</td>
                          ))}
                          <td className="font-bold">{formatCurrency((row.total as number) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
