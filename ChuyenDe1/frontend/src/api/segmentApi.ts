import axiosClient from './axiosClient';
import type { ApiResponse, PageResponse } from '../types/auth';
import type { CustomerSegmentDto, SegmentHistory } from '../types/customer';
import type { SegmentSummary } from '../types/analytics';

export const segmentApi = {
  getSegments: (segment?: string, page = 0, size = 20): Promise<ApiResponse<PageResponse<CustomerSegmentDto>>> => {
    return axiosClient.get('/segments', { params: { segment, page, size } });
  },

  getOverview: (): Promise<ApiResponse<SegmentSummary[]>> => {
    return axiosClient.get('/segments/overview');
  },

  recalculate: (): Promise<ApiResponse<string>> => {
    return axiosClient.post('/segments/recalculate');
  },

  getHistory: (page = 0, size = 15): Promise<ApiResponse<PageResponse<SegmentHistory>>> => {
    return axiosClient.get('/segments/history', { params: { page, size } });
  },
};
