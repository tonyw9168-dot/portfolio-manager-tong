import { useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Award } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";

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

export default function PerformanceReport() {
  const { data: dashboardData } = trpc.dashboard.overview.useQuery();

  // 基准数据（示例值）
  const benchmarkData = {
    sp500: 28.5,        // 标普500指数年化收益率
    usBond: 4.2,        // 美债10年期收益率
    inflationRate: 3.4, // 通胀率
  };

  const performanceData = useMemo(() => {
    if (!dashboardData) return null;

    const portfolioRoi = dashboardData.overallRoi || 0;
    const categoryRois = dashboardData.categoryTotals?.map((cat: any) => ({
      name: cat.name,
      roi: cat.roi || 0,
    })) || [];

    return {
      portfolioRoi,
      categoryRois,
    };
  }, [dashboardData]);

  const comparisonData = useMemo(() => {
    if (!performanceData) return [];

    return [
      {
        name: "投资组合",
        roi: performanceData.portfolioRoi,
        type: "portfolio",
      },
      {
        name: "标普500",
        roi: benchmarkData.sp500,
        type: "benchmark",
      },
      {
        name: "美债10Y",
        roi: benchmarkData.usBond,
        type: "benchmark",
      },
      {
        name: "通胀率",
        roi: benchmarkData.inflationRate,
        type: "inflation",
      },
    ];
  }, [performanceData]);

  const performanceAnalysis = useMemo(() => {
    if (!performanceData) return null;

    const portfolioRoi = performanceData.portfolioRoi;
    const sp500Diff = portfolioRoi - benchmarkData.sp500;
    const bondDiff = portfolioRoi - benchmarkData.usBond;
    const inflationDiff = portfolioRoi - benchmarkData.inflationRate;

    return {
      portfolioRoi,
      sp500Diff,
      bondDiff,
      inflationDiff,
      outperformsSP500: sp500Diff > 0,
      outperformsBond: bondDiff > 0,
      beatsInflation: inflationDiff > 0,
    };
  }, [performanceData]);

  const categoryPerformance = useMemo(() => {
    if (!performanceData) return [];

    return performanceData.categoryRois.sort((a: any, b: any) => b.roi - a.roi);
  }, [performanceData]);

  if (!performanceAnalysis) {
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
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">投资绩效报告</h1>
          <p className="text-muted-foreground mt-1">
            与市场基准进行对比分析，评估投资表现
          </p>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">投资组合收益率</p>
              <p className={`text-3xl font-bold ${performanceAnalysis.portfolioRoi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatROI(performanceAnalysis.portfolioRoi)}
              </p>
            </CardContent>
          </Card>

          <Card className={performanceAnalysis.outperformsSP500 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">vs 标普500</p>
              <p className={`text-2xl font-bold ${performanceAnalysis.outperformsSP500 ? 'text-green-600' : 'text-red-600'}`}>
                {formatROI(performanceAnalysis.sp500Diff)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {performanceAnalysis.outperformsSP500 ? '超越' : '落后'} {Math.abs(performanceAnalysis.sp500Diff).toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card className={performanceAnalysis.outperformsBond ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">vs 美债10Y</p>
              <p className={`text-2xl font-bold ${performanceAnalysis.outperformsBond ? 'text-green-600' : 'text-red-600'}`}>
                {formatROI(performanceAnalysis.bondDiff)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {performanceAnalysis.outperformsBond ? '超越' : '落后'} {Math.abs(performanceAnalysis.bondDiff).toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card className={performanceAnalysis.beatsInflation ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">vs 通胀率</p>
              <p className={`text-2xl font-bold ${performanceAnalysis.beatsInflation ? 'text-green-600' : 'text-red-600'}`}>
                {formatROI(performanceAnalysis.inflationDiff)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {performanceAnalysis.beatsInflation ? '跑赢' : '跑输'} {Math.abs(performanceAnalysis.inflationDiff).toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle>收益率对比</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => `${value.toFixed(2)}%`}
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="roi" fill="hsl(199, 89%, 48%)">
                  {comparisonData.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.type === "portfolio"
                          ? "hsl(38, 92%, 50%)"
                          : entry.type === "inflation"
                          ? "hsl(0, 84%, 60%)"
                          : "hsl(199, 89%, 48%)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>各类别表现排名</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryPerformance.map((category: any, index: number) => (
                <div key={category.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <p className="font-semibold">{category.name}</p>
                  </div>
                  <p className={`text-lg font-bold ${category.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatROI(category.roi)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Investment Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              投资评价
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">绩效评估</h4>
              <ul className="space-y-2 text-sm text-blue-800">
                {performanceAnalysis.outperformsSP500 && (
                  <li className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    投资组合收益率超越标普500指数，表现优异
                  </li>
                )}
                {!performanceAnalysis.outperformsSP500 && (
                  <li className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    投资组合收益率低于标普500指数，需要优化配置
                  </li>
                )}
                {performanceAnalysis.beatsInflation && (
                  <li className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    投资收益超过通胀率，资产实现增值
                  </li>
                )}
                {!performanceAnalysis.beatsInflation && (
                  <li className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    投资收益低于通胀率，实际购买力下降
                  </li>
                )}
                {performanceAnalysis.outperformsBond && (
                  <li className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    投资收益超过美债收益率，风险补偿充分
                  </li>
                )}
              </ul>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-2">基准数据参考</h4>
              <div className="grid grid-cols-3 gap-4 text-sm text-amber-800">
                <div>
                  <p className="text-muted-foreground">标普500</p>
                  <p className="font-semibold">{benchmarkData.sp500.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">美债10Y</p>
                  <p className="font-semibold">{benchmarkData.usBond.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">通胀率</p>
                  <p className="font-semibold">{benchmarkData.inflationRate.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
