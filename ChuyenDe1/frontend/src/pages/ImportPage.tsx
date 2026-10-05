import React, { useEffect, useState } from 'react';
import {
  Card,
  Steps,
  Select,
  Upload,
  Button,
  Table,
  Form,
  Input,
  Checkbox,
  Row,
  Col,
  Tag,
  Result,
  message,
  Tabs,
  Space,
  InputNumber,
} from 'antd';
import {
  InboxOutlined,
  CloudUploadOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { importApi } from '../api/importApi';
import { segmentApi } from '../api/segmentApi';
import type { CsvPreview, ImportLog, ImportMapping } from '../types/import';
import { formatNumber, formatDateTime } from '../utils/formatters';

const { Dragger } = Upload;

const TARGET_TABLES = [
  { value: 'customers', label: 'Bảng Khách Hàng (customers)', icon: '👥' },
  { value: 'orders', label: 'Bảng Đơn Hàng (orders)', icon: '📦' },
  { value: 'products', label: 'Bảng Sản Phẩm (products)', icon: '🏷️' },
  { value: 'user_activities', label: 'Bảng Nhật Ký Hoạt Động (user_activities)', icon: '⚡' },
];

export const ImportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('wizard');

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [targetTable, setTargetTable] = useState('customers');
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<CsvPreview | null>(null);
  const [mappings, setMappings] = useState<ImportMapping[]>([]);
  const [selectedMappingId, setSelectedMappingId] = useState<number | undefined>();

  // Mapping Form State
  const [mappingForm] = Form.useForm();
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportLog | null>(null);

  // Data Generator State
  const [genCount, setGenCount] = useState<number>(50);
  const [generating, setGenerating] = useState(false);

  // History State
  const [historyLogs, setHistoryLogs] = useState<ImportLog[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load mappings whenever targetTable changes
  useEffect(() => {
    fetchMappings(targetTable);
  }, [targetTable]);

  // Load history when tab is active
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(historyPage);
    }
  }, [activeTab, historyPage]);

  const fetchMappings = async (table: string) => {
    try {
      const res = await importApi.getMappings(table);
      if (res.success && res.data) {
        setMappings(res.data);
      }
    } catch (err: any) {
      console.error('Lỗi nạp cấu hình mẫu:', err);
    }
  };

  const fetchHistory = async (page: number) => {
    setHistoryLoading(true);
    try {
      const res = await importApi.getImportHistory(page - 1, 10);
      if (res.success && res.data) {
        setHistoryLogs(res.data.content);
        setHistoryTotal(res.data.totalElements);
      }
    } catch (err: any) {
      message.error('Không thể tải lịch sử import');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Step 2: Upload & Preview File (Excel, JSON, XML, CSV)
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await importApi.previewFile(file, targetTable);
      if (res.success && res.data) {
        setPreviewData(res.data);
        const formatLabel = res.data.fileFormat || 'dữ liệu';
        message.success(`Đã phân tích tệp ${formatLabel} (${res.data.fileName}): ${res.data.totalRows} dòng dữ liệu`);

        // Smart auto-match headers to target fields (case-insensitive & snake/camel agnostic)
        const initialMapping: Record<string, string> = {};
        res.data.targetFields.forEach((field) => {
          const normField = field.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchedHeader = res.data.headers.find((h) => {
            const normHeader = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            return (
              h.toLowerCase().trim() === field.toLowerCase().trim() ||
              normHeader === normField ||
              normHeader.includes(normField) ||
              normField.includes(normHeader)
            );
          });
          if (matchedHeader) {
            initialMapping[field] = matchedHeader;
          }
        });

        mappingForm.setFieldsValue(initialMapping);
        setCurrentStep(1); // Advance to preview & mapping step
      } else {
        message.error(res.message || 'Không thể xem trước tệp dữ liệu');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi gửi tệp lên máy chủ');
    } finally {
      setUploading(false);
    }
    return false; // Prevent automatic antd upload
  };

  // Apply saved template
  const handleApplyTemplate = (mappingId: number) => {
    setSelectedMappingId(mappingId);
    const template = mappings.find((m) => m.id === mappingId);
    if (template && template.mappingConfig) {
      try {
        const config = JSON.parse(template.mappingConfig);
        mappingForm.setFieldsValue(config);
        message.info(`Đã áp dụng mẫu cấu hình: ${template.name}`);
      } catch (e) {
        message.error('Cấu hình mẫu không hợp lệ');
      }
    }
  };

  // Step 3 -> 4: Execute Import
  const handleExecuteImport = async () => {
    if (!previewData) return;

    try {
      const values = await mappingForm.validateFields();
      setImporting(true);

      const res = await importApi.executeImport({
        fileId: previewData.fileId,
        targetTable,
        columnMapping: values,
        saveAsTemplate,
        templateName: saveAsTemplate ? templateName : undefined,
      });

      if (res.success && res.data) {
        setImportResult(res.data);
        setCurrentStep(3); // Result step
        message.success('Nhập dữ liệu thành công!');
      } else {
        message.error(res.message || 'Import thất bại');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi trong quá trình import dữ liệu');
    } finally {
      setImporting(false);
    }
  };

  // Synthetic Generator
  const handleGenerateData = async () => {
    setGenerating(true);
    try {
      const res = await importApi.generateSampleData(genCount);
      if (res.success && res.data) {
        ModalConfirm(res.data);
      } else {
        message.error(res.message || 'Không thể sinh dữ liệu');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi sinh dữ liệu mẫu');
    } finally {
      setGenerating(false);
    }
  };

  const ModalConfirm = (data: any) => {
    message.success(`Đã tạo thành công ${data.createdCustomers} KH, ${data.createdOrders} đơn hàng và ${data.createdActivities} nhật ký hoạt động!`);
    segmentApi.recalculate();
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setPreviewData(null);
    setImportResult(null);
    setSaveAsTemplate(false);
    setTemplateName('');
    mappingForm.resetFields();
  };

  const getFormatBadge = (format?: string) => {
    const f = (format || '').toUpperCase();
    if (f === 'EXCEL') {
      return <Tag color="green" icon={<FileExcelOutlined />}>Excel (.xlsx / .xls)</Tag>;
    }
    if (f === 'JSON') {
      return <Tag color="gold" icon={<CodeOutlined />}>JSON (.json)</Tag>;
    }
    if (f === 'XML') {
      return <Tag color="purple" icon={<CodeOutlined />}>XML (.xml)</Tag>;
    }
    return <Tag color="blue" icon={<FileTextOutlined />}>CSV (.csv)</Tag>;
  };

  const historyColumns = [
    {
      title: 'Mã lô',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => <span style={{ fontFamily: 'monospace' }}>#{id}</span>,
    },
    {
      title: 'Bảng đích',
      dataIndex: 'tableName',
      key: 'tableName',
      render: (t: string) => <Tag color="geekblue">{t}</Tag>,
    },
    {
      title: 'Nguồn định dạng',
      dataIndex: 'source',
      key: 'source',
      render: (s: string) => {
        const upper = (s || '').toUpperCase();
        if (upper === 'EXCEL') return <Tag color="green">EXCEL</Tag>;
        if (upper === 'JSON') return <Tag color="gold">JSON</Tag>;
        if (upper === 'XML') return <Tag color="purple">XML</Tag>;
        if (upper === 'CSV') return <Tag color="blue">CSV</Tag>;
        if (upper === 'GENERATED') return <Tag color="orange">SINH DỮ LIỆU</Tag>;
        return <Tag color="default">{s}</Tag>;
      },
    },
    {
      title: 'Số bản ghi nhập mới',
      dataIndex: 'recordsImported',
      key: 'recordsImported',
      render: (num: number) => <strong style={{ color: '#10B981' }}>+{formatNumber(num)}</strong>,
    },
    {
      title: 'Cập nhật',
      dataIndex: 'recordsUpdated',
      key: 'recordsUpdated',
      render: (num: number) => (
        <span style={{ color: num > 0 ? '#38BDF8' : '#64748B' }}>{formatNumber(num || 0)}</span>
      ),
    },
    {
      title: 'Lỗi / Bỏ qua',
      dataIndex: 'recordsFailed',
      key: 'recordsFailed',
      render: (num: number) => (
        <span style={{ color: num > 0 ? '#EF4444' : '#64748B' }}>{formatNumber(num)}</span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => {
        if (st === 'SUCCESS') return <Tag color="success">Thành công</Tag>;
        if (st === 'FAILED') return <Tag color="error">Thất bại</Tag>;
        return <Tag color="warning">{st}</Tag>;
      },
    },
    {
      title: 'Thời gian',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (date: string) => formatDateTime(date),
    },
  ];

  return (
    <div className="animate-fade-up">
      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            marginBottom: '4px',
          }}
        >
          Nhập & Đồng Bộ Dữ Liệu Đa Nguồn
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Hỗ trợ nạp dữ liệu từ các tệp Excel (.xlsx, .xls), JSON (.json), XML (.xml) và CSV (.csv) với cơ chế tự động nhận diện và ánh xạ cột thông minh
        </p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'wizard',
            label: (
              <span>
                <CloudUploadOutlined /> Trình Nạp Dữ Liệu Thông Minh
              </span>
            ),
            children: (
              <Card className="glass-card" style={{ marginTop: '12px' }}>
                <Steps
                  current={currentStep}
                  style={{ marginBottom: '36px' }}
                  items={[
                    { title: 'Chọn bảng đích' },
                    { title: 'Tải & Xem trước tệp' },
                    { title: 'Ánh xạ cột dữ liệu' },
                    { title: 'Kết quả hoàn tất' },
                  ]}
                />

                {/* STEP 0: Chọn bảng đích & Upload */}
                {currentStep === 0 && (
                  <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
                      Bước 1: Chọn bảng dữ liệu cần nhập vào hệ thống
                    </h3>
                    <Select
                      style={{ width: '100%', marginBottom: '24px' }}
                      size="large"
                      value={targetTable}
                      onChange={setTargetTable}
                    >
                      {TARGET_TABLES.map((t) => (
                        <Select.Option key={t.value} value={t.value}>
                          <span style={{ fontSize: '16px', marginRight: '8px' }}>{t.icon}</span>
                          {t.label}
                        </Select.Option>
                      ))}
                    </Select>

                    <div style={{ marginTop: '20px' }}>
                      <Dragger
                        accept=".csv, .xlsx, .xls, .json, .xml, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/json, text/xml, text/csv"
                        beforeUpload={handleFileUpload}
                        showUploadList={false}
                        disabled={uploading}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderColor: 'rgba(99, 102, 241, 0.3)',
                          padding: '36px 20px',
                          borderRadius: '14px',
                        }}
                      >
                        <p className="ant-upload-drag-icon">
                          <InboxOutlined style={{ color: '#6366F1', fontSize: '52px' }} />
                        </p>
                        <p className="ant-upload-text" style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '16px' }}>
                          Kéo thả tệp dữ liệu vào đây hoặc nhấp để chọn tệp
                        </p>
                        <p className="ant-upload-hint" style={{ color: '#94A3B8', fontSize: '13px', margin: '8px 0 16px' }}>
                          Tự động nhận diện cấu trúc, tiêu đề và làm sạch dữ liệu
                        </p>

                        {/* Format badges */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <Tag color="green" icon={<FileExcelOutlined />} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                            Excel (.xlsx, .xls)
                          </Tag>
                          <Tag color="blue" icon={<FileTextOutlined />} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                            CSV (.csv)
                          </Tag>
                          <Tag color="gold" icon={<CodeOutlined />} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                            JSON (.json)
                          </Tag>
                          <Tag color="purple" icon={<CodeOutlined />} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                            XML (.xml)
                          </Tag>
                        </div>
                      </Dragger>
                    </div>
                  </div>
                )}

                {/* STEP 1: Xem trước dữ liệu */}
                {currentStep === 1 && previewData && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                            Bước 2: Xem trước tệp dữ liệu ({previewData.fileName})
                          </h3>
                          {getFormatBadge(previewData.fileFormat)}
                        </div>
                        <span style={{ color: '#94A3B8', fontSize: '12px' }}>
                          Tổng số dòng: <strong>{formatNumber(previewData.totalRows)}</strong> • Cột phát hiện: <strong>{previewData.headers.length}</strong>
                        </span>
                      </div>
                      <Space>
                        <Button onClick={resetWizard}>Chọn lại tệp</Button>
                        <Button type="primary" onClick={() => setCurrentStep(2)}>
                          Tiếp tục cấu hình ánh xạ ➔
                        </Button>
                      </Space>
                    </div>

                    <Table
                      dataSource={previewData.sampleRows.map((row, idx) => ({ ...row, _key: idx }))}
                      columns={previewData.headers.map((h) => ({
                        title: h,
                        dataIndex: h,
                        key: h,
                        ellipsis: true,
                      }))}
                      rowKey="_key"
                      size="small"
                      pagination={false}
                      scroll={{ x: 'max-content' }}
                      style={{ marginBottom: '24px' }}
                    />
                  </div>
                )}

                {/* STEP 2: Ánh xạ cột */}
                {currentStep === 2 && previewData && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                            Bước 3: Cấu hình ánh xạ cột cho bảng "{targetTable}"
                          </h3>
                          {getFormatBadge(previewData.fileFormat)}
                        </div>
                        <span style={{ color: '#94A3B8', fontSize: '12px' }}>
                          Chọn cột / trường từ tệp {previewData.fileFormat || 'dữ liệu'} tương ứng với từng trường trong cơ sở dữ liệu
                        </span>
                      </div>

                      {/* Saved Templates Dropdown */}
                      {mappings.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#94A3B8' }}>Mẫu có sẵn:</span>
                          <Select
                            placeholder="Chọn mẫu ánh xạ"
                            style={{ width: '220px' }}
                            value={selectedMappingId}
                            onChange={handleApplyTemplate}
                            allowClear
                          >
                            {mappings.map((m) => (
                              <Select.Option key={m.id} value={m.id}>
                                {m.name}
                              </Select.Option>
                            ))}
                          </Select>
                        </div>
                      )}
                    </div>

                    <Form form={mappingForm} layout="vertical">
                      <Row gutter={[16, 8]}>
                        {previewData.targetFields.map((field) => (
                          <Col xs={24} sm={12} md={8} key={field}>
                            <Form.Item
                              label={
                                <span style={{ fontWeight: 600, color: '#E2E8F0' }}>
                                  Trường DB: <code style={{ color: '#818CF8' }}>{field}</code>
                                </span>
                              }
                              name={field}
                            >
                              <Select placeholder="Chọn cột từ tệp (hoặc bỏ trống)" allowClear>
                                {previewData.headers.map((h) => (
                                  <Select.Option key={h} value={h}>
                                    📄 {h}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                        ))}
                      </Row>

                      {/* Save Template Option */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          padding: '16px',
                          borderRadius: '8px',
                          margin: '20px 0',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <Checkbox
                          checked={saveAsTemplate}
                          onChange={(e) => setSaveAsTemplate(e.target.checked)}
                          style={{ color: '#E2E8F0' }}
                        >
                          Lưu cấu hình ánh xạ này làm mẫu dùng lại cho lần sau
                        </Checkbox>

                        {saveAsTemplate && (
                          <div style={{ marginTop: '12px', maxWidth: '400px' }}>
                            <Input
                              placeholder="Ví dụ: Shopee Customer Export Template"
                              value={templateName}
                              onChange={(e) => setTemplateName(e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                        <Button onClick={() => setCurrentStep(1)}>Quay lại xem trước</Button>
                        <Button
                          type="primary"
                          icon={<CloudUploadOutlined />}
                          loading={importing}
                          onClick={handleExecuteImport}
                        >
                          Tiến hành Import Dữ Liệu
                        </Button>
                      </div>
                    </Form>
                  </div>
                )}

                {/* STEP 3: Hoàn tất & Báo cáo kết quả */}
                {currentStep === 3 && importResult && (
                  <Result
                    status="success"
                    title="Nhập Dữ Liệu Thành Công!"
                    subTitle={`Lô import #${importResult.id} (Nguồn: ${importResult.source}) vào bảng ${importResult.tableName} đã xử lý xong.`}
                    extra={[
                      <div
                        key="stats"
                        style={{
                          display: 'inline-flex',
                          gap: '24px',
                          margin: '16px auto',
                          padding: '16px 24px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '10px',
                        }}
                      >
                        <div>
                          <div style={{ color: '#94A3B8', fontSize: '12px' }}>Tạo mới</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981' }}>
                            +{formatNumber(importResult.recordsImported)}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#94A3B8', fontSize: '12px' }}>Cập nhật</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#38BDF8' }}>
                            {formatNumber(importResult.recordsUpdated || 0)}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#94A3B8', fontSize: '12px' }}>Lỗi / Bỏ qua</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#EF4444' }}>
                            {formatNumber(importResult.recordsFailed)}
                          </div>
                        </div>
                      </div>,
                      <div key="actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        <Button type="primary" onClick={resetWizard}>
                          Nhập tệp khác
                        </Button>
                        <Button
                          icon={<ThunderboltOutlined />}
                          onClick={() => {
                            segmentApi.recalculate();
                            message.success('Đã gửi yêu cầu tính toán lại phân khúc RFM!');
                          }}
                        >
                          Chạy lại phân loại RFM
                        </Button>
                      </div>,
                    ]}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'generator',
            label: (
              <span>
                <ThunderboltOutlined /> Sinh Dữ Liệu Mẫu Tự Động
              </span>
            ),
            children: (
              <Card className="glass-card" style={{ marginTop: '12px', maxWidth: '800px', margin: '12px auto' }}>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <ThunderboltOutlined style={{ fontSize: '48px', color: '#F59E0B', marginBottom: '16px' }} />
                  <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>
                    Công Cụ Sinh Dữ Liệu Khách Hàng Thực Nghiệm
                  </h2>
                  <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '24px' }}>
                    Tự động tạo tập dữ liệu ngẫu nhiên với hành vi mua hàng thực tế (Khách hàng, Đơn hàng, Chi tiết đơn hàng và Nhật ký lướt xem) để kiểm thử mô hình RFM.
                  </p>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
                    <span style={{ color: '#E2E8F0', fontWeight: 600 }}>Số lượng khách hàng mẫu:</span>
                    <InputNumber
                      min={10}
                      max={500}
                      step={10}
                      value={genCount}
                      onChange={(val) => setGenCount(val || 50)}
                      size="large"
                      style={{ width: '120px' }}
                    />
                  </div>

                  <div>
                    <Button
                      type="primary"
                      size="large"
                      icon={<ThunderboltOutlined />}
                      loading={generating}
                      onClick={handleGenerateData}
                      style={{
                        padding: '0 28px',
                        height: '42px',
                        fontWeight: 600,
                        borderRadius: '6px',
                      }}
                    >
                      Sinh {genCount} Khách Hàng & Dữ Liệu Mẫu
                    </Button>
                  </div>
                </div>
              </Card>
            ),
          },
          {
            key: 'history',
            label: (
              <span>
                <HistoryOutlined /> Lịch Sử Import Dữ Liệu
              </span>
            ),
            children: (
              <Card className="glass-card" style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                    Nhật ký các lần nạp dữ liệu (Import Logs)
                  </h3>
                  <Button icon={<ReloadOutlined />} onClick={() => fetchHistory(historyPage)} loading={historyLoading}>
                    Làm mới
                  </Button>
                </div>

                <Table
                  dataSource={historyLogs}
                  columns={historyColumns}
                  rowKey="id"
                  loading={historyLoading}
                  pagination={{
                    current: historyPage,
                    pageSize: 10,
                    total: historyTotal,
                    onChange: (p) => setHistoryPage(p),
                    showTotal: (total) => `Tổng số ${total} lần import`,
                  }}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};
export default ImportPage;
