import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { trpc } from "@/lib/trpc";
import { Plus, ArrowUpRight, ArrowDownLeft, Trash2, Edit2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatCurrency(value: number | string | null): string {
  if (value === null || value === undefined) return "¥0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "¥0.00";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(num);
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function CashFlowEnhanced() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [formData, setFormData] = useState({
    flowDate: new Date().toISOString().split("T")[0],
    flowType: "inflow" as "inflow" | "outflow",
    sourceAccount: "",
    targetAccount: "",
    assetName: "",
    originalAmount: "",
    currency: "CNY",
    description: "",
  });

  const { data: cashFlows, isLoading, refetch } = trpc.cashFlows.list.useQuery();
  const { data: exchangeRates } = trpc.exchangeRates.list.useQuery();
  const addMutation = trpc.cashFlows.add.useMutation();
  const updateMutation = trpc.cashFlows.update.useMutation();
  const deleteMutation = trpc.cashFlows.delete.useMutation();

  const getExchangeRate = (currency: string): number => {
    if (currency === "CNY") return 1;
    const rate = exchangeRates?.find((r) => r.fromCurrency === currency);
    return rate ? parseFloat(rate.rate?.toString() || "1") : 1;
  };

  const handleOpenDialog = (flow?: any) => {
    if (flow) {
      setIsEditMode(true);
      setSelectedFlow(flow);
      setFormData({
        flowDate: flow.flowDate,
        flowType: flow.flowType,
        sourceAccount: flow.sourceAccount || "",
        targetAccount: flow.targetAccount || "",
        assetName: flow.assetName || "",
        originalAmount: flow.originalAmount?.toString() || "",
        currency: flow.currency || "CNY",
        description: flow.description || "",
      });
    } else {
      setIsEditMode(false);
      setSelectedFlow(null);
      setFormData({
        flowDate: new Date().toISOString().split("T")[0],
        flowType: "inflow",
        sourceAccount: "",
        targetAccount: "",
        assetName: "",
        originalAmount: "",
        currency: "CNY",
        description: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setSelectedFlow(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rate = getExchangeRate(formData.currency);
    const originalAmount = parseFloat(formData.originalAmount);
    const cnyAmount = originalAmount * rate;

    if (!formData.flowDate || !formData.originalAmount) {
      toast.error("请填写必要字段");
      return;
    }

    try {
      if (isEditMode && selectedFlow) {
        await updateMutation.mutateAsync({
          id: selectedFlow.id,
          flowDate: formData.flowDate,
          flowType: formData.flowType,
          sourceAccount: formData.sourceAccount,
          targetAccount: formData.targetAccount,
          assetName: formData.assetName,
          originalAmount: originalAmount,
          currency: formData.currency,
          cnyAmount: cnyAmount,
          description: formData.description,
        });
        toast.success("现金流更新成功");
        refetch();
        handleCloseDialog();
      } else {
        await addMutation.mutateAsync({
          flowDate: formData.flowDate,
          flowType: formData.flowType,
          sourceAccount: formData.sourceAccount,
          targetAccount: formData.targetAccount,
          assetName: formData.assetName,
          originalAmount: originalAmount,
          currency: formData.currency,
          cnyAmount: cnyAmount,
          description: formData.description,
        });
        toast.success("现金流添加成功");
        refetch();
        handleCloseDialog();
      }
    } catch (error) {
      toast.error("操作失败，请重试");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!selectedFlow) return;
    try {
      await deleteMutation.mutateAsync({ id: selectedFlow.id });
      toast.success("现金流删除成功");
      refetch();
      setIsDeleteDialogOpen(false);
      setSelectedFlow(null);
    } catch (error) {
      toast.error("删除失败，请重试");
      console.error(error);
    }
  };

  const totalInflow = cashFlows
    ?.filter((cf) => cf.flowType === "inflow")
    .reduce((sum, cf) => sum + Number(cf.cnyAmount || 0), 0) || 0;

  const totalOutflow = cashFlows
    ?.filter((cf) => cf.flowType === "outflow")
    .reduce((sum, cf) => sum + Number(cf.cnyAmount || 0), 0) || 0;

  const netFlow = totalInflow - totalOutflow;

  if (isLoading) {
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">现金流管理</h1>
            <p className="text-muted-foreground mt-1">
              记录和管理投资的现金流入和流出
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            新增现金流
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-green-500" />
                总流入
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalInflow)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-red-500" />
                总流出
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalOutflow)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                净流量
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(netFlow)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow List */}
        <Card>
          <CardHeader>
            <CardTitle>现金流记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">日期</th>
                    <th className="text-left py-3 px-4">类型</th>
                    <th className="text-left py-3 px-4">资产/账户</th>
                    <th className="text-right py-3 px-4">金额</th>
                    <th className="text-left py-3 px-4">备注</th>
                    <th className="text-center py-3 px-4">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlows && cashFlows.length > 0 ? (
                    cashFlows.map((flow) => (
                      <tr key={flow.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{formatDate(flow.flowDate)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {flow.flowType === "inflow" ? (
                              <>
                                <ArrowUpRight className="w-4 h-4 text-green-500" />
                                <span className="text-green-600">流入</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownLeft className="w-4 h-4 text-red-500" />
                                <span className="text-red-600">流出</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {flow.assetName || flow.sourceAccount || flow.targetAccount || "-"}
                        </td>
                        <td className={`text-right py-3 px-4 font-medium ${
                          flow.flowType === "inflow" ? "text-green-600" : "text-red-600"
                        }`}>
                          {flow.flowType === "inflow" ? "+" : "-"}
                          {formatCurrency(flow.cnyAmount)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {flow.description || "-"}
                        </td>
                        <td className="text-center py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleOpenDialog(flow)}
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedFlow(flow);
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        暂无现金流记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? "编辑现金流" : "新增现金流"}
              </DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "修改现金流记录"
                  : "添加新的现金流入或流出记录"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="flowDate">日期</Label>
                  <Input
                    id="flowDate"
                    type="date"
                    value={formData.flowDate}
                    onChange={(e) =>
                      setFormData({ ...formData, flowDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="flowType">类型</Label>
                  <Select
                    value={formData.flowType}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        flowType: value as "inflow" | "outflow",
                      })
                    }
                  >
                    <SelectTrigger id="flowType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inflow">流入</SelectItem>
                      <SelectItem value="outflow">流出</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="originalAmount">金额</Label>
                  <Input
                    id="originalAmount"
                    type="number"
                    step="0.01"
                    value={formData.originalAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        originalAmount: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="currency">币种</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNY">人民币 (CNY)</SelectItem>
                      <SelectItem value="USD">美元 (USD)</SelectItem>
                      <SelectItem value="HKD">港币 (HKD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assetName">资产名称</Label>
                  <Input
                    id="assetName"
                    value={formData.assetName}
                    onChange={(e) =>
                      setFormData({ ...formData, assetName: e.target.value })
                    }
                    placeholder="如: 谷歌股票"
                  />
                </div>
                <div>
                  <Label htmlFor="sourceAccount">来源账户</Label>
                  <Input
                    id="sourceAccount"
                    value={formData.sourceAccount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sourceAccount: e.target.value,
                      })
                    }
                    placeholder="如: 工商银行"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">备注</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="添加备注信息"
                  rows={3}
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
              <AlertDialogTitle>删除现金流</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除这条现金流记录吗？此操作无法撤销。
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
