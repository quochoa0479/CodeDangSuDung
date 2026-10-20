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
  Alert,
  Modal,
  Radio,
  Popconfirm,
  Tooltip,
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
  DashboardOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { importApi } from '../api/importApi';
import type { CsvPreview, ImportLog, ImportMapping } from '../types/import';
import { formatNumber, formatDateTime } from '../utils/formatters';

const { Dragger } = Upload;



const FIELD_SYNONYMS: Record<string, string[]> = {
  customer_code: ['customercode', 'customerid', 'custid', 'custcode', 'makhachhang', 'makh', 'customer', 'id'],
  full_name: ['fullname', 'customername', 'name', 'tenkhachhang', 'hovaten', 'hoten', 'tenkh', 'ten'],
  email: ['email', 'mail', 'thudientu'],
  phone: ['phone', 'phonenumber', 'sodienthoai', 'sdt', 'mobile', 'telephone'],
  city: ['city', 'province', 'thanhpho', 'tinhthanh', 'tinh', 'diachi', 'address'],
  gender: ['gender', 'sex', 'gioitinh'],
  order_code: ['ordercode', 'orderid', 'madohang', 'madon', 'code', 'id'],
  total_amount: ['totalamount', 'orderamount', 'amount', 'tongtien', 'tien', 'giatridon', 'total', 'price', 'doanhthu'],
  order_status: ['orderstatus', 'status', 'trangthai', 'tinhtrang'],
  payment_method: ['paymentmethod', 'phuongthucthanhtoan', 'pttt', 'payment', 'method'],
  order_date: ['orderdate', 'ngaydat', 'ngaydathang', 'ngay', 'date', 'createdat', 'thoigian'],
  customer_name: ['customername', 'fullname', 'name', 'tenkhachhang', 'tenkh'],
  product_name: ['productname', 'tensanpham', 'sanpham', 'product', 'item', 'itemname', 'tenhang', 'name'],
  product_price: ['productprice', 'giasanpham', 'giaban', 'dongia', 'price', 'unitprice', 'gia'],
  category_name: ['categoryname', 'danhmuc', 'category', 'nhomhang', 'loaihang'],
  quantity: ['quantity', 'soluong', 'qty', 'count', 'so_luong'],
};

export const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('rfm_active_import_tab') || 'wizard');

  // Wizard state with synchronous sessionStorage restoration
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const savedStep = sessionStorage.getItem('rfm_last_import_step');
    return savedStep ? parseInt(savedStep, 10) : 0;
  });
  const [targetTable, setTargetTable] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<CsvPreview | null>(() => {
    try {
      const savedPreview = sessionStorage.getItem('rfm_last_preview_data');
      return savedPreview ? JSON.parse(savedPreview) : null;
    } catch {
      return null;
    }
  });
  const [mappings, setMappings] = useState<ImportMapping[]>([]);
  const [selectedMappingId, setSelectedMappingId] = useState<number | undefined>();
  const [autoMapping, setAutoMapping] = useState<Record<string, string>>({});

  // Mapping Form State
  const [mappingForm] = Form.useForm();
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [cleanBeforeImport, setCleanBeforeImport] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportLog | null>(() => {
    try {
      const savedResult = sessionStorage.getItem('rfm_last_import_result');
      return savedResult ? JSON.parse(savedResult) : null;
    } catch {
      return null;
    }
  });

  // History State
  const [historyLogs, setHistoryLogs] = useState<ImportLog[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Rerun & Download State
  const [rerunModalVisible, setRerunModalVisible] = useState(false);
  const [rerunRecord, setRerunRecord] = useState<ImportLog | null>(null);
  const [rerunClean, setRerunClean] = useState(true);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const goToStep = (step: number) => {
    setCurrentStep(step);
    sessionStorage.setItem('rfm_last_import_step', String(step));
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    sessionStorage.setItem('rfm_active_import_tab', key);
  };

  const handleOpenRerunModal = (record: ImportLog) => {
    setRerunRecord(record);
    setRerunClean(true);
    setRerunModalVisible(true);
  };

  const handleExecuteRerun = async () => {
    if (!rerunRecord) return;
    try {
      setRerunLoading(true);
      const res = await importApi.rerunImport(rerunRecord.id, rerunClean);
      if (res.success) {
        message.success(`Phân tích lại tệp "${rerunRecord.fileName || 'dữ liệu'}" thành công! Đã tự động tính toán lại phân khúc RFM.`);
        setRerunModalVisible(false);
        fetchHistory(1);
      } else {
        message.error(res.message || 'Chạy lại phân tích thất bại');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi chạy lại phân tích');
    } finally {
      setRerunLoading(false);
    }
  };

  const handleDownloadFile = async (record: ImportLog) => {
    try {
      setDownloadingId(record.id);
      await importApi.downloadFile(record.id, record.fileName);
      message.success(`Đã tải xuống tệp: ${record.fileName || 'file_import.xlsx'}`);
    } catch (err: any) {
      message.error(err.message || 'Không thể tải xuống tệp');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteLog = async (id: number) => {
    try {
      setDeletingId(id);
      const res = await importApi.deleteImportLog(id);
      if (res.success) {
        message.success('Đã xóa bản ghi import và tệp lưu trữ thành công');
        // Nếu trang hiện tại chỉ có 1 phần tử và đang ở trang > 1, tự động lùi về trang trước
        if (historyLogs.length <= 1 && historyPage > 1) {
          const target = historyPage - 1;
          setHistoryPage(target);
          fetchHistory(target);
        } else {
          fetchHistory(historyPage);
        }
      } else {
        message.error(res.message || 'Xóa bản ghi thất bại');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi xóa bản ghi');
    } finally {
      setDeletingId(null);
    }
  };

  // Load mappings whenever targetTable changes
  useEffect(() => {
    fetchMappings(targetTable);
  }, [targetTable]);

  // Load history on mount and when tab/page changes
  useEffect(() => {
    fetchHistory(historyPage);
  }, [historyPage]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(historyPage);
    }
  }, [activeTab]);

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
        const total = res.data.totalElements;
        const totalPages = Math.max(1, Math.ceil(total / 10));
        // Nếu trang yêu cầu lớn hơn tổng số trang (do vừa xóa bản ghi), tự lùi về trang hợp lệ
        if (page > totalPages && total > 0) {
          setHistoryPage(totalPages);
          fetchHistory(totalPages);
          return;
        }
        setHistoryLogs(res.data.content);
        setHistoryTotal(total);
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
      const res = await importApi.previewCsv(file, targetTable);
      if (res.success && res.data) {
        const detected = res.data.detectedTable || 'all';
        if (detected !== targetTable) {
          setTargetTable(detected);
          if (detected === 'all') {
            message.info('💡 Hệ thống tự động kích hoạt chế độ Toàn diện All-in-One (xử lý Khách hàng, Đơn hàng, Sản phẩm cùng lúc).');
          } else if (detected === 'products') {
            message.info('💡 Hệ thống tự động chọn Bảng Sản phẩm (products).');
          } else if (detected === 'user_activities') {
            message.info('💡 Hệ thống tự động chọn Bảng Nhật ký hoạt động (user_activities).');
          }
        }

        setPreviewData(res.data);
        const formatLabel = res.data.fileFormat || 'dữ liệu';
        message.success(`Đã phân tích tệp ${formatLabel} (${res.data.fileName}): ${res.data.totalRows} dòng dữ liệu`);

        // Smart auto-match headers using synonym dictionary
        const initialMapping: Record<string, string> = {};
        res.data.targetFields.forEach((field) => {
          const normField = field.toLowerCase().replace(/[^a-z0-9]/g, '');
          const synonyms = FIELD_SYNONYMS[field] || [];

          const matchedHeader = res.data.headers.find((h) => {
            const normHeader = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            return (
              h.toLowerCase().trim() === field.toLowerCase().trim() ||
              normHeader === normField ||
              synonyms.includes(normHeader) ||
              normHeader.includes(normField) ||
              normField.includes(normHeader)
            );
          });
          if (matchedHeader) {
            initialMapping[field] = matchedHeader;
          }
        });

        setAutoMapping(initialMapping);
        mappingForm.setFieldsValue(initialMapping);
        sessionStorage.setItem('rfm_last_preview_data', JSON.stringify(res.data));
        goToStep(1); // Advance to preview step
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
        setAutoMapping((prev) => ({ ...prev, ...config }));
        message.info(`Đã áp dụng mẫu cấu hình: ${template.name}`);
      } catch (e) {
        message.error('Cấu hình mẫu không hợp lệ');
      }
    }
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!previewData) return;

    try {
      setImporting(true);
      const formValues = mappingForm.getFieldsValue();
      const finalMapping = { ...autoMapping, ...formValues };

      const res = await importApi.executeImport({
        fileId: previewData.fileId,
        targetTable,
        columnMapping: finalMapping,
        saveAsTemplate,
        templateName: saveAsTemplate ? templateName : undefined,
        cleanBeforeImport,
      });

      if (res.success && res.data) {
        setImportResult(res.data);
        sessionStorage.setItem('rfm_last_import_result', JSON.stringify(res.data));
        goToStep(3); // Result step
        message.success('Nhập dữ liệu thành công!');
        // Refresh import history in background
        fetchHistory(1);
      } else {
        message.error(res.message || 'Import thất bại');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi trong quá trình import dữ liệu');
    } finally {
      setImporting(false);
    }
  };

  const resetWizard = () => {
    sessionStorage.removeItem('rfm_last_import_result');
    sessionStorage.removeItem('rfm_last_import_step');
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
      render: (st: string, record: ImportLog) => {
        if (st === 'SUCCESS') return <Tag color="success">Thành công</Tag>;
        if (st === 'FAILED') {
          return (
            <Tooltip title={record.errorMessage || 'Quá trình import gặp lỗi'}>
              <Tag color="error" style={{ cursor: 'pointer' }}>
                Thất bại {record.errorMessage ? '⚠️' : ''}
              </Tag>
            </Tooltip>
          );
        }
        return <Tag color="warning">{st}</Tag>;
      },
    },
    {
      title: 'Tệp đã lưu',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (fileName: string, record: ImportLog) => {
        if (!fileName && !record.storedFilePath) {
          return <span style={{ color: '#64748B', fontSize: '12px' }}>Không lưu tệp</span>;
        }
        const sizeKb = record.fileSize ? (record.fileSize / 1024).toFixed(1) + ' KB' : '';
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileExcelOutlined style={{ color: '#10B981', flexShrink: 0 }} />
              <span
                style={{
                  fontWeight: 600,
                  color: '#E2E8F0',
                  maxWidth: '160px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                }}
                title={fileName || 'Tệp dữ liệu'}
              >
                {fileName || 'Tệp dữ liệu'}
              </span>
            </div>
            {sizeKb && <div style={{ fontSize: '11px', color: '#94A3B8' }}>{sizeKb}</div>}
          </div>
        );
      },
    },
    {
      title: 'Thời gian',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 250,
      render: (_: any, record: ImportLog) => (
        <Space size={6}>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            loading={downloadingId === record.id}
            disabled={!record.storedFilePath}
            onClick={() => handleDownloadFile(record)}
            title="Tải tệp này về máy tính"
          >
            Tải về
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<PlayCircleOutlined style={{ color: '#ffffff' }} />}
            style={{
              color: '#ffffff',
              backgroundColor: '#2563EB',
              borderColor: '#3B82F6',
              fontWeight: 600,
            }}
            disabled={!record.storedFilePath}
            onClick={() => handleOpenRerunModal(record)}
            title="Chạy phân tích lại tệp này trên server"
          >
            Phân tích lại
          </Button>
          <Popconfirm
            title="Xóa bản ghi import này?"
            description="Tệp trên server và nhật ký này sẽ bị xóa vĩnh viễn."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteLog(record.id)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deletingId === record.id}
              title="Xóa tệp và nhật ký này"
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
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
          Hỗ trợ nạp dữ liệu từ các tệp Excel (.xlsx, .xls), JSON (.json), XML (.xml) và CSV (.csv) kèm cơ chế tự động nhận diện và ánh xạ cột thông minh
        </p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
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
                    { title: 'Tải lên tệp' },
                    { title: 'Xem trước & Khớp cột' },
                    { title: 'Ánh xạ tùy chỉnh' },
                    { title: 'Kết quả phân tích' },
                  ]}
                />

                {/* STEP 0: Tải lên dữ liệu */}
                {currentStep === 0 && (
                  <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ marginBottom: '24px' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
                        Tải lên tệp dữ liệu để phân tích RFM
                      </h2>
                      <p style={{ color: '#94A3B8', fontSize: '14px', maxWidth: '560px', margin: '0 auto' }}>
                        Hỗ trợ tệp <strong>Excel, CSV, JSON hoặc XML</strong>. Hệ thống tự động nhận diện dữ liệu và phân tích phân khúc RFM.
                      </p>
                    </div>

                    <div>
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
                          Tự động đọc cột và phân tích phân khúc RFM
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

                    {/* Danh sách tệp đã lưu sẵn trên máy chủ để bấm lại nhanh */}
                    {historyLogs.length > 0 && (
                      <div
                        style={{
                          marginTop: '24px',
                          padding: '16px 20px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: '#E2E8F0', fontSize: '13px' }}>
                            📂 Hoặc bấm phân tích lại ngay các tệp đã lưu trên máy chủ:
                          </span>
                          <Button type="link" size="small" onClick={() => handleTabChange('history')} style={{ padding: 0 }}>
                            Xem tất cả ({historyTotal} tệp) ➔
                          </Button>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {historyLogs.slice(0, 4).map((log) => (
                            <div
                              key={log.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                              }}
                            >
                              <FileExcelOutlined style={{ color: '#10B981' }} />
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#F1F5F9', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {log.fileName || `Tệp #${log.id}`}
                              </span>
                              <Button
                                size="small"
                                type="primary"
                                ghost
                                icon={<PlayCircleOutlined />}
                                onClick={() => handleOpenRerunModal(log)}
                                style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
                              >
                                Phân tích lại
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 1: Xem trước dữ liệu */}
                {currentStep === 1 && previewData && (
                  <div>
                    <Alert
                      type="success"
                      showIcon
                      message="✨ Đã nhận diện và tự động khớp dữ liệu thành công!"
                      description={
                        <span>
                          Hệ thống đã tự động liên kết các cột đơn hàng và khách hàng. Bạn chỉ cần nhấn <strong>"⚡ Xác Nhận & Phân Tích Toàn Bộ Ngay"</strong> để lưu vào CSDL và chạy tính toán phân khúc RFM, hoặc chọn <strong>"Tùy chỉnh ánh xạ cột ➔"</strong> nếu muốn chỉnh sửa thêm.
                        </span>
                      }
                      style={{ marginBottom: '16px' }}
                    />

                    {/* Chế độ nạp dữ liệu: Làm mới hay cộng dồn */}
                    <div
                      style={{
                        marginBottom: '16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <Checkbox
                        checked={cleanBeforeImport}
                        onChange={(e) => setCleanBeforeImport(e.target.checked)}
                        style={{ color: '#F1F5F9', fontWeight: 600, fontSize: '13px' }}
                      >
                        🗑️ Làm mới dữ liệu: Xóa các đơn hàng/khách hàng cũ trước khi nạp để chỉ phân tích riêng tệp này
                      </Checkbox>
                      <span style={{ fontSize: '12px', color: cleanBeforeImport ? '#38BDF8' : '#94A3B8' }}>
                        {cleanBeforeImport
                          ? '✓ Đang bật chế độ phân tích độc lập tệp mới'
                          : '⚡ Đang bật chế độ cộng dồn vào dữ liệu hiện có'}
                      </span>
                    </div>

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
                        <Button onClick={() => goToStep(2)}>
                          Tùy chỉnh ánh xạ cột ➔
                        </Button>
                        <Button
                          type="primary"
                          icon={<CloudUploadOutlined />}
                          loading={importing}
                          onClick={handleExecuteImport}
                          style={{ background: '#10B981', borderColor: '#10B981', fontWeight: 600 }}
                        >
                          ⚡ Xác Nhận & Phân Tích Toàn Bộ Ngay
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
                            Bước 3: Cấu hình ánh xạ cột
                          </h3>
                          {getFormatBadge(previewData.fileFormat)}
                        </div>
                        <span style={{ color: '#94A3B8', fontSize: '12px' }}>
                          Chọn cột từ tệp {previewData.fileFormat || 'dữ liệu'} tương ứng với các trường trong hệ thống
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
                        <Button onClick={() => goToStep(1)}>Quay lại xem trước</Button>
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
                      <div key="actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <Button onClick={resetWizard}>
                          Nhập tệp khác
                        </Button>
                        <Button
                          type="primary"
                          icon={<DashboardOutlined />}
                          onClick={() => navigate('/')}
                        >
                          Xem Tổng Quan Dashboard
                        </Button>
                        <Button
                          icon={<ThunderboltOutlined />}
                          onClick={() => navigate('/rfm')}
                        >
                          Xem Ma Trận Phân Khúc RFM
                        </Button>
                      </div>,
                      <div key="tip" style={{ marginTop: '12px', fontSize: '13px', color: '#10B981' }}>
                        💾 Tệp đã được lưu an toàn trên máy chủ! Bạn có thể xem lại, tải về hoặc bấm phân tích lại bất cứ lúc nào trong tab <strong>Lịch Sử Import Dữ Liệu</strong>.
                      </div>,
                    ]}
                  />
                )}
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
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                      Nhật ký các lần nạp dữ liệu (Import Logs)
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>
                      Tất cả các tệp nạp vào đều được lưu trữ trên server. Bạn hoặc thầy cô kiểm thử có thể tải về hoặc bấm <strong>"Phân tích lại"</strong> trực tiếp trên web mà không cần tải lại file.
                    </p>
                  </div>
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

      {/* Modal Phân tích lại tệp trên máy chủ */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThunderboltOutlined style={{ color: '#6366F1', fontSize: '18px' }} />
            <span style={{ fontWeight: 700 }}>Phân Tích Lại Tệp Trên Máy Chủ</span>
          </div>
        }
        open={rerunModalVisible}
        onOk={handleExecuteRerun}
        confirmLoading={rerunLoading}
        onCancel={() => setRerunModalVisible(false)}
        okText="⚡ Bắt Đầu Phân Tích Lại"
        cancelText="Đóng"
      >
        {rerunRecord && (
          <div style={{ padding: '8px 0' }}>
            <Alert
              type="info"
              showIcon
              message={
                <span>
                  Đang chọn tệp: <strong style={{ color: '#38BDF8' }}>{rerunRecord.fileName || '#' + rerunRecord.id}</strong>
                </span>
              }
              description={
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  <div>Bảng đích: <strong>{rerunRecord.tableName}</strong> | Định dạng: <strong>{rerunRecord.source}</strong></div>
                  <div>Lần nạp trước: <strong>+{formatNumber(rerunRecord.recordsImported)}</strong> dòng thành công</div>
                </div>
              }
              style={{ marginBottom: '16px' }}
            />

            <p style={{ fontWeight: 600, marginBottom: '10px', color: '#E2E8F0', fontSize: '13px' }}>
              Chọn chế độ phân tích:
            </p>

            <Radio.Group
              value={rerunClean}
              onChange={(e) => setRerunClean(e.target.value)}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <Radio value={true}>
                <div>
                  <strong style={{ color: '#38BDF8' }}>Làm mới dữ liệu (Khuyên dùng khi test)</strong>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                    Xóa các đơn hàng/khách hàng cũ trước khi nạp để chỉ phân tích độc lập tệp này.
                  </div>
                </div>
              </Radio>
              <Radio value={false}>
                <div>
                  <strong style={{ color: '#10B981' }}>Cộng dồn vào dữ liệu hiện có</strong>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                    Giữ nguyên dữ liệu hiện tại trong DB, bổ sung thêm đơn hàng & khách hàng từ tệp này và cập nhật lại điểm RFM.
                  </div>
                </div>
              </Radio>
            </Radio.Group>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default ImportPage;
