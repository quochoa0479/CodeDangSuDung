import axiosClient from './axiosClient';
import type { ApiResponse, PageResponse } from '../types/auth';
import type { CsvPreview, ImportLog, ImportMapping, ImportRequest } from '../types/import';

export const importApi = {
  previewCsv: (file: File, targetTable = 'customers'): Promise<ApiResponse<CsvPreview>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetTable', targetTable);

    return axiosClient.post('/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  executeImport: (data: ImportRequest): Promise<ApiResponse<ImportLog>> => {
    return axiosClient.post('/import/execute', data);
  },

  generateSampleData: (customerCount = 50): Promise<ApiResponse<{ createdCustomers: number; createdOrders: number; createdActivities: number; message: string }>> => {
    return axiosClient.post(`/import/generate?customerCount=${customerCount}`);
  },

  getMappings: (targetTable?: string): Promise<ApiResponse<ImportMapping[]>> => {
    return axiosClient.get('/import/mappings', { params: { targetTable } });
  },

  saveMapping: (data: { name: string; tableTarget: string; mappingConfig: Record<string, string> }): Promise<ApiResponse<ImportMapping>> => {
    return axiosClient.post('/import/mappings', data);
  },

  deleteMapping: (id: number): Promise<ApiResponse<string>> => {
    return axiosClient.delete(`/import/mappings/${id}`);
  },

  getImportHistory: (page = 0, size = 10): Promise<ApiResponse<PageResponse<ImportLog>>> => {
    return axiosClient.get('/import/history', { params: { page, size } });
  },
};
