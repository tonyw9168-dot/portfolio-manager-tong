import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PriceChangeAnalysis from "@/components/PriceChangeAnalysis";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { 
  BarChart3, TrendingUp, TrendingDown, Layers, Grid3X3,
  ArrowUpRight, ArrowDownRight, Minus, ChevronDown, ChevronUp
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell, LineChart, Line
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  
  // 资产增删改状态
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAssetData, setNewAssetData] = useState({
    assetName: '',
    categoryId: 0,
    cnyValue: '',
    notes: ''
  });
  
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: snapshots } = trpc.snapshots.list.useQuery();
  const { data: assetValues, refetch: refetchAssetValues } = trpc.assetValues.list.useQuery();
  const { data: assets, refetch: refetchAssets } = trpc.assets.list.useQuery();
  
  // Mutation 钩子
  const deleteMutation = trpc.assets.delete.useMutation();
  const updateMutation = trpc.assets.update.useMutation();
  const createMutation = trpc.assets.create.useMutation();
  
  // 刷新所有数据
  const refetchAll = () => {
    refetchAssets();
    refetchAssetValues();
  };

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
        id: cat.id,
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
      categories?.forEach(cat => {
        const catAssets = assetValues?.filter(
          av => av.snapshotId === snapshot.id && av.categoryId === cat.id
        ) || [];
        const catTotal = catAssets.reduce((sum, av) => sum + Number(av.cnyValue || 0), 0);
        dataPoint[cat.name] = catTotal;
        total += catTotal;
      });
      
      dataPoint.total = total;
      return dataPoint;
    });
  }, [sortedSnapshots, assetValues, categories]);

  // 获取类别下的资产明细
  const getCategoryAssets = (categoryId: number) => {
    if (!assetValues || !assets || sortedSnapshots.length === 0) return [];
    
    const latestSnapshot = sortedSnapshots[sortedSnapshots.length - 1];
    const categoryAssets = assets.filter(a => a.categoryId === categoryId);
    
    return categoryAssets.map(asset => {
      const currentValue = assetValues.find(
        av => av.assetId === asset.id && av.snapshotId === latestSnapshot.id
      );
      
      const previousValue = sortedSnapshots.length > 1 
        ? assetValues.find(
            av => av.assetId === asset.id && av.snapshotId === sortedSnapshots[sortedSnapshots.length - 2].id
          )
        : null;
      
      const cnyValue = Number(currentValue?.cnyValue || 0);
      const prevCnyValue = Number(previousValue?.cnyValue || 0);
      const change = cnyValue - prevCnyValue;
      const changePercent = prevCnyValue > 0 ? (change / prevCnyValue) * 100 : 0;
      
      const totalCategoryValue = categoryAssets.reduce((sum, a) => {
        const av = assetValues.find(
          av => av.assetId === a.id && av.snapshotId === latestSnapshot.id
        );
        return sum + Number(av?.cnyValue || 0);
      }, 0);
      
      return {
        id: asset.id,
        name: asset.name,
        categoryId: asset.categoryId,
        value: cnyValue,
        change,
        changePercent,
        ratio: totalCategoryValue > 0 ? cnyValue / totalCategoryValue : 0,
        notes: asset.notes || ''
      };
    });
  };

  const toggleCategoryExpand = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  // 处理编辑资产
  const handleEditAsset = (asset: any) => {
    setEditingAsset({ ...asset });
    setIsEditDialogOpen(true);
  };

  // 处理删除资产
  const handleDeleteAsset = (asset: any) => {
    setAssetToDelete(asset);
    setIsDeleteDialogOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingAsset) return;
    try {
      await updateMutation.mutateAsync({
        id: editingAsset.id,
        assetName: editingAsset.name,
        categoryId: editingAsset.categoryId,
        notes: editingAsset.notes,
      });
      toast.success('资产已更新');
      setIsEditDialogOpen(false);
      setEditingAsset(null);
      refetchAll();
    } catch (error) {
      toast.error('更新失败');
      console.error(error);
    }
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!assetToDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: assetToDelete.id });
      toast.success('资产已删除');
      setIsDeleteDialogOpen(false);
      setAssetToDelete(null);
      refetchAll();
    } catch (error) {
      toast.error('删除失败');
      console.error(error);
    }
  };

  // 添加资产
  const handleAddAsset = async () => {
    if (!newAssetData.assetName) {
      toast.error('请输入资产名称');
      return;
    }
    try {
      await createMutation.mutateAsync({
        assetName: newAssetData.assetName,
        categoryId: newAssetData.categoryId || 1,
        cnyValue: newAssetData.cnyValue ? parseFloat(newAssetData.cnyValue) : undefined,
        notes: newAssetData.notes,
      });
      toast.success('资产已添加');
      setIsAddDialogOpen(false);
      setNewAssetData({ assetName: '', categoryId: 0, cnyValue: '', notes: '' });
      refetchAll();
    } catch (error) {
      toast.error('添加失败');
      console.error(error);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000) {
      return `¥${(value / 10000).toFixed(2)}万`;
    }
    return `¥${value.toFixed(2)}`;
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <Layout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">高级持仓分析</h1>
          <p className="text-muted-foreground mt-2">全局横向纵向数据对比分析</p>
        </div>
      </div>

      {/* 视图切换 */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="category">按类别</TabsTrigger>
          <TabsTrigger value="asset">按标的</TabsTrigger>
          <TabsTrigger value="time">按时间</TabsTrigger>
        </TabsList>

        {/* 按类别视图 */}
        <TabsContent value="category" className="space-y-6">
          <div className="grid gap-4">
            {categoryComparisonData.map((category) => {
              const isExpanded = expandedCategories.has(category.name);
              const categoryAssets = getCategoryAssets(category.id);
              
              return (
                <Card key={category.name} className="overflow-hidden">
                  <CardContent className="p-0">
                    <button
                      onClick={() => toggleCategoryExpand(category.name)}
                      className="w-full p-4 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <div>
                            <div className="font-semibold">{category.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(category.currentValue)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`text-sm font-medium ${
                            category.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatPercent(category.changePercent)}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
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
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
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
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={() => handleEditAsset(asset)}
                                        title="编辑"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                        onClick={() => handleDeleteAsset(asset)}
                                        title="删除"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
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

          {/* 新增资产按钮 */}
          <div className="mt-6">
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增资产
            </Button>
          </div>
        </TabsContent>

        {/* 按标的视图 */}
        <TabsContent value="asset" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>按标的分析</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground text-center py-8">
                按标的视图开发中...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 按时间视图 */}
        <TabsContent value="time" className="space-y-4">
          {/* 涨跌分析组件 */}
          <PriceChangeAnalysis />
          
          <Card>
            <CardHeader>
              <CardTitle>各类别历史趋势</CardTitle>
            </CardHeader>
            <CardContent>
              {timeComparisonData.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {categories?.map((cat) => (
                      <Line
                        key={cat.id}
                        type="monotone"
                        dataKey={cat.name}
                        stroke={CATEGORY_COLORS[cat.name] || "#888888"}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 编辑资产对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑资产</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">资产名称</Label>
              <Input
                id="edit-name"
                value={editingAsset?.name || ''}
                onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                placeholder="输入资产名称"
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">备注</Label>
              <Input
                id="edit-notes"
                value={editingAsset?.notes || ''}
                onChange={(e) => setEditingAsset({ ...editingAsset, notes: e.target.value })}
                placeholder="输入备注"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除资产 "{assetToDelete?.name}" 吗？此操作无法撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增资产对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增资产</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-name">资产名称</Label>
              <Input
                id="add-name"
                value={newAssetData.assetName}
                onChange={(e) => setNewAssetData({ ...newAssetData, assetName: e.target.value })}
                placeholder="输入资产名称"
              />
            </div>
            <div>
              <Label htmlFor="add-category">类别</Label>
              <Select 
                value={newAssetData.categoryId.toString()} 
                onValueChange={(v) => setNewAssetData({ ...newAssetData, categoryId: parseInt(v) })}
              >
                <SelectTrigger id="add-category">
                  <SelectValue placeholder="选择类别" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="add-value">金额 (CNY)</Label>
              <Input
                id="add-value"
                type="number"
                value={newAssetData.cnyValue}
                onChange={(e) => setNewAssetData({ ...newAssetData, cnyValue: e.target.value })}
                placeholder="输入金额"
              />
            </div>
            <div>
              <Label htmlFor="add-notes">备注</Label>
              <Input
                id="add-notes"
                value={newAssetData.notes}
                onChange={(e) => setNewAssetData({ ...newAssetData, notes: e.target.value })}
                placeholder="输入备注"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddAsset}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}
