import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLORS = [
  "hsl(38, 92%, 50%)",   // Gold
  "hsl(199, 89%, 48%)",  // Blue
  "hsl(142, 71%, 45%)",  // Green
  "hsl(262, 83%, 58%)",  // Purple
  "hsl(0, 84%, 60%)",    // Red
  "hsl(280, 65%, 60%)",  // Pink
];

function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "¥0.00";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(num);
}

function formatROI(roi: number): string {
  const sign = roi >= 0 ? '+' : '';
  return `${sign}${roi.toFixed(2)}%`;
}

export default function ProfitLossDetail() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);

  const { data: dashboardData } = trpc.dashboard.overview.useQuery();
  const { data: assetValues } = trpc.assetValues.list.useQuery();
  const { data: snapshots } = trpc.snapshots.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();

  const profitLossData = useMemo(() => {
    if (!assetValues || !snapshots || !categories) return [];

    // Group by asset and track profit/loss
    const assetMap = new Map<string, any>();

    assetValues.forEach((av: any) => {
      const key = `${av.categoryId}-${av.assetName}`;
      if (!assetMap.has(key)) {
        const category = categories.find((c: any) => c.id === av.categoryId);
        assetMap.set(key, {
          categoryId: av.categoryId,
          categoryName: category?.name || "未知",
          assetName: av.assetName,
          history: [],
        });
      }
      const asset = assetMap.get(key);
      asset.history.push({
        snapshotId: av.snapshotId,
        value: parseFloat(av.cnyValue?.toString() || "0"),
      });
    });

    // Calculate profit/loss for each asset
    const result: any[] = [];
    assetMap.forEach((asset) => {
      if (asset.history.length > 0) {
        const sorted = asset.history.sort((a: any, b: any) => a.snapshotId - b.snapshotId);
        const firstValue = sorted[0].value;
        const lastValue = sorted[sorted.length - 1].value;
        const profitLoss = lastValue - firstValue;
        const roi = firstValue > 0 ? (profitLoss / firstValue) * 100 : 0;

        result.push({
          ...asset,
          firstValue,
          lastValue,
          profitLoss,
          roi,
          history: sorted,
        });
      }
    });

    return result;
  }, [assetValues, snapshots, categories]);

  const filteredData = useMemo(() => {
    if (selectedCategory === "all") return profitLossData;
    return profitLossData.filter((item) => item.categoryId === parseInt(selectedCategory));
  }, [profitLossData, selectedCategory]);

  const totalProfitLoss = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + item.profitLoss, 0);
  }, [filteredData]);

  const gainAssets = useMemo(() => {
    return filteredData.filter((item) => item.profitLoss > 0);
  }, [filteredData]);

  const lossAssets = useMemo(() => {
    return filteredData.filter((item) => item.profitLoss < 0);
  }, [filteredData]);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">盈亏明细分析</h1>
          <p className="text-muted-foreground mt-1">
            追踪每个投资标的的具体盈亏情况
          </p>
        </div>

        {/* Category Filter */}
        <div className="w-full sm:w-64">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="选择资产类别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有类别</SelectItem>
              {categories?.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">总盈亏</p>
              <p className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalProfitLoss)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">盈利标的</p>
              <p className="text-2xl font-bold text-green-600">{gainAssets.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">亏损标的</p>
              <p className="text-2xl font-bold text-red-600">{lossAssets.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Profit Assets */}
        {gainAssets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                盈利标的 ({gainAssets.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {gainAssets.map((asset) => (
                <div key={`${asset.categoryId}-${asset.assetName}`} className="border rounded-lg p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() =>
                      setExpandedAsset(
                        expandedAsset === `${asset.categoryId}-${asset.assetName}`
                          ? null
                          : `${asset.categoryId}-${asset.assetName}`
                      )
                    }
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{asset.assetName}</p>
                      <p className="text-sm text-muted-foreground">{asset.categoryName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(asset.profitLoss)}</p>
                      <p className="text-sm text-green-600">{formatROI(asset.roi)}</p>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 ml-2 transition-transform ${
                        expandedAsset === `${asset.categoryId}-${asset.assetName}` ? 'rotate-180' : ''
                      }`}
                    />
                  </div>

                  {expandedAsset === `${asset.categoryId}-${asset.assetName}` && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">初始价值</p>
                          <p className="font-semibold">{formatCurrency(asset.firstValue)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">当前价值</p>
                          <p className="font-semibold">{formatCurrency(asset.lastValue)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Loss Assets */}
        {lossAssets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                亏损标的 ({lossAssets.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lossAssets.map((asset) => (
                <div key={`${asset.categoryId}-${asset.assetName}`} className="border rounded-lg p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() =>
                      setExpandedAsset(
                        expandedAsset === `${asset.categoryId}-${asset.assetName}`
                          ? null
                          : `${asset.categoryId}-${asset.assetName}`
                      )
                    }
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{asset.assetName}</p>
                      <p className="text-sm text-muted-foreground">{asset.categoryName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{formatCurrency(asset.profitLoss)}</p>
                      <p className="text-sm text-red-600">{formatROI(asset.roi)}</p>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 ml-2 transition-transform ${
                        expandedAsset === `${asset.categoryId}-${asset.assetName}` ? 'rotate-180' : ''
                      }`}
                    />
                  </div>

                  {expandedAsset === `${asset.categoryId}-${asset.assetName}` && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">初始价值</p>
                          <p className="font-semibold">{formatCurrency(asset.firstValue)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">当前价值</p>
                          <p className="font-semibold">{formatCurrency(asset.lastValue)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
