import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { DollarSign, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [usdRate, setUsdRate] = useState("");
  const [hkdRate, setHkdRate] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: exchangeRates, isLoading, refetch } = trpc.exchangeRates.list.useQuery();
  const upsertMutation = trpc.exchangeRates.upsert.useMutation();

  // Get current rates
  const currentUsdRate = exchangeRates?.find((r) => r.fromCurrency === "USD");
  const currentHkdRate = exchangeRates?.find((r) => r.fromCurrency === "HKD");

  const handleUpdateRate = async (currency: string, rate: string) => {
    if (!rate || isNaN(parseFloat(rate))) {
      toast.error("请输入有效的汇率");
      return;
    }

    setIsUpdating(true);
    try {
      await upsertMutation.mutateAsync({
        fromCurrency: currency,
        rate: rate,
        effectiveDate: new Date().toISOString().split("T")[0],
      });
      toast.success(`${currency}/CNY 汇率更新成功`);
      refetch();
      if (currency === "USD") setUsdRate("");
      if (currency === "HKD") setHkdRate("");
    } catch (error) {
      toast.error("更新失败");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">设置</h1>
          <p className="text-muted-foreground mt-1">管理汇率和系统配置</p>
        </div>

        {/* Exchange Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              汇率管理
            </CardTitle>
            <CardDescription>
              设置外币兑人民币的汇率，用于统一计算资产价值
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* USD Rate */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">美元 (USD) → 人民币 (CNY)</Label>
                    {currentUsdRate && (
                      <span className="text-sm text-muted-foreground">
                        当前: 1 USD = {parseFloat(currentUsdRate.rate?.toString() || "0").toFixed(4)} CNY
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        1 USD =
                      </span>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder={currentUsdRate?.rate?.toString() || "7.1000"}
                        value={usdRate}
                        onChange={(e) => setUsdRate(e.target.value)}
                        className="pl-20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        CNY
                      </span>
                    </div>
                    <Button
                      onClick={() => handleUpdateRate("USD", usdRate || currentUsdRate?.rate?.toString() || "7.1")}
                      disabled={isUpdating}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </Button>
                  </div>
                </div>

                {/* HKD Rate */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">港币 (HKD) → 人民币 (CNY)</Label>
                    {currentHkdRate && (
                      <span className="text-sm text-muted-foreground">
                        当前: 1 HKD = {parseFloat(currentHkdRate.rate?.toString() || "0").toFixed(4)} CNY
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        1 HKD =
                      </span>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder={currentHkdRate?.rate?.toString() || "0.9100"}
                        value={hkdRate}
                        onChange={(e) => setHkdRate(e.target.value)}
                        className="pl-20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        CNY
                      </span>
                    </div>
                    <Button
                      onClick={() => handleUpdateRate("HKD", hkdRate || currentHkdRate?.rate?.toString() || "0.91")}
                      disabled={isUpdating}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </Button>
                  </div>
                </div>

                {/* Refresh Button */}
                <div className="pt-4 border-t">
                  <Button variant="outline" onClick={() => refetch()} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    刷新汇率数据
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">系统信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">版本</span>
                <span className="font-mono">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">数据存储</span>
                <span>云端数据库</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">访问密码</span>
                <span className="font-mono">••••••••</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <h4 className="font-medium mb-2">使用提示</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 汇率变更会影响所有外币资产的人民币价值计算</li>
              <li>• 建议定期更新汇率以保持数据准确性</li>
              <li>• 历史数据中的汇率不会被追溯更新</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
