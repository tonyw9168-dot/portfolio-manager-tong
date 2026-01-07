import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect } from "react";
import { 
  Target, AlertTriangle, CheckCircle, Settings2, Save,
  TrendingUp, TrendingDown, ArrowRight
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { toast } from "sonner";

// 图表颜色配置
const CATEGORY_COLORS: Record<string, string> = {
  "美股": "#f59e0b",
  "A+H股": "#3b82f6",
  "日股": "#8b5cf6",
  "黄金": "#eab308",
  "虚拟货币": "#10b981",
  "现金": "#6b7280",
};

// 默认目标配置
const DEFAULT_TARGETS: Record<string, number> = {
  "美股": 30,
  "A+H股": 25,
  "日股": 10,
  "黄金": 15,
  "虚拟货币": 10,
  "现金": 10,
};

export default function TargetsPage() {
  const [targets, setTargets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('portfolio-targets');
    return saved ? JSON.parse(saved) : DEFAULT_TARGETS;
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTargets, setEditingTargets] = useState<Record<string, number>>(targets);

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: snapshots } = trpc.snapshots.list.useQuery();
  const { data: assetValues } = trpc.assetValues.list.useQuery();

  // 获取最新快照
  const latestSnapshot = useMemo(() => {
    if (!snapshots) return null;
    return [...snapshots].sort((a, b) => 
      new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
    )[0];
  }, [snapshots]);

  // 计算当前实际配置
  const currentAllocation = useMemo(() => {
    if (!latestSnapshot || !assetValues || !categories) return [];

    const snapshotAssets = assetValues.filter(av => av.snapshotId === latestSnapshot.id);
    const totalValue = snapshotAssets.reduce((sum, av) => sum + Number(av.cnyValue || 0), 0);

    return categories.map(cat => {
      const catAssets = snapshotAssets.filter(av => av.categoryId === cat.id);
      const catTotal = catAssets.reduce((sum, av) => sum + Number(av.cnyValue || 0), 0);
      const actualPercent = totalValue > 0 ? (catTotal / totalValue) * 100 : 0;
      const targetPercent = targets[cat.name] || 0;
      const deviation = actualPercent - targetPercent;

      return {
        id: cat.id,
        name: cat.name,
        value: catTotal,
        actualPercent,
        targetPercent,
        deviation,
        color: CATEGORY_COLORS[cat.name] || "#888888"
      };
    }).filter(cat => cat.actualPercent > 0 || cat.targetPercent > 0);
  }, [latestSnapshot, assetValues, categories, targets]);

  // 计算总资产
  const totalValue = useMemo(() => {
    return currentAllocation.reduce((sum, cat) => sum + cat.value, 0);
  }, [currentAllocation]);

  // 计算偏差状态
  const deviationStatus = useMemo(() => {
    const overAllocated = currentAllocation.filter(cat => cat.deviation > 5);
    const underAllocated = currentAllocation.filter(cat => cat.deviation < -5);
    const onTarget = currentAllocation.filter(cat => Math.abs(cat.deviation) <= 5);

    return { overAllocated, underAllocated, onTarget };
  }, [currentAllocation]);

  // 保存目标配置
  const saveTargets = () => {
    const total = Object.values(editingTargets).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`目标配置总和必须为100%，当前为${total.toFixed(1)}%`);
      return;
    }
    setTargets(editingTargets);
    localStorage.setItem('portfolio-targets', JSON.stringify(editingTargets));
    setEditDialogOpen(false);
    toast.success('目标配置已保存');
  };

  // 重置为默认配置
  const resetToDefault = () => {
    setEditingTargets(DEFAULT_TARGETS);
  };

  // 格式化金额
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 10000) {
      return `¥${(value / 10000).toFixed(2)}万`;
    }
    return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
  };

  // 格式化百分比
  const formatPercent = (value: number, showSign = false) => {
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // 获取偏差状态样式
  const getDeviationStyle = (deviation: number) => {
    if (deviation > 5) return { color: 'text-amber-600', bg: 'bg-amber-50', label: '超配' };
    if (deviation < -5) return { color: 'text-blue-600', bg: 'bg-blue-50', label: '低配' };
    return { color: 'text-green-600', bg: 'bg-green-50', label: '适中' };
  };

  // 准备饼图数据
  const actualPieData = currentAllocation.map(cat => ({
    name: cat.name,
    value: cat.actualPercent,
    color: cat.color
  }));

  const targetPieData = categories?.map(cat => ({
    name: cat.name,
    value: targets[cat.name] || 0,
    color: CATEGORY_COLORS[cat.name] || "#888888"
  })).filter(cat => cat.value > 0) || [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              目标配置对比
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              设置目标配置比例，发现配置偏差
            </p>
          </div>
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings2 className="w-4 h-4" />
                编辑目标
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>设置目标配置</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {categories?.map(cat => (
                  <div key={cat.id} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-24">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: CATEGORY_COLORS[cat.name] || "#888888" }}
                      />
                      <Label className="text-sm">{cat.name}</Label>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={editingTargets[cat.name] || 0}
                        onChange={(e) => setEditingTargets(prev => ({
                          ...prev,
                          [cat.name]: parseFloat(e.target.value) || 0
                        }))}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">总计</span>
                    <span className={`font-medium ${
                      Math.abs(Object.values(editingTargets).reduce((a, b) => a + b, 0) - 100) > 0.01
                        ? 'text-destructive'
                        : 'text-green-600'
                    }`}>
                      {Object.values(editingTargets).reduce((a, b) => a + b, 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetToDefault} className="flex-1">
                  重置默认
                </Button>
                <Button onClick={saveTargets} className="flex-1 gap-2">
                  <Save className="w-4 h-4" />
                  保存
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 偏差概览 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className={`${deviationStatus.overAllocated.length > 0 ? 'border-amber-200 bg-amber-50/50' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <span className="font-medium">超配类别</span>
              </div>
              <div className="text-2xl font-bold text-amber-600">
                {deviationStatus.overAllocated.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {deviationStatus.overAllocated.map(c => c.name).join('、') || '无'}
              </div>
            </CardContent>
          </Card>

          <Card className={`${deviationStatus.onTarget.length === currentAllocation.length ? 'border-green-200 bg-green-50/50' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">适中类别</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {deviationStatus.onTarget.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {deviationStatus.onTarget.map(c => c.name).join('、') || '无'}
              </div>
            </CardContent>
          </Card>

          <Card className={`${deviationStatus.underAllocated.length > 0 ? 'border-blue-200 bg-blue-50/50' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-blue-500" />
                <span className="font-medium">低配类别</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {deviationStatus.underAllocated.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {deviationStatus.underAllocated.map(c => c.name).join('、') || '无'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 配置对比图 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 实际配置 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">实际配置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={actualPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {actualPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      contentStyle={{
                        backgroundColor: 'oklch(1 0 0)',
                        border: '1px solid oklch(0.92 0.01 75)',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center text-sm text-muted-foreground mt-2">
                总资产: {formatCurrency(totalValue)}
              </div>
            </CardContent>
          </Card>

          {/* 目标配置 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">目标配置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={targetPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {targetPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      contentStyle={{
                        backgroundColor: 'oklch(1 0 0)',
                        border: '1px solid oklch(0.92 0.01 75)',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center text-sm text-muted-foreground mt-2">
                点击"编辑目标"调整配置比例
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 详细对比 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-primary" />
              配置偏差详情
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentAllocation.map(cat => {
                const style = getDeviationStyle(cat.deviation);
                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-medium">{cat.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.color}`}>
                          {style.label}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(cat.value)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* 进度条 */}
                      <div className="flex-1">
                        <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                          {/* 目标线 */}
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-foreground/50 z-10"
                            style={{ left: `${cat.targetPercent}%` }}
                          />
                          {/* 实际值 */}
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min(cat.actualPercent, 100)}%`,
                              backgroundColor: cat.color
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* 数值 */}
                      <div className="w-32 flex items-center justify-end gap-2 text-sm">
                        <span>{formatPercent(cat.actualPercent)}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{formatPercent(cat.targetPercent)}</span>
                      </div>
                    </div>
                    
                    {/* 偏差提示 */}
                    {Math.abs(cat.deviation) > 5 && (
                      <div className={`flex items-center gap-2 text-xs ${style.color}`}>
                        <AlertTriangle className="w-3 h-3" />
                        <span>
                          {cat.deviation > 0 
                            ? `超配 ${formatPercent(cat.deviation, true)}，建议减持 ${formatCurrency(cat.value * cat.deviation / 100)}`
                            : `低配 ${formatPercent(Math.abs(cat.deviation))}，建议增持 ${formatCurrency(totalValue * Math.abs(cat.deviation) / 100)}`
                          }
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 调仓建议 */}
        {(deviationStatus.overAllocated.length > 0 || deviationStatus.underAllocated.length > 0) && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                调仓建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {deviationStatus.overAllocated.map(cat => (
                  <div key={cat.id} className="flex items-start gap-2">
                    <TrendingDown className="w-4 h-4 text-amber-500 mt-0.5" />
                    <span>
                      <strong>{cat.name}</strong> 当前占比 {formatPercent(cat.actualPercent)}，
                      超过目标 {formatPercent(cat.targetPercent)} 约 {formatPercent(cat.deviation)}，
                      建议减持约 <strong>{formatCurrency(cat.value * cat.deviation / cat.actualPercent)}</strong>
                    </span>
                  </div>
                ))}
                {deviationStatus.underAllocated.map(cat => (
                  <div key={cat.id} className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5" />
                    <span>
                      <strong>{cat.name}</strong> 当前占比 {formatPercent(cat.actualPercent)}，
                      低于目标 {formatPercent(cat.targetPercent)} 约 {formatPercent(Math.abs(cat.deviation))}，
                      建议增持约 <strong>{formatCurrency(totalValue * Math.abs(cat.deviation) / 100)}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
