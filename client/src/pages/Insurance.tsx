import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Shield, Users, Heart, Umbrella, TrendingUp, AlertTriangle, Calendar, Plus, Edit, Trash2, Download, Upload, FileSpreadsheet, Building, User, DollarSign, Clock, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

// Insurance types
const INSURANCE_TYPES = [
  { value: "医疗险", label: "医疗险", icon: Heart, color: "bg-blue-500" },
  { value: "重疾险", label: "重疾险", icon: Shield, color: "bg-red-500" },
  { value: "寿险", label: "寿险", icon: Users, color: "bg-purple-500" },
  { value: "意外险", label: "意外险", icon: Umbrella, color: "bg-yellow-500" },
  { value: "储蓄险", label: "储蓄险", icon: TrendingUp, color: "bg-green-500" },
  { value: "年金险", label: "年金险", icon: Calendar, color: "bg-indigo-500" },
];

// Family member interface
interface FamilyMember {
  id: number;
  name: string;
  role: string;
  relationship?: string;
  birthDate?: string;
  age?: number;
  sortOrder: number;
}

// Insurance policy interface
interface InsurancePolicy {
  id: number;
  name: string;
  company: string;
  insuranceType: string;
  insuredMemberId: number;
  policyholderMemberId?: number;
  coverageAmount?: string;
  coverageAmountText?: string;
  annualPremium?: string;
  currency: string;
  effectiveDate?: string;
  expiryDate?: string;
  coveragePeriod?: string;
  paymentMethod?: string;
  coverageDetails?: string;
  claimConditions?: string;
  status: string;
  notes?: string;
}

// Empty form state
const emptyPolicyForm: Omit<InsurancePolicy, 'id'> = {
  name: "",
  company: "",
  insuranceType: "",
  insuredMemberId: 0,
  policyholderMemberId: undefined,
  coverageAmount: "",
  coverageAmountText: "",
  annualPremium: "",
  currency: "CNY",
  effectiveDate: "",
  expiryDate: "",
  coveragePeriod: "",
  paymentMethod: "",
  coverageDetails: "",
  claimConditions: "",
  status: "active",
  notes: "",
};

const emptyMemberForm: Omit<FamilyMember, 'id'> = {
  name: "",
  role: "",
  relationship: "",
  birthDate: "",
  age: undefined,
  sortOrder: 0,
};

export default function Insurance() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  
  // Dialog states
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  
  // Form states
  const [policyForm, setPolicyForm] = useState<Omit<InsurancePolicy, 'id'>>(emptyPolicyForm);
  const [memberForm, setMemberForm] = useState<Omit<FamilyMember, 'id'>>(emptyMemberForm);

  // API queries
  const { data: familyMembers = [], refetch: refetchMembers } = trpc.familyMembers.list.useQuery();
  const { data: insurancePolicies = [], refetch: refetchPolicies } = trpc.insurance.list.useQuery();
  
  // API mutations
  const addMemberMutation = trpc.familyMembers.add.useMutation({
    onSuccess: () => {
      refetchMembers();
      setIsMemberDialogOpen(false);
      setMemberForm(emptyMemberForm);
      toast({ title: "成功", description: "家庭成员添加成功" });
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });
  
  const updateMemberMutation = trpc.familyMembers.update.useMutation({
    onSuccess: () => {
      refetchMembers();
      setIsMemberDialogOpen(false);
      setEditingMember(null);
      setMemberForm(emptyMemberForm);
      toast({ title: "成功", description: "家庭成员更新成功" });
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });
  
  const deleteMemberMutation = trpc.familyMembers.delete.useMutation({
    onSuccess: () => {
      refetchMembers();
      toast({ title: "成功", description: "家庭成员删除成功" });
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });
  
  const addPolicyMutation = trpc.insurance.add.useMutation({
    onSuccess: () => {
      refetchPolicies();
      setIsPolicyDialogOpen(false);
      setPolicyForm(emptyPolicyForm);
      toast({ title: "成功", description: "保险添加成功" });
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });
  
  const updatePolicyMutation = trpc.insurance.update.useMutation({
    onSuccess: () => {
      refetchPolicies();
      setIsPolicyDialogOpen(false);
      setEditingPolicy(null);
      setPolicyForm(emptyPolicyForm);
      toast({ title: "成功", description: "保险更新成功" });
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });
  
  const deletePolicyMutation = trpc.insurance.delete.useMutation({
    onSuccess: () => {
      refetchPolicies();
      toast({ title: "成功", description: "保险删除成功" });
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });

  const { data: exportData, refetch: fetchExport } = trpc.insurance.exportExcel.useQuery(undefined, { enabled: false });
  
  const importMutation = trpc.insurance.importExcel.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        refetchMembers();
        refetchPolicies();
        toast({ title: "成功", description: result.message });
      } else {
        toast({ title: "错误", description: result.message, variant: "destructive" });
      }
    },
    onError: (error) => {
      toast({ title: "错误", description: error.message, variant: "destructive" });
    },
  });

  // Set first member as selected when data loads
  useEffect(() => {
    if (familyMembers.length > 0 && selectedMember === null) {
      setSelectedMember(familyMembers[0].id);
    }
  }, [familyMembers, selectedMember]);

  // Create member map for quick lookup
  const memberMap = useMemo(() => {
    const map: Record<number, FamilyMember> = {};
    familyMembers.forEach(m => { map[m.id] = m; });
    return map;
  }, [familyMembers]);

  // Calculate statistics
  const stats = useMemo(() => {
    const activePolicies = insurancePolicies.filter(p => p.status === "active");
    const totalPremium = activePolicies.reduce((sum, p) => {
      const premium = parseFloat(p.annualPremium || "0");
      return sum + premium;
    }, 0);
    
    const typeStats: Record<string, { count: number; totalCoverage: number; members: Set<number> }> = {};
    activePolicies.forEach(p => {
      if (!typeStats[p.insuranceType]) {
        typeStats[p.insuranceType] = { count: 0, totalCoverage: 0, members: new Set() };
      }
      typeStats[p.insuranceType].count++;
      typeStats[p.insuranceType].totalCoverage += parseFloat(p.coverageAmount || "0");
      typeStats[p.insuranceType].members.add(p.insuredMemberId);
    });
    
    // Find expiring policies (within 90 days)
    const now = new Date();
    const expiringPolicies = activePolicies.filter(p => {
      if (!p.expiryDate) return false;
      const expiry = new Date(p.expiryDate);
      const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
    });
    
    // Find expired policies
    const expiredPolicies = insurancePolicies.filter(p => {
      if (!p.expiryDate) return false;
      return new Date(p.expiryDate) < now;
    });
    
    return {
      totalPolicies: insurancePolicies.length,
      activePolicies: activePolicies.length,
      totalPremium,
      typeStats,
      expiringPolicies,
      expiredPolicies,
      coveredMembers: new Set(activePolicies.map(p => p.insuredMemberId)).size,
    };
  }, [insurancePolicies]);

  // Handle policy form submission
  const handlePolicySubmit = () => {
    if (!policyForm.name || !policyForm.company || !policyForm.insuranceType || !policyForm.insuredMemberId) {
      toast({ title: "错误", description: "请填写必填字段", variant: "destructive" });
      return;
    }
    
    if (editingPolicy) {
      updatePolicyMutation.mutate({ id: editingPolicy.id, ...policyForm });
    } else {
      addPolicyMutation.mutate(policyForm);
    }
  };

  // Handle member form submission
  const handleMemberSubmit = () => {
    if (!memberForm.name || !memberForm.role) {
      toast({ title: "错误", description: "请填写必填字段", variant: "destructive" });
      return;
    }
    
    if (editingMember) {
      updateMemberMutation.mutate({ id: editingMember.id, ...memberForm });
    } else {
      addMemberMutation.mutate(memberForm);
    }
  };

  // Handle export
  const handleExport = async () => {
    const result = await fetchExport();
    if (result.data) {
      const link = document.createElement("a");
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.data.data}`;
      link.download = result.data.filename;
      link.click();
      toast({ title: "成功", description: "保险数据已导出" });
    }
  };

  // Handle import
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      importMutation.mutate({ data: base64 });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  // Open edit policy dialog
  const openEditPolicy = (policy: InsurancePolicy) => {
    setEditingPolicy(policy);
    setPolicyForm({
      name: policy.name,
      company: policy.company,
      insuranceType: policy.insuranceType,
      insuredMemberId: policy.insuredMemberId,
      policyholderMemberId: policy.policyholderMemberId,
      coverageAmount: policy.coverageAmount || "",
      coverageAmountText: policy.coverageAmountText || "",
      annualPremium: policy.annualPremium || "",
      currency: policy.currency,
      effectiveDate: policy.effectiveDate || "",
      expiryDate: policy.expiryDate || "",
      coveragePeriod: policy.coveragePeriod || "",
      paymentMethod: policy.paymentMethod || "",
      coverageDetails: policy.coverageDetails || "",
      claimConditions: policy.claimConditions || "",
      status: policy.status,
      notes: policy.notes || "",
    });
    setIsPolicyDialogOpen(true);
  };

  // Open edit member dialog
  const openEditMember = (member: FamilyMember) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      role: member.role,
      relationship: member.relationship || "",
      birthDate: member.birthDate || "",
      age: member.age,
      sortOrder: member.sortOrder,
    });
    setIsMemberDialogOpen(true);
  };

  // Format currency
  const formatCurrency = (amount: string | undefined, currency: string = "CNY") => {
    if (!amount) return "-";
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    const symbol = currency === "USD" ? "$" : currency === "HKD" ? "HK$" : "¥";
    return `${symbol}${num.toLocaleString()}`;
  };

  // Get days until expiry
  const getDaysUntilExpiry = (expiryDate: string | undefined) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Get status badge
  const getStatusBadge = (policy: InsurancePolicy) => {
    const days = getDaysUntilExpiry(policy.expiryDate);
    if (days !== null && days < 0) {
      return <Badge variant="destructive">已过期</Badge>;
    }
    if (days !== null && days <= 30) {
      return <Badge variant="outline" className="border-orange-500 text-orange-500">即将到期</Badge>;
    }
    if (policy.status === "active") {
      return <Badge className="bg-green-500">生效中</Badge>;
    }
    return <Badge variant="secondary">{policy.status}</Badge>;
  };

  // Get insurance type info
  const getTypeInfo = (type: string) => {
    return INSURANCE_TYPES.find(t => t.value === type) || { value: type, label: type, icon: Shield, color: "bg-gray-500" };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            家庭保险配置
          </h1>
          <p className="text-muted-foreground mt-1">全面了解家庭保险覆盖情况，识别风险缺口</p>
        </div>
        <div className="flex gap-2">
          {/* Import button */}
          <label>
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
            <Button variant="outline" asChild>
              <span className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                导入Excel
              </span>
            </Button>
          </label>
          
          {/* Export button */}
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            导出Excel
          </Button>
          
          {/* Add member button */}
          <Dialog open={isMemberDialogOpen} onOpenChange={(open) => {
            setIsMemberDialogOpen(open);
            if (!open) {
              setEditingMember(null);
              setMemberForm(emptyMemberForm);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                添加成员
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingMember ? "编辑家庭成员" : "添加家庭成员"}</DialogTitle>
                <DialogDescription>填写家庭成员信息</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="memberName" className="text-right">姓名 *</Label>
                  <Input
                    id="memberName"
                    value={memberForm.name}
                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="memberRole" className="text-right">角色 *</Label>
                  <Select value={memberForm.role} onValueChange={(v) => setMemberForm({ ...memberForm, role: v })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="选择角色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="户主">户主</SelectItem>
                      <SelectItem value="配偶">配偶</SelectItem>
                      <SelectItem value="子女">子女</SelectItem>
                      <SelectItem value="父母">父母</SelectItem>
                      <SelectItem value="其他">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="memberRelationship" className="text-right">与户主关系</Label>
                  <Input
                    id="memberRelationship"
                    value={memberForm.relationship || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, relationship: e.target.value })}
                    className="col-span-3"
                    placeholder="如：本人、妻子、儿子等"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="memberAge" className="text-right">年龄</Label>
                  <Input
                    id="memberAge"
                    type="number"
                    value={memberForm.age || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, age: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsMemberDialogOpen(false)}>取消</Button>
                <Button onClick={handleMemberSubmit}>{editingMember ? "保存" : "添加"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Add policy button */}
          <Dialog open={isPolicyDialogOpen} onOpenChange={(open) => {
            setIsPolicyDialogOpen(open);
            if (!open) {
              setEditingPolicy(null);
              setPolicyForm(emptyPolicyForm);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加保险
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPolicy ? "编辑保险" : "添加保险"}</DialogTitle>
                <DialogDescription>填写保险详细信息</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="policyName">保险名称 *</Label>
                    <Input
                      id="policyName"
                      value={policyForm.name}
                      onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                      placeholder="如：太平洋医疗险"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="policyCompany">保险公司 *</Label>
                    <Input
                      id="policyCompany"
                      value={policyForm.company}
                      onChange={(e) => setPolicyForm({ ...policyForm, company: e.target.value })}
                      placeholder="如：太平洋保险"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>险种类型 *</Label>
                    <Select value={policyForm.insuranceType} onValueChange={(v) => setPolicyForm({ ...policyForm, insuranceType: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择险种" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSURANCE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>状态</Label>
                    <Select value={policyForm.status} onValueChange={(v) => setPolicyForm({ ...policyForm, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">生效中</SelectItem>
                        <SelectItem value="expired">已过期</SelectItem>
                        <SelectItem value="pending">待生效</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* People */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>被保人 *</Label>
                    <Select 
                      value={policyForm.insuredMemberId?.toString() || ""} 
                      onValueChange={(v) => setPolicyForm({ ...policyForm, insuredMemberId: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择被保人" />
                      </SelectTrigger>
                      <SelectContent>
                        {familyMembers.map(member => (
                          <SelectItem key={member.id} value={member.id.toString()}>{member.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>投保人</Label>
                    <Select 
                      value={policyForm.policyholderMemberId?.toString() || ""} 
                      onValueChange={(v) => setPolicyForm({ ...policyForm, policyholderMemberId: v ? parseInt(v) : undefined })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择投保人" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        {familyMembers.map(member => (
                          <SelectItem key={member.id} value={member.id.toString()}>{member.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Coverage */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="coverageAmount">保额</Label>
                    <Input
                      id="coverageAmount"
                      value={policyForm.coverageAmount || ""}
                      onChange={(e) => setPolicyForm({ ...policyForm, coverageAmount: e.target.value })}
                      placeholder="如：1000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="annualPremium">年缴保费</Label>
                    <Input
                      id="annualPremium"
                      value={policyForm.annualPremium || ""}
                      onChange={(e) => setPolicyForm({ ...policyForm, annualPremium: e.target.value })}
                      placeholder="如：5000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>币种</Label>
                    <Select value={policyForm.currency} onValueChange={(v) => setPolicyForm({ ...policyForm, currency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNY">人民币</SelectItem>
                        <SelectItem value="USD">美元</SelectItem>
                        <SelectItem value="HKD">港币</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Dates */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="effectiveDate">生效日期</Label>
                    <Input
                      id="effectiveDate"
                      type="date"
                      value={policyForm.effectiveDate || ""}
                      onChange={(e) => setPolicyForm({ ...policyForm, effectiveDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">到期日期</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={policyForm.expiryDate || ""}
                      onChange={(e) => setPolicyForm({ ...policyForm, expiryDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coveragePeriod">保障期限</Label>
                    <Input
                      id="coveragePeriod"
                      value={policyForm.coveragePeriod || ""}
                      onChange={(e) => setPolicyForm({ ...policyForm, coveragePeriod: e.target.value })}
                      placeholder="如：1年、终身"
                    />
                  </div>
                </div>
                
                {/* Details */}
                <div className="space-y-2">
                  <Label htmlFor="coverageDetails">保障内容</Label>
                  <Textarea
                    id="coverageDetails"
                    value={policyForm.coverageDetails || ""}
                    onChange={(e) => setPolicyForm({ ...policyForm, coverageDetails: e.target.value })}
                    placeholder="描述保障范围和内容"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="claimConditions">赔付条件</Label>
                  <Textarea
                    id="claimConditions"
                    value={policyForm.claimConditions || ""}
                    onChange={(e) => setPolicyForm({ ...policyForm, claimConditions: e.target.value })}
                    placeholder="描述赔付条件和方式"
                    rows={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">备注</Label>
                  <Textarea
                    id="notes"
                    value={policyForm.notes || ""}
                    onChange={(e) => setPolicyForm({ ...policyForm, notes: e.target.value })}
                    placeholder="其他备注信息"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPolicyDialogOpen(false)}>取消</Button>
                <Button onClick={handlePolicySubmit}>{editingPolicy ? "保存" : "添加"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">总览</TabsTrigger>
          <TabsTrigger value="member">按成员</TabsTrigger>
          <TabsTrigger value="type">按险种</TabsTrigger>
          <TabsTrigger value="risk">风险分析</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">年度总保费</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalPremium.toString())}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">保险总数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPolicies}份</div>
                <p className="text-xs text-muted-foreground">生效中 {stats.activePolicies} 份</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">覆盖成员</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.coveredMembers}人</div>
                <p className="text-xs text-muted-foreground">共 {familyMembers.length} 位家庭成员</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">即将到期</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{stats.expiringPolicies.length}份</div>
                <p className="text-xs text-muted-foreground">90天内到期</p>
              </CardContent>
            </Card>
          </div>

          {/* Insurance type distribution */}
          <Card>
            <CardHeader>
              <CardTitle>险种分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {INSURANCE_TYPES.map(type => {
                  const stat = stats.typeStats[type.value];
                  const Icon = type.icon;
                  return (
                    <div key={type.value} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className={`p-2 rounded-full ${type.color}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {stat ? `${stat.count}份 · ${stat.members.size}人` : "暂无"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Family members coverage */}
          <Card>
            <CardHeader>
              <CardTitle>成员覆盖情况</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {familyMembers.map(member => {
                  const memberPolicies = insurancePolicies.filter(p => p.insuredMemberId === member.id && p.status === "active");
                  const types = [...new Set(memberPolicies.map(p => p.insuranceType))];
                  return (
                    <Card key={member.id} className="border">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{member.name}</CardTitle>
                            <CardDescription>{member.role} {member.age ? `· ${member.age}岁` : ""}</CardDescription>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditMember(member)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    确定要删除家庭成员 "{member.name}" 吗？此操作不可撤销。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMemberMutation.mutate({ id: member.id })}>
                                    删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {types.length > 0 ? types.map(type => {
                            const typeInfo = getTypeInfo(type);
                            return (
                              <Badge key={type} variant="secondary" className="text-xs">
                                {typeInfo.label}
                              </Badge>
                            );
                          }) : (
                            <span className="text-sm text-muted-foreground">暂无保险</span>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {memberPolicies.length} 份保险
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Member Tab */}
        <TabsContent value="member" className="space-y-6">
          {/* Member selector */}
          <div className="flex gap-2">
            {familyMembers.map(member => {
              const count = insurancePolicies.filter(p => p.insuredMemberId === member.id).length;
              return (
                <Button
                  key={member.id}
                  variant={selectedMember === member.id ? "default" : "outline"}
                  onClick={() => setSelectedMember(member.id)}
                >
                  <User className="h-4 w-4 mr-2" />
                  {member.name}
                  <Badge variant="secondary" className="ml-2">{count}</Badge>
                </Button>
              );
            })}
          </div>

          {/* Selected member's policies */}
          {selectedMember && (
            <div className="space-y-4">
              {insurancePolicies
                .filter(p => p.insuredMemberId === selectedMember)
                .map(policy => {
                  const typeInfo = getTypeInfo(policy.insuranceType);
                  const Icon = typeInfo.icon;
                  const policyholder = policy.policyholderMemberId ? memberMap[policy.policyholderMemberId] : null;
                  
                  return (
                    <Card key={policy.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${typeInfo.color}`}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{policy.name}</CardTitle>
                              <CardDescription className="flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                {policy.company}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{typeInfo.label}</Badge>
                            {getStatusBadge(policy)}
                            <Button variant="ghost" size="icon" onClick={() => openEditPolicy(policy)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    确定要删除保险 "{policy.name}" 吗？此操作不可撤销。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deletePolicyMutation.mutate({ id: policy.id })}>
                                    删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-muted-foreground">投保人</div>
                            <div className="font-medium">{policyholder?.name || "-"}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">保额</div>
                            <div className="font-medium">
                              {policy.coverageAmountText || formatCurrency(policy.coverageAmount, policy.currency)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">年缴保费</div>
                            <div className="font-medium">{formatCurrency(policy.annualPremium, policy.currency)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">保障期限</div>
                            <div className="font-medium">{policy.coveragePeriod || "-"}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-muted-foreground">生效日期</div>
                            <div className="font-medium">{policy.effectiveDate || "-"}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">到期日期</div>
                            <div className="font-medium">{policy.expiryDate || "-"}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">缴费方式</div>
                            <div className="font-medium">{policy.paymentMethod || "-"}</div>
                          </div>
                        </div>
                        {policy.coverageDetails && (
                          <div className="mb-4">
                            <div className="text-sm text-muted-foreground mb-1">保障内容</div>
                            <div className="text-sm bg-muted p-2 rounded">{policy.coverageDetails}</div>
                          </div>
                        )}
                        {policy.claimConditions && (
                          <div className="mb-4">
                            <div className="text-sm text-muted-foreground mb-1">赔付条件</div>
                            <div className="text-sm bg-muted p-2 rounded">{policy.claimConditions}</div>
                          </div>
                        )}
                        {policy.notes && (
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">备注</div>
                            <div className="text-sm bg-muted p-2 rounded">{policy.notes}</div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* Type Tab */}
        <TabsContent value="type" className="space-y-6">
          {INSURANCE_TYPES.map(type => {
            const typePolicies = insurancePolicies.filter(p => p.insuranceType === type.value);
            if (typePolicies.length === 0) return null;
            
            const totalCoverage = typePolicies.reduce((sum, p) => sum + parseFloat(p.coverageAmount || "0"), 0);
            const coveredMembers = [...new Set(typePolicies.map(p => p.insuredMemberId))];
            const Icon = type.icon;
            
            // Find nearest expiry
            const nearestExpiry = typePolicies
              .filter(p => p.expiryDate)
              .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())[0];
            
            return (
              <Card key={type.value}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${type.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle>{type.label}</CardTitle>
                      <CardDescription>{typePolicies.length} 份保险</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground">保险数量</div>
                      <div className="text-xl font-bold">{typePolicies.length}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">总保额</div>
                      <div className="text-xl font-bold">{formatCurrency(totalCoverage.toString())}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">覆盖成员</div>
                      <div className="flex flex-wrap gap-1">
                        {coveredMembers.map(id => (
                          <Badge key={id} variant="secondary">{memberMap[id]?.name}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">最近到期</div>
                      <div className="font-medium">
                        {nearestExpiry ? (
                          <span className={getDaysUntilExpiry(nearestExpiry.expiryDate)! <= 30 ? "text-orange-500" : ""}>
                            {nearestExpiry.expiryDate}
                          </span>
                        ) : "-"}
                      </div>
                    </div>
                  </div>
                  
                  {/* Policy list */}
                  <div className="space-y-2">
                    {typePolicies.map(policy => (
                      <div key={policy.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium">{policy.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {memberMap[policy.insuredMemberId]?.name} · {policy.company}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(policy.coverageAmount, policy.currency)}</div>
                            <div className="text-sm text-muted-foreground">{policy.expiryDate || "无到期日"}</div>
                          </div>
                          {getStatusBadge(policy)}
                          <Button variant="ghost" size="icon" onClick={() => openEditPolicy(policy)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risk" className="space-y-6">
          {/* Expiring policies alert */}
          {stats.expiringPolicies.length > 0 && (
            <Card className="border-orange-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-500">
                  <AlertTriangle className="h-5 w-5" />
                  即将到期提醒
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.expiringPolicies.map(policy => {
                    const days = getDaysUntilExpiry(policy.expiryDate);
                    return (
                      <div key={policy.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div>
                          <div className="font-medium">{policy.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {memberMap[policy.insuredMemberId]?.name} · {policy.insuranceType}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-orange-500">{policy.expiryDate}</div>
                          <div className="text-sm text-muted-foreground">{days}天后到期</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expired policies */}
          {stats.expiredPolicies.length > 0 && (
            <Card className="border-red-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <AlertTriangle className="h-5 w-5" />
                  已过期保险
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.expiredPolicies.map(policy => (
                    <div key={policy.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <div className="font-medium">{policy.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {memberMap[policy.insuredMemberId]?.name} · {policy.insuranceType}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-500">{policy.expiryDate}</div>
                        <Badge variant="destructive">已过期</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Coverage gaps */}
          <Card>
            <CardHeader>
              <CardTitle>覆盖缺口分析</CardTitle>
              <CardDescription>检查每位家庭成员的保险覆盖情况</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {familyMembers.map(member => {
                  const memberPolicies = insurancePolicies.filter(p => p.insuredMemberId === member.id && p.status === "active");
                  const coveredTypes = new Set(memberPolicies.map(p => p.insuranceType));
                  const missingTypes = INSURANCE_TYPES.filter(t => !coveredTypes.has(t.value));
                  
                  return (
                    <div key={member.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.role}</div>
                        </div>
                        <Badge variant={missingTypes.length === 0 ? "default" : "outline"}>
                          {missingTypes.length === 0 ? "覆盖完整" : `缺少 ${missingTypes.length} 种`}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {INSURANCE_TYPES.map(type => {
                          const hasCoverage = coveredTypes.has(type.value);
                          const Icon = type.icon;
                          return (
                            <div
                              key={type.value}
                              className={`flex flex-col items-center p-2 rounded-lg ${
                                hasCoverage ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"
                              }`}
                            >
                              <Icon className="h-5 w-5 mb-1" />
                              <span className="text-xs">{type.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>风险总结</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-700 mb-2">已覆盖风险</div>
                  <ul className="space-y-1 text-sm">
                    {Object.entries(stats.typeStats).map(([type, stat]) => (
                      <li key={type} className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {type}: {stat.count}份, 覆盖{stat.members.size}人
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="font-medium text-orange-700 mb-2">待完善事项</div>
                  <ul className="space-y-1 text-sm">
                    {stats.expiringPolicies.length > 0 && (
                      <li className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        {stats.expiringPolicies.length}份保险即将到期
                      </li>
                    )}
                    {stats.expiredPolicies.length > 0 && (
                      <li className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        {stats.expiredPolicies.length}份保险已过期
                      </li>
                    )}
                    {familyMembers.some(m => {
                      const covered = insurancePolicies.filter(p => p.insuredMemberId === m.id && p.status === "active");
                      return covered.length === 0;
                    }) && (
                      <li className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        部分成员无保险覆盖
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
