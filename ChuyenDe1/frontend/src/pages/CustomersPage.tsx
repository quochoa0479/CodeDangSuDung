import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Tooltip,
  Row,
  Col,
  message,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  DownloadOutlined,
  FilterOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Papa from 'papaparse';
import { customerApi } from '../api/customerApi';
import type { CustomerSegmentDto } from '../types/customer';
import { SegmentBadge } from '../components/cards/SegmentBadge';
import { SEGMENT_METAS } from '../utils/segmentColors';
import { formatCurrency, formatNumber } from '../utils/formatters';

export const CustomersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerSegmentDto[]>([]);
  const [totalElements, setTotalElements] = useState(0);

  // Filters from query params or state
  const initialSegment = searchParams.get('segment') || undefined;
  const initialKeyword = searchParams.get('keyword') || '';

  const [segment, setSegment] = useState<string | undefined>(initialSegment);
  const [keyword, setKeyword] = useState<string>(initialKeyword);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortBy, setSortBy] = useState<string>('rfmTotal');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerApi.getCustomers({
        segment: segment || undefined,
        keyword: keyword.trim() || undefined,
        page: page - 1, // backend is 0-indexed
        size: pageSize,
        sortBy,
        direction,
      });

      if (res.success && res.data) {
        setCustomers(res.data.content);
        setTotalElements(res.data.totalElements);
      } else {
        message.error(res.message || 'Không thể tải danh sách khách hàng');
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi gọi API danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }, [segment, keyword, page, pageSize, sortBy, direction]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Sync segment changes to URL
  const handleSegmentChange = (val?: string) => {
    setSegment(val);
    setPage(1);
    if (val) {
      setSearchParams({ segment: val, ...(keyword ? { keyword } : {}) });
    } else {
      const p: Record<string, string> = {};
      if (keyword) p.keyword = keyword;
      setSearchParams(p);
    }
  };

  const handleSearch = () => {
    setPage(1);
    const p: Record<string, string> = {};
    if (segment) p.segment = segment;
    if (keyword.trim()) p.keyword = keyword.trim();
    setSearchParams(p);
    fetchCustomers();
  };

  const handleReset = () => {
    setSegment(undefined);
    setKeyword('');
    setPage(1);
    setSortBy('rfmTotal');
    setDirection('desc');
    setSearchParams({});
  };

  const handleExportCsv = () => {
    if (!customers || customers.length === 0) {
      message.warning('Không có dữ liệu để xuất');
      return;
    }
    const exportData = customers.map((c) => ({
      'Mã khách hàng': c.customerCode,
      'Họ và tên': c.fullName,
      Email: c.email,
      'Số điện thoại': c.phone,
      'Tỉnh/Thành phố': c.city,
      'Phân khúc': c.segment,
      'Điểm R': c.rScore,
      'Điểm F': c.fScore,
      'Điểm M': c.mScore,
      'Tổng điểm RFM': c.rfmTotal,
      'Số ngày chưa mua (Recency)': c.recencyDays,
      'Số đơn hàng (Frequency)': c.frequency,
      'Tổng chi tiêu (Monetary)': c.monetary,
      'Chi tiêu TB / đơn': c.avgOrderValue,
      'Lượt xem': c.totalViews,
      'Lượt thêm giỏ': c.totalCartAdds,
      'Lượt mua': c.totalPurchases,
      'Lượt đánh giá': c.totalReviews,
      'Danh mục ưa thích': c.preferredCategory || '—',
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `khach_hang_rfm_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Đã xuất file CSV thành công!');
  };

  const columns = [
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 250,
      render: (_: any, record: CustomerSegmentDto) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#1E293B',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
              fontWeight: 700,
              fontSize: '14px',
              flexShrink: 0,
            }}
          >
            {record.fullName ? record.fullName.charAt(0).toUpperCase() : <UserOutlined />}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontWeight: 700,
                color: '#FFFFFF',
                fontSize: '14px',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/customers/${record.customerId}`)}
            >
              {record.fullName}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              <span style={{ fontFamily: 'monospace', color: '#818CF8' }}>{record.customerCode}</span>
              {record.city ? ` • ${record.city}` : ''}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              {record.phone || record.email || '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Phân khúc RFM',
      dataIndex: 'segment',
      key: 'segment',
      width: 190,
      render: (seg: string) => <SegmentBadge segment={seg} />,
    },
    {
      title: 'Điểm RFM',
      key: 'rfmScores',
      width: 170,
      render: (_: any, record: CustomerSegmentDto) => {
        const r = record.rScore ?? record.rscore ?? 0;
        const f = record.fScore ?? record.fscore ?? 0;
        const m = record.mScore ?? record.mscore ?? 0;
        return (
          <div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              <Tooltip title={`Recency: ${record.recencyDays} ngày trước`}>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38BDF8',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                  }}
                >
                  R: {r}
                </span>
              </Tooltip>
              <Tooltip title={`Frequency: ${record.frequency} đơn hàng`}>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#C084FC',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                  }}
                >
                  F: {f}
                </span>
              </Tooltip>
              <Tooltip title={`Monetary: ${formatCurrency(record.monetary)}`}>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(234, 179, 8, 0.15)',
                    color: '#FACC15',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                  }}
                >
                  M: {m}
                </span>
              </Tooltip>
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              Tổng: <strong style={{ color: '#F8FAFC' }}>{record.rfmTotal}</strong>/15
            </div>
          </div>
        );
      },
    },
    {
      title: 'Chỉ số mua sắm',
      key: 'metrics',
      width: 220,
      render: (_: any, record: CustomerSegmentDto) => (
        <div style={{ fontSize: '12px' }}>
          <div>
            Chi tiêu:{' '}
            <strong style={{ color: '#10B981' }}>{formatCurrency(record.monetary)}</strong>
          </div>
          <div style={{ color: '#94A3B8', fontSize: '11px' }}>
            {record.frequency} đơn • TB: {formatCurrency(record.avgOrderValue)}
          </div>
          <div style={{ color: '#CBD5E1', fontSize: '11px' }}>
            Lần mua cuối: {record.recencyDays} ngày trước
          </div>
        </div>
      ),
    },
    {
      title: 'Tương tác hành vi',
      key: 'behavior',
      width: 170,
      render: (_: any, record: CustomerSegmentDto) => (
        <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div>👁️ Xem: <strong style={{ color: '#E2E8F0' }}>{record.totalViews}</strong></div>
          <div>🛒 Giỏ hàng: <strong style={{ color: '#E2E8F0' }}>{record.totalCartAdds}</strong></div>
          <div>⭐ Đánh giá: <strong style={{ color: '#E2E8F0' }}>{record.totalReviews}</strong></div>
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      align: 'center' as const,
      render: (_: any, record: CustomerSegmentDto) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/customers/${record.customerId}`)}
          style={{
            background: '#1E293B',
            borderColor: 'rgba(255, 255, 255, 0.12)',
            color: '#38BDF8',
            fontWeight: 600,
            borderRadius: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          Hồ sơ 360°
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-up">
      {/* Page Title & Breadcrumb header */}
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
            Quản Lý Hồ Sơ Khách Hàng
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Danh sách chi tiết, xếp hạng RFM và phân tích hành vi tương tác dịch vụ
          </p>
        </div>

        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
            Xuất CSV
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchCustomers} loading={loading}>
            Làm mới
          </Button>
        </Space>
      </div>

      {/* Filter & Search Bar Card */}
      <Card className="glass-card" style={{ marginBottom: '20px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={10} md={8}>
            <Input
              placeholder="Tìm theo tên, mã KH, email hoặc SĐT..."
              prefix={<SearchOutlined style={{ color: '#64748B' }} />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
              size="middle"
            />
          </Col>

          <Col xs={24} sm={7} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Chọn phân khúc RFM"
              value={segment}
              onChange={handleSegmentChange}
              allowClear
            >
              {Object.values(SEGMENT_METAS).map((meta) => (
                <Select.Option key={meta.key} value={meta.key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: meta.color,
                        display: 'inline-block',
                      }}
                    />
                    <span>{meta.nameVi}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={7} md={5}>
            <Select
              style={{ width: '100%' }}
              value={`${sortBy}_${direction}`}
              onChange={(val) => {
                const [sb, dir] = val.split('_');
                setSortBy(sb);
                setDirection(dir as 'asc' | 'desc');
              }}
            >
              <Select.Option value="rfmTotal_desc">Điểm RFM (Cao - Thấp)</Select.Option>
              <Select.Option value="rfmTotal_asc">Điểm RFM (Thấp - Cao)</Select.Option>
              <Select.Option value="monetary_desc">Doanh thu (Cao - Thấp)</Select.Option>
              <Select.Option value="frequency_desc">Số đơn mua (Nhiều - Ít)</Select.Option>
              <Select.Option value="recencyDays_asc">Gần đây nhất (Ngày ít - Nhiều)</Select.Option>
              <Select.Option value="recencyDays_desc">Lâu chưa mua (Ngày nhiều - Ít)</Select.Option>
            </Select>
          </Col>

          <Col xs={24} md={5} style={{ display: 'flex', gap: '8px' }}>
            <Button type="primary" icon={<FilterOutlined />} onClick={handleSearch} style={{ flex: 1 }}>
              Lọc
            </Button>
            <Button onClick={handleReset}>Đặt lại</Button>
          </Col>
        </Row>

        {/* Quick Tag Filter Pill Bar */}
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '12px', color: '#94A3B8', marginRight: '4px' }}>
            Lọc nhanh:
          </span>
          <Tag
            color={!segment ? '#6366F1' : undefined}
            style={{
              cursor: 'pointer',
              border: !segment ? 'none' : '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={() => handleSegmentChange(undefined)}
          >
            Tất cả ({formatNumber(totalElements)})
          </Tag>
          {['CHAMPIONS', 'LOYAL_CUSTOMERS', 'POTENTIAL_LOYALISTS', 'AT_RISK', 'CANNOT_LOSE_THEM'].map(
            (k) => {
              const meta = SEGMENT_METAS[k];
              const isSelected = segment === k;
              return (
                <Tag
                  key={k}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: isSelected ? meta.color : meta.bgLight,
                    color: isSelected ? '#FFFFFF' : meta.color,
                    border: `1px solid ${meta.borderColor}50`,
                  }}
                  onClick={() => handleSegmentChange(isSelected ? undefined : k)}
                >
                  {meta.nameVi}
                </Tag>
              );
            }
          )}
        </div>
      </Card>

      {/* Main Customers Table */}
      <Card className="glass-card">
        <Table
          dataSource={customers}
          columns={columns}
          rowKey="customerId"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: totalElements,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} trong số ${total} khách hàng`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          scroll={{ x: 'max-content' }}
          sticky={{ offsetHeader: 64 }}
        />
      </Card>
    </div>
  );
};
