import { useState, useMemo } from "react";
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
import { Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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

export default function Holdings() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSnapshot, setSelectedSnapshot] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: snapshots } = trpc.snapshots.list.useQuery();
  const { data: assetValues, isLoading } = trpc.assetValues.list.useQuery({
    categoryId: selectedCategory !== "all" ? parseInt(selectedCategory) : undefined,
    snapshotId: selectedSnapshot !== "all" ? parseInt(selectedSnapshot) : undefined,
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

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">持仓明细</h1>
          <p className="text-muted-foreground mt-1">查看和筛选您的投资组合详情</p>
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
              <div className="flex gap-2">
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
              <p className="text-muted-foreground text-center">
                请先导入Excel数据或调整筛选条件
              </p>
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
                        <th className="text-right">人民币价值</th>
                        <th className="text-right">期末变动</th>
                        <th className="text-right">占比</th>
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
                              {formatCurrency(item.cnyValue)}
                            </td>
                            <td className={`text-right font-mono ${
                              change > 0 ? "number-positive" : change < 0 ? "number-negative" : ""
                            }`}>
                              {change > 0 ? "+" : ""}{formatCurrency(change)}
                            </td>
                            <td className="text-right text-muted-foreground">
                              {ratio > 0 ? `${ratio.toFixed(2)}%` : "-"}
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
      </div>
    </Layout>
  );
}
