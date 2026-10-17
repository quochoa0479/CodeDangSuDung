import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
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
  SearchOutlined,
} from '@ant-design/icons';
import { importApi } from '../api/importApi';
import type { ImportMapping } from '../types/import';
import { formatDateTime } from '../utils/formatters';

const DEFAULT_MAPPING_JSON = `{\n  "order_code": "Mã đơn hàng",\n  "customer_code": "Mã khách hàng",\n  "full_name": "Họ và tên",\n  "phone": "Số điện thoại",\n  "email": "Email",\n  "city": "Tỉnh thành",\n  "total_amount": "Tổng tiền",\n  "order_date": "Ngày đặt"\n}`;

export const MappingConfigPage: React.FC = () => {
  const [mappings, setMappings] = useState<ImportMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Modal Detail state
  const [selectedMapping, setSelectedMapping] = useState<ImportMapping | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Modal Create state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    setLoading(true);
    try {
      const res = await importApi.getMappings();
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
        tableTarget: 'all',
        mappingConfig: parsedConfig,
      });

      if (res.success) {
        message.success('Đã thêm mẫu cấu hình mới!');
        setCreateModalVisible(false);
        createForm.resetFields();
        fetchMappings();
      } else {
        message.error(res.message || 'Lỗi khi lưu cấu hình');
      }
    } catch (err: any) {
      message.error(err.message || 'Vui lòng điền đầy đủ thông tin hợp lệ');
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

  const filteredMappings = mappings.filter((m) =>
    m.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Tên cấu hình',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ImportMapping) => (
        <div>
          <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '14px' }}>{name}</div>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>Mã: #{record.id}</div>
        </div>
      ),
    },
    {
      title: 'Số trường ánh xạ',
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
            Quản Lý Cấu Hình Ánh Xạ
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Lưu trữ và tái sử dụng các mẫu ánh xạ cột khi nhập dữ liệu
          </p>
        </div>

        <Space wrap>
          <Input
            placeholder="Tìm kiếm mẫu..."
            prefix={<SearchOutlined style={{ color: '#64748B' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '220px', borderRadius: '6px' }}
            allowClear
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              createForm.resetFields();
              setCreateModalVisible(true);
            }}
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

      {/* Mappings Table */}
      <Card className="glass-card">
        <Table
          dataSource={filteredMappings}
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
                  title: 'Trường dữ liệu hệ thống',
                  dataIndex: 'field',
                  key: 'field',
                  render: (f: string) => <code style={{ color: '#818CF8' }}>{f}</code>,
                },
                {
                  title: 'Cột trong tệp',
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
        title="Thêm Cấu Hình Ánh Xạ"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={handleCreateSubmit}
        confirmLoading={saving}
        okText="Lưu cấu hình"
        cancelText="Hủy"
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ mappingJson: DEFAULT_MAPPING_JSON }}
        >
          <Form.Item
            name="name"
            label="Tên cấu hình mẫu"
            rules={[{ required: true, message: 'Vui lòng nhập tên cấu hình' }]}
          >
            <Input placeholder="Ví dụ: Mẫu Shopee, Mẫu KiotViet, Mẫu Khách hàng..." />
          </Form.Item>

          <Form.Item
            name="mappingJson"
            label="Nội dung ánh xạ (Định dạng JSON: Trường_Hệ_Thống : Cột_Trong_Tệp)"
            rules={[{ required: true, message: 'Vui lòng nhập JSON ánh xạ' }]}
          >
            <Input.TextArea
              rows={8}
              style={{ fontFamily: 'monospace', fontSize: '13px' }}
              placeholder='{\n  "order_code": "Mã đơn",\n  "customer_code": "Mã khách"\n}'
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
