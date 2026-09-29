import axiosClient from './axiosClient';
import type { ApiResponse } from '../types/auth';
import type { CategoryPreference, ChurnRiskCustomer, DashboardSummary, MonthlyRevenue, RfmDistribution } from '../types/analytics';

export const analyticsApi = {
  getDashboard: (): Promise<ApiResponse<DashboardSummary>> => {
    return axiosClient.get('/analytics/dashboard');
  },

  getRfmDistribution: (): Promise<ApiResponse<RfmDistribution>> => {
    return axiosClient.get('/analytics/rfm-distribution');
  },

  getChurnRisk: (): Promise<ApiResponse<ChurnRiskCustomer[]>> => {
    return axiosClient.get('/analytics/churn-risk');
  },

  getCategoryPreference: (): Promise<ApiResponse<CategoryPreference[]>> => {
    return axiosClient.get('/analytics/category-preference');
  },

  getRevenueTrends: (): Promise<ApiResponse<MonthlyRevenue[]>> => {
    return axiosClient.get('/analytics/revenue-trends');
  },
};
