import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { 
  FileText, TrendingUp, TrendingDown, ArrowRight, 
  PieChart, BarChart3, Calendar, DollarSign
} from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// 图表颜色配置
const CATEGORY_COLORS: Record<string, string> = {
  "美股": "#f59e0b",
  "A+H股": "#3b82f6",
  "日股": "#8b5cf6",
  "黄金": "#eab308",
  "虚拟货币": "#10b981",
  "现金": "#6b7280",
};

export default function SummaryPage() {
  const [selectedSnapshot, setSelectedSnapshot] = useState<string>("latest");
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: snapshots } = trpc.snapshots.list.useQuery();
  const { data: assetValues } = trpc.assetValues.list.useQuery();

  // 获取排序后的快照
  const sortedSnapshots = useMemo(() => {
    if (!snapshots) return [];
    return [...snapshots].sort((a, b) => 
      new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
    );
  }, [snapshots]);

  // 获取当前选中的快照
  const currentSnapshot = useMemo(() => {
    if (!sortedSnapshots.length) return null;
    if (selectedSnapshot === "latest") return sortedSnapshots[0];
    return sortedSnapshots.find(s => s.id.toString() === selectedSnapshot) || sortedSnapshots[0];
  }, [sortedSnapshots, selectedSnapshot]);

  // 获取上一个快照用于对比
  const previousSnapshot = useMemo(() => {
    if (!sortedSnapshots.length || !currentSnapshot) return null;
    const currentIndex = sortedSnapshots.findIndex(s => s.id === currentSnapshot.id);
    return sortedSnapshots[currentIndex + 1] || null;
  }, [sortedSnapshots, currentSnapshot]);

  // 计算当前快照的资产数据
  const currentData = useMemo(() => {
    if (!currentSnapshot || !assetValues || !categories) return null;

    const snapshotAssets = assetValues.filter(av => av.snapshotId === currentSnapshot.id);
    const totalValue = snapshotAssets.reduce((sum, av) => sum + Number(av.cnyValue || 0), 0);

    const categoryData = categories.map(cat => {
      const catAssets = snapshotAssets.filter(av => av.categoryId === cat.id);
      const catTotal = catAssets.reduce((sum, av) => sum + Number(av.cnyValue || 0), 0);
      const ratio = totalValue > 0 ? (catTotal / totalValue) * 100 : 0;

      return {
        id: cat.id,
        name: cat.name,
        value: catTotal,
        ratio,
        assets: catAssets.map(av => ({
          name: av.assetName,
          value: Number(av.cnyValue || 0),
          originalValue: Number(av.originalValue || 0),
          currency: av.assetCurrency
        })),
        color: CATEGORY_COLORS[cat.name] || "#888888"
      };
    }).filter(cat => cat.value > 0);

    return {
      totalValue,
      categoryData,
      assetCount: snapshotAssets.length,
      date: currentSnapshot.snapshotDate,
      label: currentSnapshot.label
    };
  }, [currentSnapshot, assetValues, categories]);

  // 计算上一个快照的资产数据用于对比
  const previousData = useMemo(() => {
    if (!previousSnapshot || !assetValues || !categories) return null;

    const snapshotAssets = assetValues.filter(av => av.snapshotId === previousSnapshot.id);
    const totalValue = snapshotAssets.reduce((sum, av) => sum + Number(av.cnyValue || 0), 0);

    const categoryData = categories.map(cat => {
      const catAssets = snapshotAssets.filter(av => av.categoryId === cat.id);
      const catTotal = catAssets.reduce((sum, av) => sum + Number(av.cnyValue || 0), 0);
      return {
        id: cat.id,
        name: cat.name,
        value: catTotal
      };
    });

    return {
      totalValue,
      categoryData,
      date: previousSnapshot.snapshotDate,
      label: previousSnapshot.label
    };
  }, [previousSnapshot, assetValues, categories]);

  // 计算变化
  const changes = useMemo(() => {
    if (!currentData || !previousData) return null;

    const totalChange = currentData.totalValue - previousData.totalValue;
    const totalChangePercent = previousData.totalValue > 0 
      ? (totalChange / previousData.totalValue) * 100 
      : 0;

    const categoryChanges = currentData.categoryData.map(cat => {
      const prevCat = previousData.categoryData.find(p => p.id === cat.id);
      const prevValue = prevCat?.value || 0;
      const change = cat.value - prevValue;
      const changePercent = prevValue > 0 ? (change / prevValue) * 100 : (cat.value > 0 ? 100 : 0);

      return {
        ...cat,
        change,
        changePercent
      };
    });

    return {
      totalChange,
      totalChangePercent,
      categoryChanges
    };
  }, [currentData, previousData]);

  // 格式化金额
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 10000) {
      return `¥${(value / 10000).toFixed(2)}万`;
    }
    return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
  };

  // 格式化百分比
  const formatPercent = (value: number, showSign = true) => {
    const sign = showSign && value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // 格式化日期
  const formatDate = (date: Date) => {
    const d = new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  if (!currentData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">暂无数据</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              投资总结
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              每次资产更新的详细分析与总结
            </p>
          </div>
          <Select value={selectedSnapshot} onValueChange={setSelectedSnapshot}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="选择时间点" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">最新数据</SelectItem>
              {sortedSnapshots.map(snapshot => (
                <SelectItem key={snapshot.id} value={snapshot.id.toString()}>
                  {snapshot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 总结卡片 */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {formatDate(currentData.date)} · {currentData.label}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">总资产</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {formatCurrency(currentData.totalValue)}
                </p>
              </div>
              
              {changes && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">本期变动</p>
                    <p className={`text-xl sm:text-2xl font-bold ${
                      changes.totalChange >= 0 ? 'profit-indicator' : 'loss-indicator'
                    }`}>
                      {formatCurrency(changes.totalChange)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">变动幅度</p>
                    <div className={`flex items-center gap-2 text-xl sm:text-2xl font-bold ${
                      changes.totalChangePercent >= 0 ? 'profit-indicator' : 'loss-indicator'
                    }`}>
                      {changes.totalChangePercent >= 0 ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                      {formatPercent(changes.totalChangePercent)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 对比分析 */}
        {previousData && changes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-primary" />
                与上期对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4 mb-6 text-sm text-muted-foreground">
                <span>{previousData.label}</span>
                <ArrowRight className="w-4 h-4" />
                <span>{currentData.label}</span>
              </div>
              
              <div className="space-y-4">
                {changes.categoryChanges.map(cat => (
                  <div key={cat.id} className="flex items-center gap-4">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{cat.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(cat.value)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 progress-bar">
                          <div 
                            className={`progress-bar-fill ${
                              cat.change >= 0 ? 'on-target' : 'over-target'
                            }`}
                            style={{ width: `${Math.min(cat.ratio, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium min-w-[60px] text-right ${
                          cat.change >= 0 ? 'profit-indicator' : 'loss-indicator'
                        }`}>
                          {formatPercent(cat.changePercent)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 资产配置分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 配置饼图 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                资产配置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={currentData.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {currentData.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'oklch(1 0 0)',
                        border: '1px solid oklch(0.92 0.01 75)',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {currentData.categoryData.map(cat => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs text-muted-foreground truncate">
                      {cat.name} {cat.ratio.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 各类别详情 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                类别详情
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentData.categoryData.map(cat => (
                  <div key={cat.id} className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <span className="font-bold">{formatCurrency(cat.value)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      占比 {cat.ratio.toFixed(1)}% · {cat.assets.length} 个标的
                    </div>
                    {cat.assets.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="space-y-1">
                          {cat.assets.slice(0, 3).map((asset, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground truncate max-w-[120px]">
                                {asset.name}
                              </span>
                              <span>{formatCurrency(asset.value)}</span>
                            </div>
                          ))}
                          {cat.assets.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              还有 {cat.assets.length - 3} 个标的...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 投资建议 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              投资分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 最大持仓 */}
              {currentData.categoryData.length > 0 && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <h4 className="font-medium mb-2">最大持仓类别</h4>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {currentData.categoryData[0].name}
                    </span>
                    {' '}占总资产的{' '}
                    <span className="font-medium text-foreground">
                      {currentData.categoryData[0].ratio.toFixed(1)}%
                    </span>
                    ，价值{' '}
                    <span className="font-medium text-foreground">
                      {formatCurrency(currentData.categoryData[0].value)}
                    </span>
                  </p>
                </div>
              )}

              {/* 本期表现 */}
              {changes && (
                <div className={`p-4 rounded-lg ${
                  changes.totalChange >= 0 
                    ? 'bg-green-50 border border-green-100' 
                    : 'bg-red-50 border border-red-100'
                }`}>
                  <h4 className="font-medium mb-2">本期表现</h4>
                  <p className="text-sm text-muted-foreground">
                    总资产{changes.totalChange >= 0 ? '增加' : '减少'}{' '}
                    <span className={`font-medium ${
                      changes.totalChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Math.abs(changes.totalChange))}
                    </span>
                    ，变动幅度{' '}
                    <span className={`font-medium ${
                      changes.totalChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercent(changes.totalChangePercent)}
                    </span>
                  </p>
                </div>
              )}

              {/* 资产统计 */}
              <div className="p-4 rounded-lg bg-muted/30">
                <h4 className="font-medium mb-2">资产统计</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">资产类别</p>
                    <p className="font-medium">{currentData.categoryData.length} 个</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">投资标的</p>
                    <p className="font-medium">{currentData.assetCount} 个</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">数据快照</p>
                    <p className="font-medium">{sortedSnapshots.length} 个</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">记录时间</p>
                    <p className="font-medium">{formatDate(currentData.date)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
