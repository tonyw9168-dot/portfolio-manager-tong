import { useState, useMemo, useCallback } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Filter, Search, Plus, Pencil, Trash2, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// 汇率配置
const EXCHANGE_RATES: Record<string, number> = {
  CNY: 1,
  USD: 7.25,
  HKD: 0.93,
  EUR: 7.85,
  GBP: 9.15,
  JPY: 0.048,
};

type CurrencyDisplay = "CNY" | "USD";

function formatCurrency(value: number | string | null, currency: CurrencyDisplay = "CNY"): string {
  if (value === null || value === undefined) return currency === "CNY" ? "¥0.00" : "$0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return currency === "CNY" ? "¥0.00" : "$0.00";
  
  if (currency === "USD") {
    const usdValue = num / EXCHANGE_RATES.USD;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(usdValue);
  }
  
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(num);
}

interface AssetFormData {
  assetName: string;
  categoryId: string;
  originalValue: string;
  originalCurrency: string;
  notes: string;
}

const initialFormData: AssetFormData = {
  assetName: "",
  categoryId: "",
  originalValue: "",
  originalCurrency: "CNY",
  notes: "",
};

export default function Holdings() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSnapshot, setSelectedSnapshot] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyDisplay>("CNY");
  
  // 编辑相关状态
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [formData, setFormData] = useState<AssetFormData>(initialFormData);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: snapshots } = trpc.snapshots.list.useQuery();
  const { data: assetValues, isLoading, refetch } = trpc.assetValues.list.useQuery({
    categoryId: selectedCategory !== "all" ? parseInt(selectedCategory) : undefined,
    snapshotId: selectedSnapshot !== "all" ? parseInt(selectedSnapshot) : undefined,
  });

  // 资产CRUD操作
  const createAssetMutation = trpc.assets.create.useMutation({
    onSuccess: () => {
      toast.success("资产添加成功");
      refetch();
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });

  const updateAssetMutation = trpc.assets.update.useMutation({
    onSuccess: () => {
      toast.success("资产更新成功");
      refetch();
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const deleteAssetMutation = trpc.assets.delete.useMutation({
    onSuccess: () => {
      toast.success("资产删除成功");
      refetch();
      setDeleteConfirmId(null);
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const filteredData = useMemo(() => {
    if (!assetValues) return [];
    
    let data = [...assetValues];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (item) =>
          item.assetName?.toLowerCase().includes(term) ||
          item.categoryName?.toLowerCase().includes(term)
      );
    }
    
    // Group by category
    const grouped: Record<string, typeof data> = {};
    data.forEach((item) => {
      const category = item.categoryName || "其他";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    });
    
    return grouped;
  }, [assetValues, searchTerm]);

  const formatSnapshotLabel = (label: string) => {
    const month = label.substring(0, 2);
    const day = label.substring(2, 4);
    return `${month}月${day}日`;
  };

  const handleOpenDialog = useCallback((asset?: any) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        assetName: asset.assetName || "",
        categoryId: asset.categoryId?.toString() || "",
        originalValue: asset.cnyValue?.toString() || "",
        originalCurrency: asset.originalCurrency || "CNY",
        notes: asset.notes || "",
      });
    } else {
      setEditingAsset(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingAsset(null);
    setFormData(initialFormData);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formData.assetName.trim()) {
      toast.error("请输入资产名称");
      return;
    }

    const originalValue = parseFloat(formData.originalValue) || 0;
    const rate = EXCHANGE_RATES[formData.originalCurrency] || 1;
    const cnyValue = originalValue * rate;

    const data = {
      assetName: formData.assetName.trim(),
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : undefined,
      cnyValue,
      originalValue,
      originalCurrency: formData.originalCurrency,
      notes: formData.notes.trim(),
    };

    if (editingAsset) {
      updateAssetMutation.mutate({ id: editingAsset.id, ...data });
    } else {
      createAssetMutation.mutate(data);
    }
  }, [formData, editingAsset, createAssetMutation, updateAssetMutation]);

  const handleDelete = useCallback((id: number) => {
    setDeleteConfirmId(id);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      deleteAssetMutation.mutate({ id: deleteConfirmId });
    }
  }, [deleteConfirmId, deleteAssetMutation]);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">持仓明细</h1>
            <p className="text-muted-foreground mt-1">查看和管理您的投资组合详情</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            添加资产
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索资产名称..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* 货币切换 */}
                <Select value={displayCurrency} onValueChange={(v) => setDisplayCurrency(v as CurrencyDisplay)}>
                  <SelectTrigger className="w-[120px]">
                    <DollarSign className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="币种" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CNY">人民币 ¥</SelectItem>
                    <SelectItem value="USD">美元 $</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="资产类别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类别</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedSnapshot} onValueChange={setSelectedSnapshot}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="时间点" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部时间</SelectItem>
                    {snapshots?.map((snap) => (
                      <SelectItem key={snap.id} value={snap.id.toString()}>
                        {formatSnapshotLabel(snap.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSelectedSnapshot("all");
                    setSearchTerm("");
                  }}
                >
                  重置
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 货币提示 */}
        {displayCurrency === "USD" && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            当前以美元显示，汇率：1 USD = {EXCHANGE_RATES.USD} CNY（仅供参考）
          </div>
        )}

        {/* Data Table */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ) : Object.keys(filteredData).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">暂无数据</h3>
              <p className="text-muted-foreground text-center mb-4">
                请先导入Excel数据或添加资产
              </p>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                添加资产
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(filteredData).map(([category, items]) => (
            <Card key={category} className="overflow-hidden">
              <CardHeader className="bg-muted/30 py-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  {category}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({items.length} 项)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>标的名称</th>
                        <th>时间点</th>
                        <th className="text-right">{displayCurrency === "CNY" ? "人民币价值" : "美元价值"}</th>
                        <th className="text-right">期末变动</th>
                        <th className="text-right">占比</th>
                        <th className="text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const change = parseFloat(item.changeFromPrevious?.toString() || "0");
                        const ratio = parseFloat(item.currentRatio?.toString() || "0") * 100;
                        return (
                          <tr key={item.id}>
                            <td className="font-medium">{item.assetName}</td>
                            <td className="text-muted-foreground">
                              {item.snapshotLabel ? formatSnapshotLabel(item.snapshotLabel) : "-"}
                            </td>
                            <td className="text-right font-mono">
                              {formatCurrency(item.cnyValue, displayCurrency)}
                            </td>
                            <td className={`text-right font-mono ${
                              change > 0 ? "number-positive" : change < 0 ? "number-negative" : ""
                            }`}>
                              {change > 0 ? "+" : ""}{formatCurrency(change, displayCurrency)}
                            </td>
                            <td className="text-right text-muted-foreground">
                              {ratio > 0 ? `${ratio.toFixed(2)}%` : "-"}
                            </td>
                            <td className="text-center">
                              <div className="flex justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleOpenDialog(item)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* 添加/编辑资产对话框 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingAsset ? "编辑资产" : "添加资产"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="assetName">资产名称 *</Label>
                <Input
                  id="assetName"
                  value={formData.assetName}
                  onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                  placeholder="如：腾讯控股"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="categoryId">资产类别</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                >
                  <SelectTrigger>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="originalValue">金额</Label>
                  <Input
                    id="originalValue"
                    type="number"
                    value={formData.originalValue}
                    onChange={(e) => setFormData({ ...formData, originalValue: e.target.value })}
                    placeholder="如：100000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originalCurrency">币种</Label>
                  <Select
                    value={formData.originalCurrency}
                    onValueChange={(v) => setFormData({ ...formData, originalCurrency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNY">人民币 CNY</SelectItem>
                      <SelectItem value="USD">美元 USD</SelectItem>
                      <SelectItem value="HKD">港币 HKD</SelectItem>
                      <SelectItem value="EUR">欧元 EUR</SelectItem>
                      <SelectItem value="GBP">英镑 GBP</SelectItem>
                      <SelectItem value="JPY">日元 JPY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">备注</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="可选备注信息"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingAsset ? "保存" : "添加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              确定要删除这个资产吗？此操作无法撤销。
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                取消
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
