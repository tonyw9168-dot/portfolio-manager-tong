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
import { trpc } from "@/lib/trpc";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  Upload,
  Download,
  RefreshCw,
  DollarSign
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
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
} from "recharts";
import { toast } from "sonner";

const COLORS = [
  "hsl(38, 92%, 50%)",   // Gold
  "hsl(199, 89%, 48%)",  // Blue
  "hsl(142, 71%, 45%)",  // Green
  "hsl(262, 83%, 58%)",  // Purple
  "hsl(0, 84%, 60%)",    // Red
  "hsl(280, 65%, 60%)",  // Pink
];

import { useCurrency, CurrencyDisplay, CURRENCY_INFO } from "@/contexts/CurrencyContext";

function formatROI(roi: number): string {
  const sign = roi >= 0 ? '+' : '';
  return `${sign}${roi.toFixed(2)}%`;
}

export default function Dashboard() {
  const [isImporting, setIsImporting] = useState(false);
  const { displayCurrency, setDisplayCurrency, formatCurrency, exchangeRates } = useCurrency();
  
  const { data: dashboardData, isLoading, refetch } = trpc.dashboard.overview.useQuery();
  const importMutation = trpc.import.excel.useMutation();
  const { data: exportData, refetch: exportRefetch } = trpc.export.excel.useQuery(undefined, {
    enabled: false,
  });

  const handleImport = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        
        const result = await importMutation.mutateAsync({ data: base64 });
        
        if (result.success) {
          toast.success(result.message || "数据导入成功");
          refetch();
        } else {
          toast.error(result.message || "导入失败");
        }
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || '未知错误';
        toast.error(`导入失败: ${errorMsg}`);
        console.error('Import error:', error);
      } finally {
        setIsImporting(false);
      }
    };
    
    input.click();
  }, [importMutation, refetch]);

  const handleExport = useCallback(async () => {
    try {
      const result = await exportRefetch();
      if (result.data) {
        const byteCharacters = atob(result.data.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { 
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success("导出成功");
      }
    } catch (error) {
      toast.error("导出失败");
      console.error(error);
    }
  }, [exportRefetch]);

  const totalValue = useMemo(() => {
    return parseFloat(dashboardData?.totalValue?.toString() || "0");
  }, [dashboardData]);

  const latestChange = useMemo(() => {
    if (!dashboardData?.trendData?.length) return 0;
    const latest = dashboardData.trendData[dashboardData.trendData.length - 1];
    return latest?.change || 0;
  }, [dashboardData]);

  const pieData = useMemo(() => {
    return dashboardData?.categoryTotals?.map((cat) => ({
      name: cat.name,
      value: cat.value,
    })) || [];
  }, [dashboardData]);

  const trendData = useMemo(() => {
    return dashboardData?.trendData?.map((item) => ({
      name: item.label,
      value: item.value,
      change: item.change,
    })) || [];
  }, [dashboardData]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const hasData = pieData.length > 0;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">投资组合概览</h1>
            <p className="text-muted-foreground mt-1">
              {dashboardData?.latestSnapshot 
                ? `最新数据: ${dashboardData.latestSnapshot.substring(0, 2)}月${dashboardData.latestSnapshot.substring(2)}日`
                : "暂无数据"}
            </p>
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
                <SelectItem value="HKD">港币 HK$</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleImport}
              disabled={isImporting}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? "导入中..." : "导入Excel"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              disabled={!hasData}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              导出Excel
            </Button>
          </div>
        </div>

        {/* 货币提示 */}
        {displayCurrency !== "CNY" && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            当前以{CURRENCY_INFO[displayCurrency].name}显示，汇率：1 {displayCurrency} = {exchangeRates[displayCurrency]?.toFixed(2) || '1.00'} CNY（仅供参考）
          </div>
        )}

        {!hasData ? (
          /* Empty State */
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">暂无投资数据</h3>
              <p className="text-muted-foreground text-center mb-4">
                请上传您的投资组合Excel文件以开始使用
              </p>
              <Button onClick={handleImport} disabled={isImporting}>
                <Upload className="w-4 h-4 mr-2" />
                {isImporting ? "导入中..." : "导入Excel文件"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="stat-card">
                <CardContent className="p-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">总资产</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                      {dashboardData?.overallRoi !== undefined && (
                        <p className={`text-sm mt-2 font-semibold ${
                          dashboardData.overallRoi >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatROI(dashboardData.overallRoi)}
                        </p>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="stat-card">
                <CardContent className="p-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">本期盈亏</p>
                      <p className={`text-2xl font-bold ${latestChange >= 0 ? "number-positive" : "number-negative"}`}>
                        {latestChange >= 0 ? "+" : ""}{formatCurrency(latestChange)}
                      </p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      latestChange >= 0 ? "bg-green-100" : "bg-red-100"
                    }`}>
                      {latestChange >= 0 
                        ? <TrendingUp className="w-5 h-5 text-green-600" />
                        : <TrendingDown className="w-5 h-5 text-red-600" />
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="stat-card">
                <CardContent className="p-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">资产类别</p>
                      <p className="text-2xl font-bold">{pieData.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="stat-card">
                <CardContent className="p-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">数据快照</p>
                      <p className="text-2xl font-bold">{dashboardData?.snapshotCount || 0}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart - Asset Allocation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">资产配置</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => 
                            `${name} ${(percent * 100).toFixed(1)}%`
                          }
                          labelLine={{ stroke: "#888", strokeWidth: 1 }}
                        >
                          {pieData.map((_, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]}
                              stroke="white"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart - Category Values */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">各类资产价值</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pieData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          type="number" 
                          tickFormatter={(value) => formatCurrency(value, true)}
                          stroke="#888"
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={80}
                          stroke="#888"
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="hsl(38, 92%, 50%)"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Line Chart - Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">资产趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#888"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatCurrency(value, true)}
                        stroke="#888"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          formatCurrency(value),
                          name === "value" ? "总资产" : "变动"
                        ]}
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend 
                        formatter={(value) => value === "value" ? "总资产" : "变动"}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(38, 92%, 50%)"
                        strokeWidth={3}
                        dot={{ fill: "hsl(38, 92%, 50%)", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="change"
                        stroke="hsl(199, 89%, 48%)"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: "hsl(199, 89%, 48%)", strokeWidth: 2, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
