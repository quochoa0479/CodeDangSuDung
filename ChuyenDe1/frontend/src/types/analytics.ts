export interface SegmentSummary {
  segment: string;
  total_customers: number;
  percentage: number;
  avg_recency_days: number;
  avg_orders: number;
  avg_monetary: number;
  total_revenue: number;
  avg_rfm_score: number;
}

export interface MonthlyRevenue {
  orderMonth: string;
  activeCustomers: number;
  totalOrders: number;
  monthlyRevenue: number;
  avgOrderValue: number;
}

export interface CategoryPreference {
  segment: string;
  categoryName: string;
  totalItemsSold: number;
  categoryRevenue: number;
}

export interface DashboardSummary {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  avgSpendPerCustomer: number;
  churnRiskCount: number;
  segmentDistribution: Array<{ segment: string; count: number; avgScore: number }>;
  vrfmSummary: SegmentSummary[];
  monthlyTrends: MonthlyRevenue[];
  topCategoryPreferences: CategoryPreference[];
}

export interface RfmMatrixCell {
  rScore: number;
  fScore: number;
  count: number;
}

export interface ScoreDistribution {
  score: number;
  count: number;
}

export interface RfmDistribution {
  rdistribution: ScoreDistribution[];
  fdistribution: ScoreDistribution[];
  mdistribution: ScoreDistribution[];
  heatmapMatrix: RfmMatrixCell[];
}

export interface ChurnRiskCustomer {
  customerId: number;
  customerCode: string;
  fullName: string;
  email: string;
  phone: string;
  segment: string;
  recencyDays: number;
  frequency: number;
  monetary: number;
  lastPurchaseAt?: string;
}
