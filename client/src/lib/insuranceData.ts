// 家庭保险数据类型定义和初始数据

export interface FamilyMember {
  id: string;
  name: string;
  age: number;
  role: string;
  relationship: string;
}

export interface InsurancePolicy {
  id: string;
  name: string;
  company: string;
  type: InsuranceType;
  insuredId: string;
  policyholderId: string;
  premium: number;
  premiumCurrency: string;
  coverage: number;
  coverageCurrency: string;
  startDate: string;
  endDate: string;
  paymentYears: number;
  coverageYears: string;
  status: 'active' | 'expired' | 'pending';
  paymentMethod: string;
  claimConditions: string;
  benefits: string[];
  notes: string;
}

export type InsuranceType = 
  | 'medical'
  | 'critical_illness'
  | 'life'
  | 'accident'
  | 'savings'
  | 'annuity';

export const insuranceTypeLabels: Record<InsuranceType, string> = {
  medical: '医疗险',
  critical_illness: '重疾险',
  life: '寿险',
  accident: '意外险',
  savings: '储蓄险',
  annuity: '年金险',
};

export const insuranceTypeColors: Record<InsuranceType, string> = {
  medical: 'hsl(199, 89%, 48%)',
  critical_illness: 'hsl(0, 84%, 60%)',
  life: 'hsl(142, 71%, 45%)',
  accident: 'hsl(38, 92%, 50%)',
  savings: 'hsl(262, 83%, 58%)',
  annuity: 'hsl(280, 65%, 60%)',
};

export const familyMembers: FamilyMember[] = [
  { id: 'wutong', name: '吴桐', age: 30, role: '户主', relationship: '本人' },
  { id: 'duanxiaohan', name: '段小涵', age: 28, role: '配偶', relationship: '老婆' },
  { id: 'parents', name: '父母', age: 55, role: '父母', relationship: '吴桐父母' },
];

export const insurancePolicies: InsurancePolicy[] = [
  {
    id: 'wt-savings-1',
    name: '周大福人寿「匠心·传承」储蓄寿险计划2（尊尚版）',
    company: '周大福人寿',
    type: 'savings',
    insuredId: 'wutong',
    policyholderId: 'wutong',
    premium: 140000,
    premiumCurrency: 'USD',
    coverage: 0,
    coverageCurrency: 'USD',
    startDate: '2023-01-01',
    endDate: '2028-01-01',
    paymentYears: 5,
    coverageYears: '终身',
    status: 'active',
    paymentMethod: '年缴',
    claimConditions: '身故赔付保额，可传承给下一代',
    benefits: ['长线储蓄增值', '财富跃进选项提升预期回报', '保单双传承方案', '无限次转换受保人'],
    notes: '已交两年，第一年2万美金，第二年17620美金',
  },
  {
    id: 'wt-accident-1',
    name: '太平洋小蜜蜂个人长期意外险',
    company: '太平洋保险',
    type: 'accident',
    insuredId: 'wutong',
    policyholderId: 'wutong',
    premium: 156,
    premiumCurrency: 'CNY',
    coverage: 300000,
    coverageCurrency: 'CNY',
    startDate: '2025-12-12',
    endDate: '2026-12-14',
    paymentYears: 1,
    coverageYears: '1年',
    status: 'active',
    paymentMethod: '邮政卡自动扣款',
    claimConditions: '意外身故/伤残按比例赔付，意外医疗0免赔100%报销',
    benefits: ['意外身故最高30万', '意外伤残按等级赔付10%-100%', '意外医疗不限社保，0免赔'],
    notes: '已缴费：2024.12.15-2025.12.14，2025.12.12-2026.12.14',
  },
  {
    id: 'wt-medical-1',
    name: '太平洋医疗险',
    company: '太平洋保险',
    type: 'medical',
    insuredId: 'wutong',
    policyholderId: 'duanxiaohan',
    premium: 200,
    premiumCurrency: 'CNY',
    coverage: 1000000,
    coverageCurrency: 'CNY',
    startDate: '2024-12-15',
    endDate: '2025-12-14',
    paymentYears: 1,
    coverageYears: '1年',
    status: 'active',
    paymentMethod: '从段小涵医保扣除',
    claimConditions: '住院医疗费用报销',
    benefits: ['住院医疗费用报销', '门诊手术费用'],
    notes: '段小涵购买',
  },
  {
    id: 'wt-critical-1',
    name: '达尔文10号重大疾病保险',
    company: '瑞华保险',
    type: 'critical_illness',
    insuredId: 'wutong',
    policyholderId: 'wutong',
    premium: 4599,
    premiumCurrency: 'CNY',
    coverage: 300000,
    coverageCurrency: 'CNY',
    startDate: '2025-12-17',
    endDate: '2099-12-31',
    paymentYears: 20,
    coverageYears: '终身',
    status: 'active',
    paymentMethod: '邮政卡自动扣款',
    claimConditions: '确诊重疾即赔100%保额，中症60%，轻症30%',
    benefits: ['110种重疾100%保额赔付', '35种中症60%保额赔付3次', '60岁前重疾额外赔80%'],
    notes: '交20年保终身，已缴费：2025.12.17-2026.12.16',
  },
  {
    id: 'wt-life-1',
    name: '国寿定期寿险',
    company: '中国人寿',
    type: 'life',
    insuredId: 'wutong',
    policyholderId: 'parents',
    premium: 0,
    premiumCurrency: 'CNY',
    coverage: 50000,
    coverageCurrency: 'CNY',
    startDate: '2016-01-01',
    endDate: '2026-01-01',
    paymentYears: 0,
    coverageYears: '30年',
    status: 'active',
    paymentMethod: '父母已缴清',
    claimConditions: '身故/高度残疾赔付保额',
    benefits: ['身故保障5万', '高度残疾保障'],
    notes: '父母购买，2016-2026保30年，即将到期',
  },
  {
    id: 'wt-critical-2',
    name: '国寿康宁终身重疾险',
    company: '中国人寿',
    type: 'critical_illness',
    insuredId: 'wutong',
    policyholderId: 'parents',
    premium: 0,
    premiumCurrency: 'CNY',
    coverage: 100000,
    coverageCurrency: 'CNY',
    startDate: '2013-01-01',
    endDate: '2033-01-01',
    paymentYears: 0,
    coverageYears: '终身',
    status: 'active',
    paymentMethod: '父母已缴清',
    claimConditions: '重大疾病2倍赔付，身故3倍赔付',
    benefits: ['重大疾病2倍保额赔付（20万）', '身故3倍保额赔付（30万）'],
    notes: '父母购买，2013-2033保终身',
  },
  {
    id: 'parents-medical-1',
    name: '太平洋普惠蓝医保',
    company: '太平洋保险',
    type: 'medical',
    insuredId: 'parents',
    policyholderId: 'wutong',
    premium: 899,
    premiumCurrency: 'CNY',
    coverage: 4000000,
    coverageCurrency: 'CNY',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    paymentYears: 1,
    coverageYears: '1年',
    status: 'active',
    paymentMethod: '邮政卡自动扣款',
    claimConditions: '住院医疗费用报销，重疾特需医疗400万',
    benefits: ['一般医疗费用百万保额', '重度疾病特需医疗400万', '130种特药100%报销'],
    notes: '吴桐购买，每年一买，2024年794元，2025年899元',
  },
  {
    id: 'parents-accident-1',
    name: '意外险（未知）',
    company: '未知',
    type: 'accident',
    insuredId: 'parents',
    policyholderId: 'parents',
    premium: 0,
    premiumCurrency: 'CNY',
    coverage: 0,
    coverageCurrency: 'CNY',
    startDate: '',
    endDate: '',
    paymentYears: 0,
    coverageYears: '未知',
    status: 'pending',
    paymentMethod: '未知',
    claimConditions: '未知',
    benefits: [],
    notes: '父母自己购买，详情未知',
  },
  {
    id: 'dxh-accident-1',
    name: '意外险（未知）',
    company: '未知',
    type: 'accident',
    insuredId: 'duanxiaohan',
    policyholderId: 'duanxiaohan-father',
    premium: 0,
    premiumCurrency: 'CNY',
    coverage: 0,
    coverageCurrency: 'CNY',
    startDate: '',
    endDate: '',
    paymentYears: 0,
    coverageYears: '未知',
    status: 'pending',
    paymentMethod: '未知',
    claimConditions: '未知',
    benefits: [],
    notes: '段父购买，详情未知',
  },
  {
    id: 'dxh-medical-1',
    name: '医疗险（未知）',
    company: '未知',
    type: 'medical',
    insuredId: 'duanxiaohan',
    policyholderId: 'duanxiaohan-father',
    premium: 0,
    premiumCurrency: 'CNY',
    coverage: 0,
    coverageCurrency: 'CNY',
    startDate: '',
    endDate: '',
    paymentYears: 0,
    coverageYears: '未知',
    status: 'pending',
    paymentMethod: '未知',
    claimConditions: '未知',
    benefits: [],
    notes: '段父购买，详情未知',
  },
  {
    id: 'dxh-critical-1',
    name: '重疾险（未知）',
    company: '未知',
    type: 'critical_illness',
    insuredId: 'duanxiaohan',
    policyholderId: 'duanxiaohan-father',
    premium: 0,
    premiumCurrency: 'CNY',
    coverage: 0,
    coverageCurrency: 'CNY',
    startDate: '',
    endDate: '',
    paymentYears: 0,
    coverageYears: '未知',
    status: 'pending',
    paymentMethod: '未知',
    claimConditions: '未知',
    benefits: [],
    notes: '段父购买，详情未知',
  },
  {
    id: 'dxh-life-1',
    name: '终身寿险',
    company: '未知',
    type: 'life',
    insuredId: 'duanxiaohan',
    policyholderId: 'unknown',
    premium: 0,
    premiumCurrency: 'CNY',
    coverage: 1000000,
    coverageCurrency: 'CNY',
    startDate: '',
    endDate: '',
    paymentYears: 0,
    coverageYears: '终身',
    status: 'pending',
    paymentMethod: '未知',
    claimConditions: '身故赔付100万',
    benefits: ['身故保障100万'],
    notes: '保额100万，其他详情未知',
  },
  {
    id: 'dxh-savings-1',
    name: '香港储蓄险',
    company: '未知（香港保险公司）',
    type: 'savings',
    insuredId: 'duanxiaohan',
    policyholderId: 'duanxiaohan',
    premium: 210000,
    premiumCurrency: 'USD',
    coverage: 0,
    coverageCurrency: 'USD',
    startDate: '2023-01-01',
    endDate: '2028-01-01',
    paymentYears: 5,
    coverageYears: '终身',
    status: 'active',
    paymentMethod: '年缴',
    claimConditions: '储蓄增值，身故赔付',
    benefits: ['长线储蓄增值', '财富传承'],
    notes: '一年3万美金交5年，已交两年共6万美金',
  },
];

export function getMemberPolicies(memberId: string): InsurancePolicy[] {
  return insurancePolicies.filter(p => p.insuredId === memberId);
}

export function getPoliciesByType(type: InsuranceType): InsurancePolicy[] {
  return insurancePolicies.filter(p => p.type === type);
}

export function getExpiringPolicies(days: number = 30): InsurancePolicy[] {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return insurancePolicies.filter(p => {
    if (!p.endDate || p.status !== 'active') return false;
    const endDate = new Date(p.endDate);
    return endDate >= now && endDate <= futureDate;
  });
}

export function getTotalAnnualPremium(): number {
  return insurancePolicies
    .filter(p => p.status === 'active')
    .reduce((sum, p) => {
      const premium = p.premiumCurrency === 'USD' ? p.premium * 7 : p.premium;
      return sum + premium;
    }, 0);
}

export interface RiskAnalysis {
  riskType: string;
  description: string;
  covered: boolean;
  coverageLevel: 'none' | 'low' | 'medium' | 'high';
  members: string[];
  gaps: string[];
  recommendations: string[];
}

export function analyzeRisks(): RiskAnalysis[] {
  return [
    {
      riskType: '疾病风险',
      description: '重大疾病导致的医疗费用和收入损失',
      covered: true,
      coverageLevel: 'medium',
      members: ['吴桐'],
      gaps: ['段小涵重疾险详情未知', '父母无重疾险'],
      recommendations: ['确认段小涵重疾险保额', '考虑为父母配置重疾险'],
    },
    {
      riskType: '医疗费用风险',
      description: '住院和门诊医疗费用',
      covered: true,
      coverageLevel: 'high',
      members: ['吴桐', '父母'],
      gaps: ['段小涵医疗险详情未知'],
      recommendations: ['确认段小涵医疗险保障范围'],
    },
    {
      riskType: '意外风险',
      description: '意外事故导致的伤残或身故',
      covered: true,
      coverageLevel: 'medium',
      members: ['吴桐'],
      gaps: ['段小涵意外险详情未知', '父母意外险详情未知'],
      recommendations: ['确认家庭成员意外险保额'],
    },
    {
      riskType: '身故风险',
      description: '家庭经济支柱身故导致的收入损失',
      covered: true,
      coverageLevel: 'medium',
      members: ['吴桐', '段小涵'],
      gaps: ['吴桐国寿定期寿险即将到期（2026年）'],
      recommendations: ['吴桐需要续保或新购定期寿险'],
    },
    {
      riskType: '养老储蓄风险',
      description: '退休后的生活保障',
      covered: true,
      coverageLevel: 'medium',
      members: ['吴桐', '段小涵'],
      gaps: [],
      recommendations: ['继续按时缴纳储蓄险保费'],
    },
  ];
}
