/**
 * 涨跌分析组件
 * 用于在"资产分析 > 按时间"模块中显示涨跌分析功能
 */

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus,
  Calendar, Download, Filter, RefreshCw, ChevronUp, ChevronDown,
  BarChart3, PieChart, Table as TableIcon
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie
} from "recharts";

// 类别颜色配置
const CATEGORY_COLORS: Record<string, string> = {
  "美股": "#f59e0b",
  "A+H股": "#3b82f6",
  "日股": "#8b5cf6",
  "黄金": "#eab308",
  "虚拟货币": "#10b981",
  "现金": "#6b7280",
};

// 涨跌颜色（红涨绿跌）
const UP_COLOR = "#ef4444";    // 红色 - 上涨
const DOWN_COLOR = "#22c55e";  // 绿色 - 下跌
const NEUTRAL_COLOR = "#9ca3af"; // 灰色 - 持平

interface PriceChangeAnalysisProps {
  // 可选的外部控制
  initialStartSnapshotId?: number;
  initialEndSnapshotId?: number;
}

export default function PriceChangeAnalysis({
  initialStartSnapshotId,
  initialEndSnapshotId,
}: PriceChangeAnalysisProps) {
  // 状态管理
  const [startSnapshotId, setStartSnapshotId] = useState<number | null>(initialStartSnapshotId || null);
  const [endSnapshotId, setEndSnapshotId] = useState<number | null>(initialEndSnapshotId || null);
  const [currency, setCurrency] = useState<string>("CNY");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"changePercent" | "change">("changePercent");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // 获取快捷时间范围和快照列表
  const { data: quickRangesData, isLoading: isLoadingRanges } = trpc.priceChange.quickRanges.useQuery();

  // 获取类别列表
  const { data: categories } = trpc.categories.list.useQuery();

  // 获取涨跌分析数据
  const { data: analysisData, isLoading: isLoadingAnalysis, refetch: refetchAnalysis } = trpc.priceChange.analysis.useQuery(
    {
      startSnapshotId: startSnapshotId!,
      endSnapshotId: endSnapshotId!,
      currency,
      categoryFilter: categoryFilter === "all" ? undefined : categoryFilter,
    },
    {
      enabled: startSnapshotId !== null && endSnapshotId !== null,
    }
  );

  // 初始化默认时间范围
  useEffect(() => {
    if (quickRangesData?.ranges && quickRangesData.ranges.length > 0 && !startSnapshotId) {
      // 默认选择"最近一周"
      const defaultRange = quickRangesData.ranges[0];
      if (defaultRange.startSnapshotId) {
        setStartSnapshotId(defaultRange.startSnapshotId);
        setEndSnapshotId(defaultRange.endSnapshotId);
      }
    }
  }, [quickRangesData, startSnapshotId]);

  // 格式化金额
  const formatCurrency = (value: number, currencyCode: string = currency) => {
    const symbol = currencyCode === "USD" ? "$" : "¥";
    if (Math.abs(value) >= 10000) {
      return `${symbol}${(value / 10000).toFixed(2)}万`;
    }
    return `${symbol}${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
  };

  // 格式化百分比
  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  // 获取涨跌颜色
  const getChangeColor = (change: number) => {
    if (change > 0) return UP_COLOR;
    if (change < 0) return DOWN_COLOR;
    return NEUTRAL_COLOR;
  };

  // 获取涨跌图标
  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="w-4 h-4" style={{ color: UP_COLOR }} />;
    if (change < 0) return <ArrowDownRight className="w-4 h-4" style={{ color: DOWN_COLOR }} />;
    return <Minus className="w-4 h-4" style={{ color: NEUTRAL_COLOR }} />;
  };

  // 处理快捷范围选择
  const handleQuickRangeSelect = (rangeLabel: string) => {
    const range = quickRangesData?.ranges.find(r => r.label === rangeLabel);
    if (range && range.startSnapshotId) {
      setStartSnapshotId(range.startSnapshotId);
      setEndSnapshotId(range.endSnapshotId);
    }
  };

  // 排序后的资产数据
  const sortedAssetChanges = useMemo(() => {
    if (!analysisData?.assetChanges) return [];
    
    const data = [...analysisData.assetChanges];
    data.sort((a, b) => {
      const aValue = sortBy === "changePercent" ? a.changePercent : a.change;
      const bValue = sortBy === "changePercent" ? b.changePercent : b.change;
      return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
    });
    return data;
  }, [analysisData?.assetChanges, sortBy, sortOrder]);

  // 涨跌贡献度图表数据
  const contributionChartData = useMemo(() => {
    if (!analysisData?.assetChanges) return [];
    
    return analysisData.assetChanges
      .filter(a => a.change !== 0)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 10)
      .map(a => ({
        name: a.assetName,
        value: a.change,
        color: a.change > 0 ? UP_COLOR : DOWN_COLOR,
        categoryColor: CATEGORY_COLORS[a.categoryName] || "#888888",
      }));
  }, [analysisData?.assetChanges]);

  // 涨跌分布饼图数据
  const distributionChartData = useMemo(() => {
    if (!analysisData?.statistics) return [];
    
    return [
      { name: "上涨", value: analysisData.statistics.upCount, color: UP_COLOR },
      { name: "下跌", value: analysisData.statistics.downCount, color: DOWN_COLOR },
      { name: "持平", value: analysisData.statistics.unchangedCount, color: NEUTRAL_COLOR },
    ].filter(d => d.value > 0);
  }, [analysisData?.statistics]);

  // 导出Excel
  const handleExport = async () => {
    if (!startSnapshotId || !endSnapshotId) return;
    
    try {
      const response = await fetch(
        `/api/trpc/priceChange.exportExcel?input=${encodeURIComponent(JSON.stringify({
          startSnapshotId,
          endSnapshotId,
          currency,
        }))}`
      );
      const result = await response.json();
      
      if (result.result?.data?.success && result.result?.data?.data) {
        const link = document.createElement("a");
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.result.data.data}`;
        link.download = result.result.data.filename || "price_change.xlsx";
        link.click();
      }
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  // 加载中状态
  if (isLoadingRanges) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 时间对比选择器 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* 快捷选项 */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">快捷选项：</span>
              <div className="flex flex-wrap gap-2">
                {quickRangesData?.ranges.map((range) => (
                  <Button
                    key={range.label}
                    variant={
                      startSnapshotId === range.startSnapshotId && endSnapshotId === range.endSnapshotId
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => handleQuickRangeSelect(range.label)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 自定义时间范围 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">自定义：</span>
              <Select
                value={startSnapshotId?.toString() || ""}
                onValueChange={(v) => setStartSnapshotId(parseInt(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="起始" />
                </SelectTrigger>
                <SelectContent>
                  {quickRangesData?.snapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">→</span>
              <Select
                value={endSnapshotId?.toString() || ""}
                onValueChange={(v) => setEndSnapshotId(parseInt(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="结束" />
                </SelectTrigger>
                <SelectContent>
                  {quickRangesData?.snapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 刷新和导出按钮 */}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchAnalysis()}
                disabled={isLoadingAnalysis}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingAnalysis ? "animate-spin" : ""}`} />
                刷新
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!analysisData?.success}
              >
                <Download className="w-4 h-4 mr-1" />
                导出
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 涨跌概览卡片 */}
      {analysisData?.success && analysisData?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 期初总资产 */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">期初总资产</div>
              <div className="text-xl font-bold">
                {formatCurrency(analysisData.summary.startTotal)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {analysisData.summary.startSnapshot.label}
              </div>
            </CardContent>
          </Card>

          {/* 期末总资产 */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">期末总资产</div>
              <div className="text-xl font-bold">
                {formatCurrency(analysisData.summary.endTotal)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {analysisData.summary.endSnapshot.label}
              </div>
            </CardContent>
          </Card>

          {/* 涨跌额 */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">涨跌额</div>
              <div
                className="text-xl font-bold flex items-center gap-1"
                style={{ color: getChangeColor(analysisData.summary.totalChange) }}
              >
                {getChangeIcon(analysisData.summary.totalChange)}
                {formatCurrency(Math.abs(analysisData.summary.totalChange))}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {analysisData.summary.daysDiff}天
              </div>
            </CardContent>
          </Card>

          {/* 涨跌幅 */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">涨跌幅</div>
              <div
                className="text-xl font-bold flex items-center gap-1"
                style={{ color: getChangeColor(analysisData.summary.totalChangePercent) }}
              >
                {analysisData.summary.totalChangePercent > 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : analysisData.summary.totalChangePercent < 0 ? (
                  <TrendingDown className="w-5 h-5" />
                ) : null}
                {formatPercent(analysisData.summary.totalChangePercent)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                相对变化
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 图表区域 */}
      {analysisData?.success && analysisData?.topGainers && analysisData?.topLosers && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 涨跌贡献度图表 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                涨跌贡献度（按资产）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={contributionChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => formatCurrency(value)}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={75}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "涨跌额"]}
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {contributionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 涨跌排行榜 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                涨跌排行榜
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* 涨幅前5 */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">涨幅前5</div>
                  <div className="space-y-2">
                    {analysisData.topGainers.slice(0, 5).map((asset, index) => (
                      <div
                        key={asset.assetId}
                        className="flex items-center justify-between p-2 rounded-lg"
                        style={{ backgroundColor: `${UP_COLOR}10` }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground w-4">
                            {index + 1}
                          </span>
                          <span className="font-medium text-sm">{asset.assetName}</span>
                          <span className="text-xs text-muted-foreground">
                            {asset.categoryName}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm" style={{ color: UP_COLOR }}>
                            {formatCurrency(asset.change)}
                          </div>
                          <div className="text-xs" style={{ color: UP_COLOR }}>
                            {formatPercent(asset.changePercent)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {analysisData.topGainers.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        暂无上涨资产
                      </div>
                    )}
                  </div>
                </div>

                {/* 跌幅前5 */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">跌幅前5</div>
                  <div className="space-y-2">
                    {analysisData.topLosers.slice(0, 5).map((asset, index) => (
                      <div
                        key={asset.assetId}
                        className="flex items-center justify-between p-2 rounded-lg"
                        style={{ backgroundColor: `${DOWN_COLOR}10` }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground w-4">
                            {index + 1}
                          </span>
                          <span className="font-medium text-sm">{asset.assetName}</span>
                          <span className="text-xs text-muted-foreground">
                            {asset.categoryName}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm" style={{ color: DOWN_COLOR }}>
                            {formatCurrency(asset.change)}
                          </div>
                          <div className="text-xs" style={{ color: DOWN_COLOR }}>
                            {formatPercent(asset.changePercent)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {analysisData.topLosers.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        暂无下跌资产
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 涨跌分布统计 */}
      {analysisData?.success && analysisData?.statistics && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              涨跌分布统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* 饼图 */}
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={distributionChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {distributionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value}个资产`,
                        name,
                      ]}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              {/* 统计数据 */}
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: `${UP_COLOR}10` }}>
                  <div className="text-2xl font-bold" style={{ color: UP_COLOR }}>
                    {analysisData.statistics.upCount}
                  </div>
                  <div className="text-sm text-muted-foreground">上涨资产</div>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: `${DOWN_COLOR}10` }}>
                  <div className="text-2xl font-bold" style={{ color: DOWN_COLOR }}>
                    {analysisData.statistics.downCount}
                  </div>
                  <div className="text-sm text-muted-foreground">下跌资产</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-gray-100">
                  <div className="text-2xl font-bold text-gray-500">
                    {analysisData.statistics.unchangedCount}
                  </div>
                  <div className="text-sm text-muted-foreground">持平资产</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 资产涨跌明细表 */}
      {analysisData?.success && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-base flex items-center gap-2">
                <TableIcon className="w-4 h-4" />
                资产涨跌明细
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {/* 类别筛选 */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="全部类别" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类别</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 排序方式 */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="changePercent">按涨跌幅</SelectItem>
                    <SelectItem value="change">按涨跌额</SelectItem>
                  </SelectContent>
                </Select>

                {/* 排序顺序 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                >
                  {sortOrder === "desc" ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      资产名称
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      类别
                    </th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                      期初价值
                    </th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                      期末价值
                    </th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                      涨跌额
                    </th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                      涨跌幅
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAssetChanges.map((asset) => (
                    <tr key={asset.assetId} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{asset.assetName}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: CATEGORY_COLORS[asset.categoryName] || "#888",
                            }}
                          />
                          <span className="text-sm">{asset.categoryName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">{formatCurrency(asset.startValue)}</td>
                      <td className="p-3 text-right">{formatCurrency(asset.endValue)}</td>
                      <td
                        className="p-3 text-right font-medium"
                        style={{ color: getChangeColor(asset.change) }}
                      >
                        {asset.change >= 0 ? "+" : ""}
                        {formatCurrency(asset.change)}
                      </td>
                      <td
                        className="p-3 text-right font-medium"
                        style={{ color: getChangeColor(asset.changePercent) }}
                      >
                        {formatPercent(asset.changePercent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sortedAssetChanges.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 加载中或无数据提示 */}
      {isLoadingAnalysis && (
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">分析中...</span>
        </div>
      )}

      {!isLoadingAnalysis && !analysisData?.success && startSnapshotId && endSnapshotId && (
        <div className="text-center py-8 text-muted-foreground">
          {analysisData?.message || "请选择时间范围进行分析"}
        </div>
      )}
    </div>
  );
}
