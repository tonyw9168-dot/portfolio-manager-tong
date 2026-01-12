import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { 
  BarChart3, TrendingUp, TrendingDown, Layers, Grid3X3,
  ArrowUpRight, ArrowDownRight, Minus, ChevronDown, ChevronUp
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
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

  // 切换类别展开状态
  const toggleCategoryExpand = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  // 获取类别下的资产明细
  const getCategoryAssets = (categoryName: string) => {
    const category = categories?.find(c => c.name === categoryName);
    if (!category || !assetValues) return [];
    
    const latestSnapshot = sortedSnapshots[sortedSnapshots.length - 1];
    if (!latestSnapshot) return [];
    
    const categoryAssets = assetValues.filter(
      av => av.snapshotId === latestSnapshot.id && av.categoryId === category.id
    );
    
    const prevSnapshot = sortedSnapshots.length > 1 ? sortedSnapshots[sortedSnapshots.length - 2] : null;
    const prevCategoryAssets = prevSnapshot ? assetValues.filter(
      av => av.snapshotId === prevSnapshot.id && av.categoryId === category.id
    ) : [];
    
    return categoryAssets.map(av => {
      const prevValue = prevCategoryAssets.find(pav => pav.assetId === av.assetId);
      const currentValue = Number(av.cnyValue || 0);
      const prevValueAmount = prevValue ? Number(prevValue.cnyValue || 0) : currentValue;
      const change = currentValue - prevValueAmount;
      const changePercent = prevValueAmount > 0 ? (change / prevValueAmount) * 100 : 0;
      
      return {
        name: av.assetName,
        value: currentValue,
        change,
        changePercent,
        ratio: Number(av.currentRatio || 0)
      };
    }).sort((a, b) => b.value - a.value);
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

          {/* 按类别视图 - 增强版本 */}
          <TabsContent value="category" className="space-y-6">
            {/* 类别对比卡片 - 可展开 */}
            <div className="space-y-3">
              {categoryComparisonData.map((cat) => {
                const isExpanded = expandedCategories.has(cat.name as string);
                const categoryAssets = getCategoryAssets(cat.name as string);
                
                return (
                  <Card key={cat.name as string} className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* 类别卡片头部 - 可点击展开 */}
                      <button
                        onClick={() => toggleCategoryExpand(cat.name as string)}
                        className="w-full p-4 sm:p-5 hover:bg-muted/50 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: cat.color }}
                          />
                          <div className="text-left">
                            <div className="text-sm sm:text-base font-semibold text-foreground">
                              {cat.name as string}
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                              {formatCurrency(cat.currentValue)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className={`text-xs sm:text-sm font-medium ${
                              cat.change >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatPercent(cat.changePercent)}
                            </div>
                          </div>
                          {getChangeIcon(cat.change)}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* 展开的详细明细 */}
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/30 p-4">
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground">资产明细</h4>
                            {categoryAssets.length > 0 ? (
                              <div className="space-y-2">
                                {categoryAssets.map((asset, idx) => (
                                  <div 
                                    key={idx}
                                    className="p-3 bg-background rounded-lg border border-border/50 hover:border-border transition-colors"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <div className="text-sm font-medium text-foreground">
                                          {asset.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          占比: {(asset.ratio * 100).toFixed(2)}%
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-semibold text-foreground">
                                          {formatCurrency(asset.value)}
                                        </div>
                                        <div className={`text-xs font-medium ${
                                          asset.change >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {formatPercent(asset.changePercent)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground text-center py-4">
                                暂无资产明细
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
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
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类别</SelectItem>
                  {categories?.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 资产列表 */}
            <div className="grid gap-3 sm:gap-4">
              {filteredAssetData.map((asset) => (
                <Card key={asset.name} className="stat-card">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: asset.color }}
                        />
                        <span className="text-xs sm:text-sm font-medium truncate">
                          {asset.name}
                        </span>
                      </div>
                      {getChangeIcon(asset.change)}
                    </div>
                    <div className="text-base sm:text-lg font-bold text-foreground">
                      {formatCurrency(asset.currentValue)}
                    </div>
                    <div className={`text-xs sm:text-sm mt-1 ${
                      asset.change >= 0 ? 'profit-indicator' : 'loss-indicator'
                    }`}>
                      {formatPercent(asset.changePercent)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 按时间视图 */}
          <TabsContent value="time" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">时间序列对比</CardTitle>
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
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
