export interface CsvPreview {
  fileId: string;
  fileName: string;
  totalRows: number;
  headers: string[];
  sampleRows: Record<string, string>[];
  targetFields: string[];
  fileFormat?: string; // 'CSV' | 'EXCEL' | 'JSON' | 'XML'
}

export type FilePreview = CsvPreview;

export interface ImportRequest {
  fileId: string;
  targetTable: string;
  columnMapping: Record<string, string>;
  saveAsTemplate?: boolean;
  templateName?: string;
}

export interface ImportMapping {
  id: number;
  name: string;
  tableTarget: string;
  mappingConfig: string; // JSON string
  createdAt: string;
  updatedAt?: string;
}

export interface ImportLog {
  id: number;
  importType: string;
  source: string;
  tableName: string;
  recordsImported: number;
  recordsUpdated: number;
  recordsFailed: number;
  status: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}
