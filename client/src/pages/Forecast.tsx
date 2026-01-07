import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { 
  TrendingUp, TrendingDown, Minus, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, Info, Calendar
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { Badge } from "@/components/ui/badge";

// 预测数据类型
interface ForecastData {
  category: string;
  currentValue: number;
  predictedChange: number; // 百分比
  trend: "up" | "down" | "neutral";
  confidence: "high" | "medium" | "low";
  reasons: string[];
  color: string;
}

// 资产类别颜色配置
const CATEGORY_COLORS: Record<string, string> = {
  "美股": "#f59e0b",
  "A+H股": "#3b82f6",
  "日股": "#8b5cf6",
  "黄金": "#eab308",
  "虚拟货币": "#10b981",
  "现金": "#6b7280",
};

// 预测数据（基于市场研究）
const FORECAST_DATA: Record<string, Omit<ForecastData, 'currentValue' | 'category' | 'color'>> = {
  "美股": {
    predictedChange: 3.5,
    trend: "up",
    confidence: "medium",
    reasons: [
      "高盛预测美股牛市延续，但涨速放缓",
      "AI投资持续加速，科技股受益",
      "谷歌2025年大涨65%，动能延续",
      "美联储可能继续降息支撑市场"
    ]
  },
  "A+H股": {
    predictedChange: 2.0,
    trend: "up",
    confidence: "medium",
    reasons: [
      "A股呈现牛市格局，沪指创10年新高",
      "2026年元旦后A股\"13连阳\"",
      "港股连续两年上涨，大行看好30000点",
      "但茅台等白酒股面临增速放缓压力"
    ]
  },
  "日股": {
    predictedChange: 5.0,
    trend: "up",
    confidence: "high",
    reasons: [
      "日经225指数2026年初再创历史新高",
      "三大券商预测年底目标最高62000点",
      "结构性改革持续推进",
      "连续三年上涨，动能强劲"
    ]
  },
  "黄金": {
    predictedChange: 4.0,
    trend: "up",
    confidence: "high",
    reasons: [
      "2025年黄金创1979年以来最大年度涨幅",
      "高盛预计2026年底金价达4900美元",
      "摩根士丹利预测Q4金价达4800美元",
      "避险需求和央行购金支撑金价"
    ]
  },
  "虚拟货币": {
    predictedChange: 8.0,
    trend: "up",
    confidence: "low",
    reasons: [
      "比特币波动率降至历史最低",
      "市场分歧大：可能跌至5万或涨至12.5万美元",
      "部分早期持有者正在退出",
      "与传统金融体系融合加深"
    ]
  },
  "现金": {
    predictedChange: 0.3,
    trend: "neutral",
    confidence: "high",
    reasons: [
      "现金类资产收益稳定",
      "美联储降息预期下利率可能下行",
      "建议保持适度现金配置",
      "作为市场波动时的缓冲"
    ]
  }
};

// 趋势图标组件
function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "up") return <TrendingUp className="w-5 h-5 text-green-500" />;
  if (trend === "down") return <TrendingDown className="w-5 h-5 text-red-500" />;
  return <Minus className="w-5 h-5 text-gray-500" />;
}

// 置信度徽章组件
function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const variants = {
    high: { label: "高置信度", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    medium: { label: "中置信度", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    low: { label: "低置信度", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" }
  };
  const { label, className } = variants[confidence];
  return <Badge className={className}>{label}</Badge>;
}

// 格式化金额
function formatCurrency(value: number): string {
  if (value >= 10000) {
    return `¥${(value / 10000).toFixed(2)}万`;
  }
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ForecastPage() {
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: snapshots } = trpc.snapshots.list.useQuery();
  const { data: assetValues } = trpc.assetValues.list.useQuery();

  // 获取最新快照
  const latestSnapshot = useMemo(() => {
    if (!snapshots?.length) return null;
    return [...snapshots].sort((a, b) => 
      new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
    )[0];
  }, [snapshots]);

  // 计算各类别当前价值和预测数据
  const forecastData = useMemo(() => {
    if (!categories || !assetValues || !latestSnapshot) return [];

    return categories.map(cat => {
      const catAssets = assetValues.filter(
        av => av.snapshotId === latestSnapshot.id && av.categoryId === cat.id
      );
      const currentValue = catAssets.reduce((sum, av) => sum + Number(av.cnyValue || 0), 0);
      
      const forecast = FORECAST_DATA[cat.name] || {
        predictedChange: 0,
        trend: "neutral" as const,
        confidence: "low" as const,
        reasons: ["暂无预测数据"]
      };

      return {
        category: cat.name,
        currentValue,
        color: CATEGORY_COLORS[cat.name] || "#888888",
        ...forecast
      };
    }).filter(item => item.currentValue > 0);
  }, [categories, assetValues, latestSnapshot]);

  // 生成预测趋势图数据
  const chartData = useMemo(() => {
    if (!forecastData.length) return [];

    const today = new Date();
    const data = [];
    
    // 生成未来30天的预测数据点
    for (let i = 0; i <= 30; i += 5) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateLabel = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
      
      const point: Record<string, unknown> = { date: dateLabel, day: i };
      
      forecastData.forEach(item => {
        // 线性插值预测值
        const dailyChange = item.predictedChange / 30;
        const predictedValue = item.currentValue * (1 + (dailyChange * i) / 100);
        point[item.category] = predictedValue;
      });
      
      data.push(point);
    }
    
    return data;
  }, [forecastData]);

  // 计算总资产预测
  const totalForecast = useMemo(() => {
    if (!forecastData.length) return { current: 0, predicted: 0, change: 0 };
    
    const current = forecastData.reduce((sum, item) => sum + item.currentValue, 0);
    const predicted = forecastData.reduce((sum, item) => 
      sum + item.currentValue * (1 + item.predictedChange / 100), 0
    );
    const change = ((predicted - current) / current) * 100;
    
    return { current, predicted, change };
  }, [forecastData]);

  return (
    <Layout>
      <div className="space-y-6 p-4 lg:p-6">
        {/* 页面标题 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">资产走势预测</h1>
            <Badge variant="outline" className="gap-1">
              <Calendar className="w-3 h-3" />
              未来一个月
            </Badge>
          </div>
          <p className="text-muted-foreground">
            基于当前市场研究和趋势分析，预测各资产类别未来一个月的走势
          </p>
        </div>

        {/* 免责声明 */}
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardContent className="flex items-start gap-3 pt-4">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">免责声明</p>
              <p className="mt-1">
                以下预测仅供参考，基于公开市场信息和历史趋势分析。投资有风险，实际走势可能与预测存在较大偏差。
                请根据自身情况谨慎决策，本预测不构成任何投资建议。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 总资产预测概览 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">当前总资产</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalForecast.current)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">预测总资产</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalForecast.predicted)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">预测变动</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-2 ${
                totalForecast.change > 0 ? 'text-green-600' : totalForecast.change < 0 ? 'text-red-600' : ''
              }`}>
                {totalForecast.change > 0 ? <ArrowUpRight className="w-5 h-5" /> : 
                 totalForecast.change < 0 ? <ArrowDownRight className="w-5 h-5" /> : null}
                {totalForecast.change > 0 ? '+' : ''}{totalForecast.change.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 预测趋势图 */}
        <Card>
          <CardHeader>
            <CardTitle>资产走势预测图</CardTitle>
            <CardDescription>各资产类别未来30天预测走势</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis 
                    tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`}
                    className="text-xs"
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `日期: ${label}`}
                  />
                  <ReferenceLine x={chartData[0]?.date} stroke="#888" strokeDasharray="5 5" label="今日" />
                  {forecastData.map(item => (
                    <Area
                      key={item.category}
                      type="monotone"
                      dataKey={item.category}
                      stroke={item.color}
                      fill={item.color}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* 图例 */}
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              {forecastData.map(item => (
                <div key={item.category} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm">{item.category}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 各类别详细预测 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forecastData.map(item => (
            <Card key={item.category} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <CardTitle className="text-lg">{item.category}</CardTitle>
                  </div>
                  <ConfidenceBadge confidence={item.confidence} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 数值预测 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">当前价值</p>
                    <p className="text-lg font-semibold">{formatCurrency(item.currentValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">预测变动</p>
                    <div className={`text-lg font-semibold flex items-center gap-1 ${
                      item.predictedChange > 0 ? 'text-green-600' : 
                      item.predictedChange < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      <TrendIcon trend={item.trend} />
                      {item.predictedChange > 0 ? '+' : ''}{item.predictedChange.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                {/* 预测原因 */}
                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium">预测依据</p>
                  </div>
                  <ul className="space-y-1.5">
                    {item.reasons.map((reason, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 数据来源说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">数据来源</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• 美股数据：高盛、Bank of America、Morningstar等机构研究报告</p>
            <p>• A股/港股数据：东方财富、证券时报、港交所公告等</p>
            <p>• 日股数据：日本三大券商预测、TradingEconomics等</p>
            <p>• 黄金数据：高盛、摩根士丹利贵金属研究报告</p>
            <p>• 加密货币数据：CoinDesk、Binance市场分析等</p>
            <p className="pt-2 text-xs">数据更新时间：2026年1月7日</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
