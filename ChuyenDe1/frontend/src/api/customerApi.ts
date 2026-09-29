import axiosClient from './axiosClient';
import type { ApiResponse, PageResponse } from '../types/auth';
import type { CustomerDetailDto, CustomerSegmentDto, OrderDto, SegmentHistory, UserActivityLogDto } from '../types/customer';

export interface CustomerQueryParams {
  segment?: string;
  keyword?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'asc' | 'desc';
}

export const customerApi = {
  getCustomers: (params?: CustomerQueryParams): Promise<ApiResponse<PageResponse<CustomerSegmentDto>>> => {
    return axiosClient.get('/customers', { params });
  },

  getCustomerDetail: (id: number): Promise<ApiResponse<CustomerDetailDto>> => {
    return axiosClient.get(`/customers/${id}`);
  },

  getCustomerOrders: (id: number, page = 0, size = 10): Promise<ApiResponse<PageResponse<OrderDto>>> => {
    return axiosClient.get(`/customers/${id}/orders`, { params: { page, size } });
  },

  getCustomerActivities: (id: number, page = 0, size = 15): Promise<ApiResponse<PageResponse<UserActivityLogDto>>> => {
    return axiosClient.get(`/customers/${id}/activities`, { params: { page, size } });
  },

  getCustomerSegmentHistory: (id: number): Promise<ApiResponse<SegmentHistory[]>> => {
    return axiosClient.get(`/customers/${id}/segment-history`);
  },
};
