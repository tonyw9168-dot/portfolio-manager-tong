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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

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

export default function CashFlow() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
  const deleteMutation = trpc.cashFlows.delete.useMutation();

  const getExchangeRate = (currency: string): number => {
    if (currency === "CNY") return 1;
    const rate = exchangeRates?.find((r) => r.fromCurrency === currency);
    return rate ? parseFloat(rate.rate?.toString() || "1") : 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rate = getExchangeRate(formData.currency);
    const originalAmount = parseFloat(formData.originalAmount);
    const cnyAmount = originalAmount * rate;

    try {
      await addMutation.mutateAsync({
        flowDate: formData.flowDate,
        flowType: formData.flowType,
        sourceAccount: formData.sourceAccount || undefined,
        targetAccount: formData.targetAccount || undefined,
        assetName: formData.assetName || undefined,
        originalAmount: originalAmount.toString(),
        currency: formData.currency,
        cnyAmount: cnyAmount.toString(),
        description: formData.description || undefined,
      });

      toast.success("现金流记录添加成功");
      setIsDialogOpen(false);
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
      refetch();
    } catch (error) {
      toast.error("添加失败");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这条记录吗？")) return;
    
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("删除成功");
      refetch();
    } catch (error) {
      toast.error("删除失败");
    }
  };

  // Calculate totals
  const totals = cashFlows?.reduce(
    (acc, flow) => {
      const amount = parseFloat(flow.cnyAmount?.toString() || "0");
      if (flow.flowType === "inflow") {
        acc.inflow += amount;
      } else {
        acc.outflow += amount;
      }
      return acc;
    },
    { inflow: 0, outflow: 0 }
  ) || { inflow: 0, outflow: 0 };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">现金流量表</h1>
            <p className="text-muted-foreground mt-1">记录和追踪您的资金流动</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                添加记录
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>添加现金流记录</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>日期</Label>
                    <Input
                      type="date"
                      value={formData.flowDate}
                      onChange={(e) => setFormData({ ...formData, flowDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>类型</Label>
                    <Select
                      value={formData.flowType}
                      onValueChange={(value: "inflow" | "outflow") =>
                        setFormData({ ...formData, flowType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inflow">流入（买入/转入）</SelectItem>
                        <SelectItem value="outflow">流出（卖出/转出）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>来源账户</Label>
                    <Input
                      placeholder="如：银行账户"
                      value={formData.sourceAccount}
                      onChange={(e) => setFormData({ ...formData, sourceAccount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>目标账户</Label>
                    <Input
                      placeholder="如：美股账户"
                      value={formData.targetAccount}
                      onChange={(e) => setFormData({ ...formData, targetAccount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>资产名称</Label>
                  <Input
                    placeholder="如：USDT、股票等"
                    value={formData.assetName}
                    onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>金额</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="输入金额"
                      value={formData.originalAmount}
                      onChange={(e) => setFormData({ ...formData, originalAmount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>货币</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    >
                      <SelectTrigger>
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

                <div className="space-y-2">
                  <Label>备注</Label>
                  <Textarea
                    placeholder="添加备注信息..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit" disabled={addMutation.isPending}>
                    {addMutation.isPending ? "添加中..." : "添加"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">总流入</p>
                  <p className="text-2xl font-bold number-positive">{formatCurrency(totals.inflow)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">总流出</p>
                  <p className="text-2xl font-bold number-negative">{formatCurrency(totals.outflow)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="p-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">净流量</p>
                  <p className={`text-2xl font-bold ${
                    totals.inflow - totals.outflow >= 0 ? "number-positive" : "number-negative"
                  }`}>
                    {formatCurrency(totals.inflow - totals.outflow)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  {totals.inflow - totals.outflow >= 0 
                    ? <ArrowDownLeft className="w-5 h-5 text-blue-600" />
                    : <ArrowUpRight className="w-5 h-5 text-blue-600" />
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">现金流明细</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !cashFlows || cashFlows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ArrowLeftRight className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">暂无现金流记录</h3>
                <p className="text-muted-foreground text-center mb-4">
                  点击"添加记录"开始追踪您的资金流动
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>类型</th>
                      <th>资产/账户</th>
                      <th className="text-right">金额</th>
                      <th className="text-right">人民币金额</th>
                      <th>备注</th>
                      <th className="text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlows.map((flow) => (
                      <tr key={flow.id}>
                        <td className="whitespace-nowrap">
                          {formatDate(flow.flowDate)}
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            flow.flowType === "inflow"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {flow.flowType === "inflow" ? (
                              <>
                                <ArrowDownLeft className="w-3 h-3" />
                                流入
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-3 h-3" />
                                流出
                              </>
                            )}
                          </span>
                        </td>
                        <td>
                          <div>
                            {flow.assetName && (
                              <span className="font-medium">{flow.assetName}</span>
                            )}
                            {(flow.sourceAccount || flow.targetAccount) && (
                              <div className="text-xs text-muted-foreground">
                                {flow.sourceAccount && `从: ${flow.sourceAccount}`}
                                {flow.sourceAccount && flow.targetAccount && " → "}
                                {flow.targetAccount && `至: ${flow.targetAccount}`}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="text-right font-mono whitespace-nowrap">
                          {flow.currency !== "CNY" && (
                            <span className="text-muted-foreground mr-1">{flow.currency}</span>
                          )}
                          {parseFloat(flow.originalAmount?.toString() || "0").toLocaleString()}
                        </td>
                        <td className={`text-right font-mono whitespace-nowrap ${
                          flow.flowType === "inflow" ? "number-positive" : "number-negative"
                        }`}>
                          {flow.flowType === "inflow" ? "+" : "-"}
                          {formatCurrency(flow.cnyAmount)}
                        </td>
                        <td className="text-muted-foreground max-w-[200px] truncate">
                          {flow.description || "-"}
                        </td>
                        <td className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(flow.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
