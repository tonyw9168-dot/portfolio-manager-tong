import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { DataOperationDialog, DeleteConfirmDialog } from "@/components/DataOperationDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORY_COLORS: Record<string, string> = {
  "美股": "#f59e0b",
  "A+H股": "#3b82f6",
  "日股": "#8b5cf6",
  "黄金": "#eab308",
  "虚拟货币": "#10b981",
  "现金": "#6b7280",
};

export default function DashboardEnhanced() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const { data: dashboardData } = trpc.dashboard.overview.useQuery();
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

  // 准备饼图数据
  const pieData = useMemo(() => {
    if (!dashboardData?.categoryTotals) return [];
    return dashboardData.categoryTotals.map((cat: any) => ({
      name: cat.name,
      value: Number(cat.total || 0),
      color: CATEGORY_COLORS[cat.name] || "#888888",
    }));
  }, [dashboardData]);

  // 准备趋势图数据
  const trendData = useMemo(() => {
    if (!sortedSnapshots.length || !assetValues || !categories) return [];

    return sortedSnapshots.map((snapshot) => {
      const date = new Date(snapshot.snapshotDate);
      const dateLabel = `${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;

      const dataPoint: Record<string, unknown> = {
        date: dateLabel,
        fullDate: snapshot.snapshotDate,
      };

      let total = 0;
      categories.forEach((cat: any) => {
        const catAssets = assetValues.filter(
          (av: any) => av.snapshotId === snapshot.id && av.categoryId === cat.id
        );
        const catTotal = catAssets.reduce(
          (sum: number, av: any) => sum + Number(av.cnyValue || 0),
          0
        );
        dataPoint[cat.name] = catTotal;
        total += catTotal;
      });

      dataPoint.total = total;
      return dataPoint;
    });
  }, [sortedSnapshots, assetValues, categories]);

  // 格式化金额
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 10000) {
      return `¥${(value / 10000).toFixed(2)}万`;
    }
    return `¥${value.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
  };

  // 格式化百分比
  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const handleAddAsset = async (data: Record<string, any>) => {
    try {
      // 这里调用API添加资产
      console.log("Adding asset:", data);
      // await trpc.assets.create.mutate(data);
      // 重新获取数据
    } catch (error) {
      console.error("Error adding asset:", error);
    }
  };

  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;
    try {
      // 这里调用API删除资产
      console.log("Deleting asset:", selectedAsset);
      // await trpc.assets.delete.mutate(selectedAsset.id);
      setSelectedAsset(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting asset:", error);
    }
  };

  if (!dashboardData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题和操作按钮 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">投资组合概览</h1>
            <p className="text-sm text-muted-foreground mt-1">
              最新数据: {dashboardData.latestDate}
            </p>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            新增资产
          </Button>
        </div>

        {/* 关键指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                总资产
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(dashboardData.totalValue)}
              </div>
              <p className={`text-xs mt-1 ${
                dashboardData.changePercent >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}>
                {formatPercent(dashboardData.changePercent)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                本期增减
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                dashboardData.changeAmount >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}>
                {formatCurrency(dashboardData.changeAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {dashboardData.changeAmount >= 0 ? "增加" : "减少"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                资产类别
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {dashboardData.categoryTotals?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">个</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                数据快照
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {sortedSnapshots.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">次</p>
            </CardContent>
          </Card>
        </div>

        {/* 资产配置和趋势图 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 资产配置饼图 */}
          <Card>
            <CardHeader>
              <CardTitle>资产配置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 资产趋势图 */}
          <Card>
            <CardHeader>
              <CardTitle>资产走势</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    {categories?.map((cat: any) => (
                      <Line
                        key={cat.name}
                        type="monotone"
                        dataKey={cat.name}
                        stroke={CATEGORY_COLORS[cat.name] || "#888888"}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 类别详情表格 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>各类别详情</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">类别</th>
                    <th className="text-right py-2 px-4">金额</th>
                    <th className="text-right py-2 px-4">占比</th>
                    <th className="text-right py-2 px-4">变化</th>
                    <th className="text-center py-2 px-4">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.categoryTotals?.map((cat: any) => (
                    <tr key={cat.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                CATEGORY_COLORS[cat.name] || "#888888",
                            }}
                          />
                          {cat.name}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatCurrency(cat.total)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {((cat.total / dashboardData.totalValue) * 100).toFixed(
                          2
                        )}
                        %
                      </td>
                      <td className={`text-right py-3 px-4 ${
                        cat.changePercent >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}>
                        {formatPercent(cat.changePercent)}
                      </td>
                      <td className="text-center py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit2 className="w-4 h-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedAsset(cat);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 添加资产对话框 */}
        <DataOperationDialog
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          title="新增资产"
          description="添加新的投资资产到您的投资组合"
          fields={[
            {
              name: "category",
              label: "资产类别",
              type: "select",
              required: true,
              options: categories?.map((c: any) => ({
                label: c.name,
                value: c.id.toString(),
              })) || [],
            },
            {
              name: "name",
              label: "资产名称",
              type: "text",
              required: true,
            },
            {
              name: "value",
              label: "当前价值",
              type: "number",
              required: true,
            },
            {
              name: "description",
              label: "备注",
              type: "textarea",
            },
          ]}
          onSubmit={handleAddAsset}
        />

        {/* 删除确认对话框 */}
        <DeleteConfirmDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title="删除资产"
          description={`确定要删除"${selectedAsset?.name}"吗？此操作无法撤销。`}
          onConfirm={handleDeleteAsset}
        />
      </div>
    </Layout>
  );
}
