import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Heart, Activity, Umbrella, PiggyBank, AlertTriangle, CheckCircle2, Users, Plus, AlertCircle, TrendingUp, Calendar, DollarSign, User, Building2, FileText, ChevronRight, Info, Clock } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { familyMembers, insurancePolicies, insuranceTypeLabels, insuranceTypeColors, getMemberPolicies, getPoliciesByType, getExpiringPolicies, getTotalAnnualPremium, analyzeRisks, type InsurancePolicy, type InsuranceType } from "@/lib/insuranceData";

function formatCurrency(value: number, currency: string = 'CNY'): string {
  if (currency === 'USD') return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value);
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '未知';
  return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getDaysUntilExpiry(endDate: string): number {
  if (!endDate) return Infinity;
  return Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
}

function getInsuranceTypeIcon(type: InsuranceType) {
  const icons: Record<InsuranceType, React.ReactNode> = {
    medical: <Activity className="h-5 w-5" />,
    critical_illness: <Heart className="h-5 w-5" />,
    life: <Shield className="h-5 w-5" />,
    accident: <Umbrella className="h-5 w-5" />,
    savings: <PiggyBank className="h-5 w-5" />,
    annuity: <DollarSign className="h-5 w-5" />,
  };
  return icons[type];
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    active: { variant: "default", label: "生效中" },
    expired: { variant: "destructive", label: "已过期" },
    pending: { variant: "secondary", label: "待确认" },
  };
  const { variant, label } = variants[status] || { variant: "outline", label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

function RiskLevelBadge({ level }: { level: string }) {
  const variants: Record<string, { color: string; label: string }> = {
    none: { color: "bg-red-500", label: "无覆盖" },
    low: { color: "bg-orange-500", label: "覆盖不足" },
    medium: { color: "bg-yellow-500", label: "基本覆盖" },
    high: { color: "bg-green-500", label: "充分覆盖" },
  };
  const { color, label } = variants[level] || { color: "bg-gray-500", label: level };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${color}`}>{label}</span>;
}

function InsuranceOverview() {
  const totalPremium = getTotalAnnualPremium();
  const expiringPolicies = getExpiringPolicies(90);
  
  const typeStats = useMemo(() => {
    const stats: Record<InsuranceType, { count: number; coverage: number }> = {
      medical: { count: 0, coverage: 0 },
      critical_illness: { count: 0, coverage: 0 },
      life: { count: 0, coverage: 0 },
      accident: { count: 0, coverage: 0 },
      savings: { count: 0, coverage: 0 },
      annuity: { count: 0, coverage: 0 },
    };
    insurancePolicies.forEach(p => {
      if (p.status === 'active') {
        stats[p.type].count++;
        stats[p.type].coverage += p.coverage;
      }
    });
    return stats;
  }, []);
  
  const pieData = Object.entries(typeStats)
    .filter(([_, stat]) => stat.count > 0)
    .map(([type, stat]) => ({
      name: insuranceTypeLabels[type as InsuranceType],
      value: stat.count,
      color: insuranceTypeColors[type as InsuranceType],
    }));
  
  const memberCoverage = familyMembers.map(member => {
    const policies = getMemberPolicies(member.id);
    return {
      name: member.name,
      role: member.role,
      totalPolicies: policies.length,
      activePolicies: policies.filter(p => p.status === 'active').length,
      coveredTypes: Array.from(new Set(policies.map(p => p.type))),
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">年度总保费</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPremium)}</div>
            <p className="text-xs text-muted-foreground">包含美元保费按汇率7折算</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">保险总数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insurancePolicies.length}</div>
            <p className="text-xs text-muted-foreground">生效中 {insurancePolicies.filter(p => p.status === 'active').length} 份</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">覆盖成员</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{familyMembers.length}</div>
            <p className="text-xs text-muted-foreground">{familyMembers.map(m => m.name).join('、')}</p>
          </CardContent>
        </Card>
        <Card className={expiringPolicies.length > 0 ? "border-orange-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">即将到期</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${expiringPolicies.length > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringPolicies.length}</div>
            <p className="text-xs text-muted-foreground">90天内到期的保险</p>
          </CardContent>
        </Card>
      </div>

      {expiringPolicies.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              到期风险提醒
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringPolicies.map(policy => {
                const days = getDaysUntilExpiry(policy.endDate);
                const member = familyMembers.find(m => m.id === policy.insuredId);
                return (
                  <div key={policy.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                        {getInsuranceTypeIcon(policy.type)}
                      </div>
                      <div>
                        <p className="font-medium">{policy.name}</p>
                        <p className="text-sm text-muted-foreground">被保人：{member?.name} | 到期：{formatDate(policy.endDate)}</p>
                      </div>
                    </div>
                    <Badge variant={days <= 30 ? "destructive" : "secondary"}>{days}天后到期</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>险种分布</CardTitle>
            <CardDescription>家庭保险类型配置情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}份`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>成员覆盖情况</CardTitle>
            <CardDescription>各家庭成员的保险配置</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {memberCoverage.map(member => (
                <div key={member.name} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{member.name}</span>
                      <Badge variant="outline">{member.role}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{member.activePolicies} 份生效中</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(insuranceTypeLabels).map(type => {
                      const covered = member.coveredTypes.includes(type as InsuranceType);
                      return (
                        <Badge key={type} variant={covered ? "default" : "outline"} className={covered ? "" : "opacity-50"}>
                          {insuranceTypeLabels[type as InsuranceType]}
                          {covered ? <CheckCircle2 className="ml-1 h-3 w-3" /> : null}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MemberView() {
  const [selectedMember, setSelectedMember] = useState<string>(familyMembers[0]?.id || '');
  const memberPolicies = useMemo(() => getMemberPolicies(selectedMember), [selectedMember]);
  const selectedMemberInfo = familyMembers.find(m => m.id === selectedMember);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {familyMembers.map(member => (
          <Button
            key={member.id}
            variant={selectedMember === member.id ? "default" : "outline"}
            onClick={() => setSelectedMember(member.id)}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            {member.name}
            <Badge variant="secondary" className="ml-1">{getMemberPolicies(member.id).length}</Badge>
          </Button>
        ))}
      </div>

      {selectedMemberInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedMemberInfo.name}
            </CardTitle>
            <CardDescription>
              {selectedMemberInfo.role} | {selectedMemberInfo.relationship} | {selectedMemberInfo.age}岁
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="space-y-4">
        {memberPolicies.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              暂无保险记录
            </CardContent>
          </Card>
        ) : (
          memberPolicies.map(policy => (
            <PolicyCard key={policy.id} policy={policy} showMember={false} />
          ))
        )}
      </div>
    </div>
  );
}

function PolicyCard({ policy, showMember = true }: { policy: InsurancePolicy; showMember?: boolean }) {
  const member = familyMembers.find(m => m.id === policy.insuredId);
  const policyholder = familyMembers.find(m => m.id === policy.policyholderId);
  const daysUntilExpiry = getDaysUntilExpiry(policy.endDate);

  return (
    <Card className="overflow-hidden">
      <div className="h-1" style={{ backgroundColor: insuranceTypeColors[policy.type] }} />
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full" style={{ backgroundColor: `${insuranceTypeColors[policy.type]}20` }}>
              {getInsuranceTypeIcon(policy.type)}
            </div>
            <div>
              <CardTitle className="text-lg">{policy.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4" />
                {policy.company}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{insuranceTypeLabels[policy.type]}</Badge>
            <StatusBadge status={policy.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {showMember && (
            <div>
              <p className="text-sm text-muted-foreground">被保人</p>
              <p className="font-medium">{member?.name || '未知'}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">投保人</p>
            <p className="font-medium">{policyholder?.name || policy.policyholderId || '未知'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">保额</p>
            <p className="font-medium">{policy.coverage > 0 ? formatCurrency(policy.coverage, policy.coverageCurrency) : '储蓄型/未知'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">年缴保费</p>
            <p className="font-medium">{policy.premium > 0 ? formatCurrency(policy.premium, policy.premiumCurrency) : '已缴清/未知'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">保障期限</p>
            <p className="font-medium">{policy.coverageYears}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">生效日期</p>
            <p className="font-medium">{formatDate(policy.startDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">到期日期</p>
            <p className={`font-medium ${daysUntilExpiry <= 90 && daysUntilExpiry > 0 ? 'text-orange-500' : ''}`}>
              {formatDate(policy.endDate)}
              {daysUntilExpiry <= 90 && daysUntilExpiry > 0 && <span className="text-xs ml-1">({daysUntilExpiry}天后)</span>}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">缴费方式</p>
            <p className="font-medium">{policy.paymentMethod || '未知'}</p>
          </div>
        </div>

        {policy.benefits.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">保障内容</p>
            <div className="flex flex-wrap gap-2">
              {policy.benefits.map((benefit, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {benefit}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {policy.claimConditions && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">赔付条件</p>
            <p className="text-sm text-muted-foreground">{policy.claimConditions}</p>
          </div>
        )}

        {policy.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <Info className="h-4 w-4" />
              备注
            </p>
            <p className="text-sm text-muted-foreground">{policy.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TypeComparison() {
  const insuranceTypes: InsuranceType[] = ['medical', 'critical_illness', 'life', 'accident', 'savings'];
  
  const typeData = insuranceTypes.map(type => {
    const policies = getPoliciesByType(type);
    const activePolicies = policies.filter(p => p.status === 'active');
    const totalCoverage = activePolicies.reduce((sum, p) => sum + p.coverage, 0);
    const coveredMembers = new Set(activePolicies.map(p => p.insuredId));
    const sortedByExpiry = activePolicies.filter(p => p.endDate).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    const earliestExpiry = sortedByExpiry[0];
    
    return {
      type,
      label: insuranceTypeLabels[type],
      color: insuranceTypeColors[type],
      totalPolicies: policies.length,
      activePolicies: activePolicies.length,
      totalCoverage,
      coveredMembers: Array.from(coveredMembers).map(id => familyMembers.find(m => m.id === id)?.name || id),
      earliestExpiry: earliestExpiry ? {
        name: earliestExpiry.name,
        date: earliestExpiry.endDate,
        days: getDaysUntilExpiry(earliestExpiry.endDate),
      } : null,
      policies: activePolicies,
    };
  });

  const barData = typeData.map(d => ({
    name: d.label,
    保额: d.totalCoverage / 10000,
    数量: d.activePolicies,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>各险种保额对比</CardTitle>
          <CardDescription>单位：万元人民币</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value}万`} />
                <Bar dataKey="保额" fill="hsl(199, 89%, 48%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {typeData.map(data => (
          <Card key={data.type} className="overflow-hidden">
            <div className="h-1" style={{ backgroundColor: data.color }} />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getInsuranceTypeIcon(data.type)}
                {data.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">保险数量</p>
                  <p className="text-2xl font-bold">{data.activePolicies}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">总保额</p>
                  <p className="text-2xl font-bold">{data.totalCoverage > 0 ? `${(data.totalCoverage / 10000).toFixed(0)}万` : '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">覆盖成员</p>
                <div className="flex flex-wrap gap-1">
                  {data.coveredMembers.length > 0 ? (
                    data.coveredMembers.map(name => (
                      <Badge key={name} variant="secondary">{name}</Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">暂无</span>
                  )}
                </div>
              </div>
              {data.earliestExpiry && (
                <div className={`p-3 rounded-lg ${data.earliestExpiry.days <= 90 ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-muted'}`}>
                  <p className="text-sm text-muted-foreground">最近到期</p>
                  <p className="font-medium text-sm">{data.earliestExpiry.name}</p>
                  <p className={`text-sm ${data.earliestExpiry.days <= 90 ? 'text-orange-600' : ''}`}>
                    {formatDate(data.earliestExpiry.date)}
                    {data.earliestExpiry.days <= 365 && ` (${data.earliestExpiry.days}天后)`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>险种详细对比</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>险种</TableHead>
                <TableHead>保险数量</TableHead>
                <TableHead>总保额</TableHead>
                <TableHead>覆盖成员</TableHead>
                <TableHead>最近到期</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typeData.map(data => (
                <TableRow key={data.type}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                      {data.label}
                    </div>
                  </TableCell>
                  <TableCell>{data.activePolicies}份</TableCell>
                  <TableCell>{data.totalCoverage > 0 ? formatCurrency(data.totalCoverage) : '-'}</TableCell>
                  <TableCell>{data.coveredMembers.join('、') || '-'}</TableCell>
                  <TableCell>
                    {data.earliestExpiry ? (
                      <span className={data.earliestExpiry.days <= 90 ? 'text-orange-600' : ''}>
                        {formatDate(data.earliestExpiry.date)}
                      </span>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function RiskAnalysisView() {
  const risks = analyzeRisks();
  
  const radarData = [
    { subject: '疾病风险', A: 70, fullMark: 100 },
    { subject: '医疗费用', A: 85, fullMark: 100 },
    { subject: '意外风险', A: 60, fullMark: 100 },
    { subject: '身故风险', A: 65, fullMark: 100 },
    { subject: '养老储蓄', A: 70, fullMark: 100 },
  ];

  const timelineData = insurancePolicies
    .filter(p => p.endDate && p.status === 'active')
    .map(p => ({
      name: p.name,
      member: familyMembers.find(m => m.id === p.insuredId)?.name || '未知',
      type: insuranceTypeLabels[p.type],
      endDate: p.endDate,
      daysUntil: getDaysUntilExpiry(p.endDate),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>家庭风险覆盖分析</CardTitle>
          <CardDescription>各类风险的保险覆盖程度评估</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="覆盖程度" dataKey="A" stroke="hsl(199, 89%, 48%)" fill="hsl(199, 89%, 48%)" fillOpacity={0.5} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {risks.map((risk, index) => (
          <Card key={index} className={risk.gaps.length > 0 ? "border-orange-200" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{risk.riskType}</CardTitle>
                <RiskLevelBadge level={risk.coverageLevel} />
              </div>
              <CardDescription>{risk.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">已覆盖成员</p>
                <div className="flex flex-wrap gap-1">
                  {risk.members.map(member => (
                    <Badge key={member} variant="default">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {member}
                    </Badge>
                  ))}
                </div>
              </div>
              {risk.gaps.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 text-orange-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    风险缺口
                  </p>
                  <ul className="space-y-1">
                    {risk.gaps.map((gap, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-orange-500" />
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {risk.recommendations.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 text-blue-600 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    建议
                  </p>
                  <ul className="space-y-1">
                    {risk.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-blue-500" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            保险到期时间线
          </CardTitle>
          <CardDescription>按到期时间排序的保险列表</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timelineData.map((item, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  item.daysUntil <= 30
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                    : item.daysUntil <= 90
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                    : item.daysUntil <= 365
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                    : 'border-gray-200'
                }`}
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.member} | {item.type}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatDate(item.endDate)}</p>
                  <p className={`text-sm ${
                    item.daysUntil <= 30
                      ? 'text-red-600'
                      : item.daysUntil <= 90
                      ? 'text-orange-600'
                      : item.daysUntil <= 365
                      ? 'text-yellow-600'
                      : 'text-muted-foreground'
                  }`}>
                    {item.daysUntil > 0 ? `${item.daysUntil}天后到期` : '已过期'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            风险分析总结
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                已覆盖风险
              </h4>
              <ul className="space-y-1 text-sm">
                <li>✓ 吴桐的重大疾病风险已有基本覆盖（达尔文10号+国寿康宁）</li>
                <li>✓ 吴桐的意外风险已覆盖（太平洋小蜜蜂）</li>
                <li>✓ 父母的医疗费用风险已覆盖（普惠蓝医保）</li>
                <li>✓ 家庭储蓄规划已启动（香港储蓄险）</li>
              </ul>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-orange-600 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                待完善事项
              </h4>
              <ul className="space-y-1 text-sm">
                <li>⚠ 段小涵的多项保险详情待确认</li>
                <li>⚠ 吴桐国寿定期寿险2026年到期需续保</li>
                <li>⚠ 父母意外险详情待确认</li>
                <li>⚠ 建议评估家庭寿险保额是否充足</li>
              </ul>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-blue-600 mb-2 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              近期行动建议
            </h4>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>尽快确认段小涵名下各保险的具体保障内容和保额</li>
              <li>关注吴桐国寿定期寿险到期时间，提前规划续保或新购方案</li>
              <li>确认父母意外险的保障范围和保额</li>
              <li>评估是否需要为父母增加重疾险保障</li>
              <li>定期检查各保险的缴费状态，避免断保</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Insurance() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              家庭保险配置
            </h1>
            <p className="text-muted-foreground mt-1">全面了解家庭保险覆盖情况，识别风险缺口</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            添加保险
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">总览</span>
            </TabsTrigger>
            <TabsTrigger value="member" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">按成员</span>
            </TabsTrigger>
            <TabsTrigger value="type" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">按险种</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">风险分析</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <InsuranceOverview />
          </TabsContent>
          <TabsContent value="member" className="mt-6">
            <MemberView />
          </TabsContent>
          <TabsContent value="type" className="mt-6">
            <TypeComparison />
          </TabsContent>
          <TabsContent value="risk" className="mt-6">
            <RiskAnalysisView />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
