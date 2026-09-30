import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Tabs,
  Table,
  Tag,
  Button,
  Spin,
  Alert,
  Timeline,
  Progress,
} from 'antd';
import {
  ArrowLeftOutlined,
  ShoppingOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  HeartOutlined,
  EyeOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { customerApi } from '../api/customerApi';
import type { CustomerDetailDto, OrderDto, UserActivityLogDto, SegmentHistory } from '../types/customer';
import { SegmentBadge } from '../components/cards/SegmentBadge';
import { formatCurrency, formatNumber, formatDate, formatDateTime } from '../utils/formatters';
import { getSegmentMeta } from '../utils/segmentColors';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<CustomerDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCustomerDetail(parseInt(id, 10));
    }
  }, [id]);

  const fetchCustomerDetail = async (customerId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await customerApi.getCustomerDetail(customerId);
      if (res.success && res.data) {
        setCustomer(res.data);
      } else {
        setError(res.message || 'Không tìm thấy thông tin khách hàng');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi gọi API chi tiết khách hàng');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '120px 0', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
          Đang nạp hồ sơ khách hàng 360°...
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto' }}>
        <Alert
          type="error"
          message="Không thể hiển thị thông tin"
          description={error || 'Khách hàng không tồn tại.'}
          showIcon
          action={
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers')}>
              Quay lại danh sách
            </Button>
          }
        />
      </div>
    );
  }

  const segmentMeta = getSegmentMeta(customer.segment);

  // Status tag for orders
  const renderOrderStatus = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return <Tag icon={<CheckCircleOutlined />} color="success">Hoàn thành</Tag>;
      case 'PROCESSING':
        return <Tag icon={<SyncOutlined spin />} color="processing">Đang xử lý</Tag>;
      case 'CANCELLED':
        return <Tag icon={<CloseCircleOutlined />} color="error">Đã hủy</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  // Action tag for user activities
  const renderActionType = (action: string) => {
    switch (action?.toUpperCase()) {
      case 'VIEW_PRODUCT':
        return <Tag icon={<EyeOutlined />} color="blue">Xem sản phẩm</Tag>;
      case 'ADD_TO_CART':
        return <Tag icon={<ShoppingCartOutlined />} color="orange">Thêm giỏ hàng</Tag>;
      case 'PURCHASE':
        return <Tag icon={<ShoppingOutlined />} color="green">Mua hàng</Tag>;
      case 'WRITE_REVIEW':
        return <Tag icon={<HeartOutlined />} color="purple">Viết đánh giá</Tag>;
      case 'SEARCH':
        return <Tag color="cyan">Tìm kiếm</Tag>;
      default:
        return <Tag color="default">{action}</Tag>;
    }
  };

  // Nested order details columns
  const orderColumns = [
    {
      title: 'Mã đơn hàng',
      dataIndex: 'orderCode',
      key: 'orderCode',
      render: (code: string) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#818CF8' }}>{code}</span>,
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'orderStatus',
      key: 'orderStatus',
      render: (status: string) => renderOrderStatus(status),
    },
    {
      title: 'Phương thức thanh toán',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (val: string) => val || 'COD',
    },
    {
      title: 'Số mặt hàng',
      dataIndex: 'itemsCount',
      key: 'itemsCount',
      render: (count: number) => `${count || 0} sản phẩm`,
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right' as const,
      render: (amount: number) => (
        <strong style={{ color: '#10B981', fontSize: '15px' }}>{formatCurrency(amount)}</strong>
      ),
    },
  ];

  const expandedRowRender = (order: OrderDto) => {
    const itemColumns = [
      { title: 'Tên sản phẩm', dataIndex: 'productName', key: 'productName' },
      { title: 'Danh mục', dataIndex: 'categoryName', key: 'categoryName', render: (cat: string) => cat || '—' },
      { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', render: (val: number) => formatCurrency(val) },
      { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', render: (q: number) => `x${q}` },
      {
        title: 'Thành tiền',
        dataIndex: 'subtotal',
        key: 'subtotal',
        align: 'right' as const,
        render: (sub: number) => <strong>{formatCurrency(sub)}</strong>,
      },
    ];

    return (
      <Table
        columns={itemColumns}
        dataSource={order.items || []}
        rowKey="id"
        pagination={false}
        size="small"
        style={{ margin: '8px 0', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}
      />
    );
  };

  const activityColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'Hành động',
      dataIndex: 'actionType',
      key: 'actionType',
      width: 160,
      render: (act: string) => renderActionType(act),
    },
    {
      title: 'Sản phẩm / Từ khóa liên quan',
      key: 'target',
      render: (_: any, record: UserActivityLogDto) => (
        <div>
          {record.productName && (
            <div style={{ fontWeight: 600, color: '#E2E8F0' }}>{record.productName}</div>
          )}
          {record.searchKeyword && (
            <div style={{ color: '#94A3B8', fontSize: '12px' }}>
              Từ khóa tìm kiếm: <em>"{record.searchKeyword}"</em>
            </div>
          )}
          {record.categoryName && (
            <Tag color="geekblue" style={{ fontSize: '10px' }}>
              {record.categoryName}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Thời lượng',
      dataIndex: 'durationSeconds',
      key: 'durationSeconds',
      width: 120,
      render: (sec?: number) => (sec ? `${sec} giây` : '—'),
    },
    {
      title: 'Thiết bị',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 120,
      render: (dev?: string) => (
        <Tag color={dev === 'MOBILE' ? 'cyan' : 'blue'}>{dev || 'DESKTOP'}</Tag>
      ),
    },
  ];

  return (
    <div className="animate-fade-up">
      {/* Back Button & Top Navigation */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/customers')}
          style={{ borderRadius: '8px' }}
        >
          Quay lại danh sách khách hàng
        </Button>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          Định danh khách hàng ID: #{customer.id} • Tính toán lúc: {formatDateTime(customer.calculatedAt)}
        </span>
      </div>

      {/* Hero Customer 360 Header Card */}
      <Card
        className="glass-card"
        style={{
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={14}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  flexShrink: 0,
                }}
              >
                {customer.fullName ? customer.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <h1
                    style={{
                      fontSize: '26px',
                      fontWeight: 800,
                      margin: 0,
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {customer.fullName}
                  </h1>
                  <SegmentBadge segment={customer.segment} size="large" />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: '#94A3B8', fontSize: '13px' }}>
                  <span>
                    <strong style={{ color: '#818CF8', fontFamily: 'monospace' }}>
                      {customer.customerCode}
                    </strong>
                  </span>
                  {customer.email && (
                    <span>
                      <MailOutlined style={{ marginRight: '6px' }} />
                      {customer.email}
                    </span>
                  )}
                  {customer.phone && (
                    <span>
                      <PhoneOutlined style={{ marginRight: '6px' }} />
                      {customer.phone}
                    </span>
                  )}
                  {customer.city && (
                    <span>
                      <EnvironmentOutlined style={{ marginRight: '6px' }} />
                      {customer.city}
                    </span>
                  )}
                  {customer.createdAt && (
                    <span>
                      <CalendarOutlined style={{ marginRight: '6px' }} />
                      Gia nhập: {formatDate(customer.createdAt)}
                    </span>
                  )}
                </div>
                {/* Marketing advice pill */}
                <div
                  style={{
                    marginTop: '12px',
                    padding: '8px 14px',
                    background: segmentMeta.bgLight,
                    border: `1px solid ${segmentMeta.borderColor}40`,
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#E2E8F0',
                  }}
                >
                  <strong style={{ color: segmentMeta.color }}>Chiến lược đề xuất: </strong>
                  {segmentMeta.actionStrategy}
                </div>
              </div>
            </div>
          </Col>

          {/* Quick Metrics Summary */}
          <Col xs={24} md={10}>
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase' }}>
                    Tổng chi tiêu (Monetary)
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                    {formatCurrency(customer.monetary)}
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase' }}>
                    Số đơn hàng (Frequency)
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#3B82F6', marginTop: '4px' }}>
                    {formatNumber(customer.frequency)} đơn
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase' }}>
                    Số ngày chưa mua (Recency)
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>
                    {customer.recencyDays} ngày
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase' }}>
                    Giá trị đơn TB (AOV)
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#A78BFA', marginTop: '4px' }}>
                    {formatCurrency(customer.avgOrderValue)}
                  </div>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* RFM Score Breakdown Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {(() => {
          const rScore = customer.rScore ?? customer.rscore ?? 0;
          const fScore = customer.fScore ?? customer.fscore ?? 0;
          const mScore = customer.mScore ?? customer.mscore ?? 0;

          return (
            <>
              <Col xs={24} sm={12} lg={6}>
                <Card className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>
                        RECENCY SCORE (R)
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: '#38BDF8', marginTop: '4px' }}>
                        {rScore}<span style={{ fontSize: '16px', color: '#64748B' }}>/5</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                        {customer.recencyDays} ngày kể từ đơn cuối
                      </div>
                    </div>
                    <Progress
                      type="circle"
                      percent={(rScore / 5) * 100}
                      format={() => `${rScore}`}
                      width={56}
                      strokeColor="#38BDF8"
                    />
                  </div>
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>
                        FREQUENCY SCORE (F)
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: '#A855F7', marginTop: '4px' }}>
                        {fScore}<span style={{ fontSize: '16px', color: '#64748B' }}>/5</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                        {customer.frequency} đơn mua thành công
                      </div>
                    </div>
                    <Progress
                      type="circle"
                      percent={(fScore / 5) * 100}
                      format={() => `${fScore}`}
                      width={56}
                      strokeColor="#A855F7"
                    />
                  </div>
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>
                        MONETARY SCORE (M)
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                        {mScore}<span style={{ fontSize: '16px', color: '#64748B' }}>/5</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                        {formatCurrency(customer.monetary)}
                      </div>
                    </div>
                    <Progress
                      type="circle"
                      percent={(mScore / 5) * 100}
                      format={() => `${mScore}`}
                      width={56}
                      strokeColor="#10B981"
                    />
                  </div>
                </Card>
              </Col>
            </>
          );
        })()}

        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>
                  TỔNG ĐIỂM RFM
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#6366F1', marginTop: '4px' }}>
                  {customer.rfmTotal}<span style={{ fontSize: '16px', color: '#64748B' }}>/15</span>
                </div>
                <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                  Danh mục yêu thích: <strong>{customer.preferredCategory || 'Chưa rõ'}</strong>
                </div>
              </div>
              <Progress
                type="circle"
                percent={(customer.rfmTotal / 15) * 100}
                format={() => `${customer.rfmTotal}`}
                width={56}
                strokeColor={{ '0%': '#6366F1', '100%': '#EC4899' }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Behavioral Interaction Stats Banner */}
      <Card className="glass-card" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#38BDF8' }}>
                {customer.totalViews || 0}
              </div>
              <div style={{ color: '#94A3B8', fontSize: '12px' }}>Lượt xem sản phẩm</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B' }}>
                {customer.totalCartAdds || 0}
              </div>
              <div style={{ color: '#94A3B8', fontSize: '12px' }}>Lượt thêm giỏ hàng</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>
                {customer.totalPurchases || 0}
              </div>
              <div style={{ color: '#94A3B8', fontSize: '12px' }}>Đơn hàng hoàn tất</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#EC4899' }}>
                {customer.totalReviews || 0}
              </div>
              <div style={{ color: '#94A3B8', fontSize: '12px' }}>Đánh giá đã gửi</div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Detailed Tabs: Orders, Activities, Segment History */}
      <Card className="glass-card">
        <Tabs
          defaultActiveKey="orders"
          items={[
            {
              key: 'orders',
              label: (
                <span>
                  <ShoppingOutlined /> Lịch sử đơn hàng ({customer.recentOrders?.length || 0})
                </span>
              ),
              children: (
                <Table
                  columns={orderColumns}
                  dataSource={customer.recentOrders || []}
                  rowKey="id"
                  expandable={{
                    expandedRowRender,
                    defaultExpandAllRows: false,
                  }}
                  pagination={{ pageSize: 5 }}
                />
              ),
            },
            {
              key: 'activities',
              label: (
                <span>
                  <ThunderboltOutlined /> Nhật ký hoạt động ({customer.recentActivities?.length || 0})
                </span>
              ),
              children: (
                <Table
                  columns={activityColumns}
                  dataSource={customer.recentActivities || []}
                  rowKey="id"
                  pagination={{ pageSize: 8 }}
                />
              ),
            },
            {
              key: 'history',
              label: (
                <span>
                  <HistoryOutlined /> Lịch sử chuyển dịch phân khúc ({customer.segmentHistory?.length || 0})
                </span>
              ),
              children: (
                <div style={{ padding: '16px 8px' }}>
                  {customer.segmentHistory && customer.segmentHistory.length > 0 ? (
                    <Timeline mode="left">
                      {customer.segmentHistory.map((item: SegmentHistory) => (
                        <Timeline.Item
                          key={item.id}
                          color="#6366F1"
                          label={
                            <span style={{ color: '#94A3B8', fontSize: '12px' }}>
                              {formatDateTime(item.changedAt)}
                            </span>
                          }
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {item.oldSegment ? (
                              <>
                                <SegmentBadge segment={item.oldSegment} size="small" />
                                <span style={{ color: '#64748B' }}>➔</span>
                              </>
                            ) : null}
                            <SegmentBadge segment={item.newSegment} size="small" />
                            <span style={{ color: '#94A3B8', fontSize: '12px' }}>
                              (Điểm RFM: {item.newRfmTotal}/15)
                            </span>
                          </div>
                          {item.reason && (
                            <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                              Lý do: {item.reason}
                            </div>
                          )}
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  ) : (
                    <div style={{ color: '#94A3B8', textAlign: 'center', padding: '32px' }}>
                      Chưa có lịch sử thay đổi phân khúc cho khách hàng này.
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
