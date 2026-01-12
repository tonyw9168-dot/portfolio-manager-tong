import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Plus, Edit2, Trash2, Target, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  "美股": "#f59e0b",
  "A+H股": "#3b82f6",
  "日股": "#8b5cf6",
  "黄金": "#eab308",
  "虚拟货币": "#10b981",
  "现金": "#6b7280",
};

export default function PortfolioPlanningEnhanced() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    suggestedRatio: "",
  });

  const { data: categories, refetch } = trpc.categories.list.useQuery();

  const handleOpenDialog = (category?: any) => {
    if (category) {
      setIsEditMode(true);
      setSelectedCategory(category);
      setFormData({
        name: category.name,
        suggestedRatio: (Number(category.suggestedRatio || 0) * 100).toString(),
      });
    } else {
      setIsEditMode(false);
      setSelectedCategory(null);
      setFormData({
        name: "",
        suggestedRatio: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setSelectedCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.suggestedRatio) {
      toast.error("请填写所有必要字段");
      return;
    }

    try {
      const ratio = parseFloat(formData.suggestedRatio) / 100;
      
      if (isEditMode && selectedCategory) {
        toast.info("编辑功能开发中");
      } else {
        toast.info("新增类别功能开发中");
      }
      
      handleCloseDialog();
    } catch (error) {
      toast.error("操作失败，请重试");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    try {
      toast.info("删除功能开发中");
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      toast.error("删除失败，请重试");
      console.error(error);
    }
  };

  // 准备饼图数据
  const pieData = categories?.map((cat: any) => ({
    name: cat.name,
    value: Number(cat.suggestedRatio || 0) * 100,
    color: CATEGORY_COLORS[cat.name] || "#888888",
  })) || [];

  // 验证比例总和
  const totalRatio = pieData.reduce((sum, item) => sum + item.value, 0);
  const isBalanced = Math.abs(totalRatio - 100) < 0.01;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              配置规划
            </h1>
            <p className="text-muted-foreground mt-1">
              设置和管理您的投资配置目标
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            新增类别
          </Button>
        </div>

        {/* Status Card */}
        <Card className={isBalanced ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">配置平衡状态</p>
                <p className={`text-lg font-bold mt-1 ${
                  isBalanced ? "text-green-600" : "text-yellow-600"
                }`}>
                  {isBalanced ? "✓ 配置均衡" : "⚠ 配置不均衡"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">总配置比例</p>
                <p className={`text-2xl font-bold ${
                  isBalanced ? "text-green-600" : "text-yellow-600"
                }`}>
                  {totalRatio.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>配置分布</CardTitle>
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
                      label={({ name, value }) => `${name} ${value.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Details */}
          <Card>
            <CardHeader>
              <CardTitle>配置详情</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categories && categories.length > 0 ? (
                  categories.map((cat: any) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              CATEGORY_COLORS[cat.name] || "#888888",
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {cat.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            建议配置比例
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold text-foreground">
                          {(Number(cat.suggestedRatio || 0) * 100).toFixed(1)}%
                        </p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleOpenDialog(cat)}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedCategory(cat);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无配置数据
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>配置建议</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isBalanced ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ 您的投资配置已达到平衡状态，总比例为 100%。建议定期检查实际配置与目标配置的偏差。
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠ 您的配置比例总和为 {totalRatio.toFixed(1)}%，与 100% 相差 {Math.abs(100 - totalRatio).toFixed(1)}%。
                    请调整各类别的配置比例以达到平衡。
                  </p>
                </div>
              )}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 建议：定期审查您的投资配置，确保与目标配置保持一致。当实际配置与目标配置偏差超过 5% 时，
                  应考虑进行再平衡操作。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? "编辑配置类别" : "新增配置类别"}
              </DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "修改资产类别的配置比例"
                  : "添加新的资产类别到您的投资配置"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">类别名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="如: 美股"
                  disabled={isEditMode}
                />
              </div>
              <div>
                <Label htmlFor="suggestedRatio">配置比例 (%)</Label>
                <Input
                  id="suggestedRatio"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.suggestedRatio}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      suggestedRatio: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  取消
                </Button>
                <Button type="submit">
                  {isEditMode ? "更新" : "添加"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除配置类别</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除"{selectedCategory?.name}"吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
