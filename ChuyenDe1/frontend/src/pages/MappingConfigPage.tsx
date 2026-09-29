import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { importApi } from '../api/importApi';
import type { ImportMapping } from '../types/import';
import { formatDateTime } from '../utils/formatters';

const TARGET_TABLES = [
  { value: 'customers', label: 'Khách hàng (customers)' },
  { value: 'orders', label: 'Đơn hàng (orders)' },
  { value: 'products', label: 'Sản phẩm (products)' },
  { value: 'user_activities', label: 'Nhật ký hoạt động (user_activities)' },
];

export const MappingConfigPage: React.FC = () => {
  const [mappings, setMappings] = useState<ImportMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterTable, setFilterTable] = useState<string | undefined>();

  // Modal Detail state
  const [selectedMapping, setSelectedMapping] = useState<ImportMapping | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Modal Create state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMappings();
  }, [filterTable]);

  const fetchMappings = async () => {
    setLoading(true);
    try {
      const res = await importApi.getMappings(filterTable);
      if (res.success && res.data) {
        setMappings(res.data);
      }
    } catch (err: any) {
      message.error('Không thể nạp danh sách cấu hình mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await importApi.deleteMapping(id);
      if (res.success) {
        message.success('Đã xóa mẫu cấu hình thành công!');
        fetchMappings();
      } else {
        message.error(res.message || 'Không thể xóa cấu hình');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi xóa cấu hình');
    }
  };

  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(values.mappingJson);
      } catch (e) {
        message.error('JSON ánh xạ không hợp lệ. Vui lòng kiểm tra lại định dạng JSON.');
        return;
      }

      setSaving(true);
      const res = await importApi.saveMapping({
        name: values.name,
        tableTarget: values.tableTarget,
        mappingConfig: parsedConfig,
      });

      if (res.success) {
        message.success('Đã thêm mẫu cấu hình mapping mới!');
        setCreateModalVisible(false);
        createForm.resetFields();
        fetchMappings();
      } else {
        message.error(res.message || 'Lỗi khi lưu cấu hình');
      }
    } catch (err: any) {
      message.error(err.message || 'Vui lòng điền đầy đủ các thông tin hợp lệ');
    } finally {
      setSaving(false);
    }
  };

  const parseMappingPairs = (jsonStr: string): Array<{ field: string; column: string }> => {
    try {
      const parsed = JSON.parse(jsonStr);
      return Object.entries(parsed).map(([field, column]) => ({
        field,
        column: String(column),
      }));
    } catch (e) {
      return [];
    }
  };

  const columns = [
    {
      title: 'Tên cấu hình',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ImportMapping) => (
        <div>
          <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '14px' }}>{name}</div>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>Mã cấu hình: #{record.id}</div>
        </div>
      ),
    },
    {
      title: 'Bảng đích',
      dataIndex: 'tableTarget',
      key: 'tableTarget',
      render: (table: string) => <Tag color="purple">{table}</Tag>,
    },
    {
      title: 'Số trường đã ánh xạ',
      key: 'fieldCount',
      render: (_: any, record: ImportMapping) => {
        const pairs = parseMappingPairs(record.mappingConfig);
        return (
          <span>
            <strong style={{ color: '#10B981' }}>{pairs.length}</strong> trường
          </span>
        );
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: ImportMapping) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedMapping(record);
              setDetailModalVisible(true);
            }}
          >
            Chi tiết
          </Button>
          <Popconfirm
            title="Xác nhận xóa cấu hình này?"
            description="Hành động này không thể hoàn tác."
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
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
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              marginBottom: '4px',
            }}
          >
            Quản Lý Cấu Hình Ánh Xạ CSV
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Lưu trữ và tái sử dụng các mẫu ánh xạ cột dữ liệu từ Shopee, Tiki, Lazada, ERP
          </p>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
            style={{
              borderRadius: '6px',
              fontWeight: 600,
            }}
          >
            Thêm cấu hình mới
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchMappings} loading={loading}>
            Làm mới
          </Button>
        </Space>
      </div>

      {/* Filter Card */}
      <Card className="glass-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ color: '#94A3B8', fontSize: '13px' }}>Lọc theo bảng cơ sở dữ liệu:</span>
          <Select
            placeholder="Tất cả các bảng"
            style={{ width: '260px' }}
            value={filterTable}
            onChange={setFilterTable}
            allowClear
          >
            {TARGET_TABLES.map((t) => (
              <Select.Option key={t.value} value={t.value}>
                {t.label}
              </Select.Option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Mappings Table */}
      <Card className="glass-card">
        <Table
          dataSource={mappings}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal View Detail */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SettingOutlined style={{ color: '#6366F1' }} />
            <span>Chi tiết cấu hình: {selectedMapping?.name}</span>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>,
        ]}
        width={650}
      >
        {selectedMapping && (
          <div>
            <Descriptions bordered column={1} size="small" style={{ marginBottom: '16px' }}>
              <Descriptions.Item label="Tên cấu hình">{selectedMapping.name}</Descriptions.Item>
              <Descriptions.Item label="Bảng đích">
                <Tag color="purple">{selectedMapping.tableTarget}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian tạo">
                {formatDateTime(selectedMapping.createdAt)}
              </Descriptions.Item>
            </Descriptions>

            <h4 style={{ color: '#E2E8F0', marginBottom: '8px' }}>Ánh xạ các trường:</h4>
            <Table
              dataSource={parseMappingPairs(selectedMapping.mappingConfig).map((p, idx) => ({
                ...p,
                key: idx,
              }))}
              columns={[
                {
                  title: 'Trường DB',
                  dataIndex: 'field',
                  key: 'field',
                  render: (f: string) => <code style={{ color: '#818CF8' }}>{f}</code>,
                },
                {
                  title: 'Cột trong tệp CSV',
                  dataIndex: 'column',
                  key: 'column',
                  render: (c: string) => <Tag color="cyan">{c}</Tag>,
                },
              ]}
              size="small"
              pagination={false}
              style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}
            />
          </div>
        )}
      </Modal>

      {/* Modal Create New Mapping */}
      <Modal
        title="Thêm Mới Cấu Hình Ánh Xạ Cột"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={handleCreateSubmit}
        confirmLoading={saving}
        okText="Lưu cấu hình"
        cancelText="Hủy"
        width={600}
      >
        <Form form={createForm} layout="vertical" initialValues={{ tableTarget: 'customers' }}>
          <Form.Item
            name="name"
            label="Tên cấu hình mẫu"
            rules={[{ required: true, message: 'Vui lòng nhập tên cấu hình' }]}
          >
            <Input placeholder="Ví dụ: Shopee Customer Standard Mapping" />
          </Form.Item>

          <Form.Item
            name="tableTarget"
            label="Bảng cơ sở dữ liệu đích"
            rules={[{ required: true, message: 'Vui lòng chọn bảng đích' }]}
          >
            <Select>
              {TARGET_TABLES.map((t) => (
                <Select.Option key={t.value} value={t.value}>
                  {t.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="mappingJson"
            label="Nội dung ánh xạ (Định dạng JSON: DB_FIELD : CSV_HEADER)"
            rules={[{ required: true, message: 'Vui lòng nhập JSON ánh xạ' }]}
            initialValue={`{\n  "customerCode": "Mã Khách Hàng",\n  "fullName": "Họ và Tên",\n  "email": "Email",\n  "phone": "Số điện thoại",\n  "city": "Tỉnh thành"\n}`}
          >
            <Input.TextArea
              rows={8}
              style={{ fontFamily: 'monospace', fontSize: '13px' }}
              placeholder='{\n  "customerCode": "Mã KH",\n  "fullName": "Tên KH"\n}'
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
