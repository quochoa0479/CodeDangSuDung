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

  previewFile: (file: File, targetTable = 'customers'): Promise<ApiResponse<CsvPreview>> => {
    return importApi.previewCsv(file, targetTable);
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

  downloadFile: async (id: number, fileName?: string): Promise<void> => {
    const res = await axiosClient.get(`/import/files/${id}/download`, {
      responseType: 'blob',
    });
    const blob = res instanceof Blob ? res : new Blob([res as any]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || `file_import_${id}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  rerunImport: (id: number, cleanBeforeImport = false): Promise<ApiResponse<ImportLog>> => {
    return axiosClient.post(`/import/files/${id}/rerun?cleanBeforeImport=${cleanBeforeImport}`);
  },

  deleteImportLog: (id: number): Promise<ApiResponse<string>> => {
    return axiosClient.delete(`/import/history/${id}`);
  },
};
