import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Tabs,
  Alert,
  Space,
  message,
} from 'antd';
import {
  AlertOutlined,
  DownloadOutlined,
  ReloadOutlined,
  EyeOutlined,
  RiseOutlined,
  AppstoreOutlined,
  PhoneOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import Papa from 'papaparse';
import { analyticsApi } from '../api/analyticsApi';
import type { ChurnRiskCustomer, MonthlyRevenue, CategoryPreference } from '../types/analytics';
import { SegmentBadge } from '../components/cards/SegmentBadge';
import { MonthlyRevenueChart } from '../components/charts/MonthlyRevenueChart';
import { CategoryBarChart } from '../components/charts/CategoryBarChart';
import { formatCurrency, formatNumber } from '../utils/formatters';

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('churn');
  const [loading, setLoading] = useState(true);

  const [churnCustomers, setChurnCustomers] = useState<ChurnRiskCustomer[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<MonthlyRevenue[]>([]);
  const [categoryPrefs, setCategoryPrefs] = useState<CategoryPreference[]>([]);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [churnRes, revRes, catRes] = await Promise.all([
        analyticsApi.getChurnRisk(),
        analyticsApi.getRevenueTrends(),
        analyticsApi.getCategoryPreference(),
      ]);

      if (churnRes.success && churnRes.data) {
        setChurnCustomers(churnRes.data);
      }
      if (revRes.success && revRes.data) {
        setRevenueTrends(revRes.data);
      }
      if (catRes.success && catRes.data) {
        setCategoryPrefs(catRes.data);
      }
    } catch (err: any) {
      message.error('Lỗi khi nạp dữ liệu báo cáo chuyên sâu');
    } finally {
      setLoading(false);
    }
  };

  const handleExportChurnCsv = () => {
    if (churnCustomers.length === 0) {
      message.warning('Không có khách hàng rủi ro để xuất');
      return;
    }

    const exportData = churnCustomers.map((c) => ({
      'Mã KH': c.customerCode,
      'Họ và tên': c.fullName,
      Email: c.email,
      'Số điện thoại': c.phone,
      'Phân khúc': c.segment,
      'Số ngày chưa mua (Recency)': c.recencyDays,
      'Tổng số đơn': c.frequency,
      'Tổng chi tiêu': c.monetary,
      'Lần mua cuối': c.lastPurchaseAt || '—',
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `khach_hang_nguy_co_roi_bo_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Đã xuất danh sách khách hàng rủi ro thành công!');
  };

  // Churn Table Columns
  const churnColumns = [
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, r: ChurnRiskCustomer) => (
        <div>
          <div
            style={{ fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}
            onClick={() => navigate(`/customers/${r.customerId}`)}
          >
            {r.fullName}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
            <span style={{ fontFamily: 'monospace', color: '#818CF8' }}>{r.customerCode}</span> •{' '}
            {r.phone || r.email || '—'}
          </div>
        </div>
      ),
    },
    {
      title: 'Phân khúc RFM',
      dataIndex: 'segment',
      key: 'segment',
      render: (seg: string) => <SegmentBadge segment={seg} />,
    },
    {
      title: 'Số ngày chưa mua',
      dataIndex: 'recencyDays',
      key: 'recencyDays',
      sorter: (a: ChurnRiskCustomer, b: ChurnRiskCustomer) => a.recencyDays - b.recencyDays,
      render: (days: number) => (
        <span style={{ fontWeight: 700, color: days > 90 ? '#EF4444' : '#F97316' }}>
          {days} ngày
        </span>
      ),
    },
    {
      title: 'Số đơn hàng',
      dataIndex: 'frequency',
      key: 'frequency',
      render: (f: number) => `${f} đơn`,
    },
    {
      title: 'Tổng chi tiêu quá khứ',
      dataIndex: 'monetary',
      key: 'monetary',
      sorter: (a: ChurnRiskCustomer, b: ChurnRiskCustomer) => a.monetary - b.monetary,
      render: (m: number) => (
        <strong style={{ color: '#10B981' }}>{formatCurrency(m)}</strong>
      ),
    },
    {
      title: 'Hành động đề xuất',
      key: 'actionAdvice',
      render: (_: any, r: ChurnRiskCustomer) => {
        if (r.segment === 'CANNOT_LOSE_THEM') {
          return (
            <Tag icon={<PhoneOutlined />} color="error">
              Telesale CSKH 1-1
            </Tag>
          );
        }
        if (r.segment === 'AT_RISK') {
          return (
            <Tag icon={<GiftOutlined />} color="warning">
              Tặng Voucher giảm 20%
            </Tag>
          );
        }
        return <Tag color="orange">Email kích hoạt lại</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, r: ChurnRiskCustomer) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/customers/${r.customerId}`)}
        >
          Hồ sơ 360°
        </Button>
      ),
    },
  ];

  // Revenue Columns
  const revenueColumns = [
    {
      title: 'Tháng giao dịch',
      dataIndex: 'orderMonth',
      key: 'orderMonth',
      render: (m: string) => <strong style={{ color: '#6366F1' }}>{m}</strong>,
    },
    {
      title: 'Khách hàng giao dịch',
      dataIndex: 'activeCustomers',
      key: 'activeCustomers',
      render: (c: number) => `${formatNumber(c)} khách`,
    },
    {
      title: 'Tổng số đơn hàng',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      render: (o: number) => `${formatNumber(o)} đơn`,
    },
    {
      title: 'Doanh thu tháng',
      dataIndex: 'monthlyRevenue',
      key: 'monthlyRevenue',
      render: (r: number) => <strong style={{ color: '#10B981' }}>{formatCurrency(r)}</strong>,
    },
    {
      title: 'Giá trị TB / đơn',
      dataIndex: 'avgOrderValue',
      key: 'avgOrderValue',
      render: (a: number) => formatCurrency(a),
    },
  ];

  // Category Preferences Columns
  const categoryColumns = [
    {
      title: 'Phân khúc khách hàng',
      dataIndex: 'segment',
      key: 'segment',
      render: (s: string) => <SegmentBadge segment={s} />,
    },
    {
      title: 'Danh mục sản phẩm ưa chuộng',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (cat: string) => <Tag color="blue">{cat}</Tag>,
    },
    {
      title: 'Số mặt hàng đã mua',
      dataIndex: 'totalItemsSold',
      key: 'totalItemsSold',
      render: (num: number) => `${formatNumber(num)} sản phẩm`,
    },
    {
      title: 'Tổng doanh thu danh mục',
      dataIndex: 'categoryRevenue',
      key: 'categoryRevenue',
      render: (rev: number) => <strong style={{ color: '#10B981' }}>{formatCurrency(rev)}</strong>,
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
            Báo Cáo & Phân Tích Chuyên Sâu
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Truy xuất dữ liệu trực tiếp từ các Database View: v_churn_risk_customers, v_monthly_revenue_cohort, v_category_preference
          </p>
        </div>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchReportData} loading={loading}>
            Làm mới dữ liệu
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'churn',
            label: (
              <span>
                <AlertOutlined style={{ color: '#EF4444' }} /> Cảnh Báo Nguy Cơ Rời Bỏ ({churnCustomers.length})
              </span>
            ),
            children: (
              <div>
                <Alert
                  type="warning"
                  showIcon
                  message="Danh sách khách hàng đang có dấu hiệu giảm sút tương tác hoặc ngừng mua sắm"
                  description="Dữ liệu tổng hợp từ View `v_churn_risk_customers`. Đây là những khách hàng đã lâu chưa quay lại (> 60 ngày) hoặc thuộc các phân khúc có nguy cơ mất khách (Can't Lose Them, At Risk, About To Sleep). Hãy triển khai chiến dịch kích hoạt lại kịp thời."
                  style={{ marginBottom: '20px' }}
                />

                <Card
                  className="glass-card"
                  title={`Danh sách khách hàng cần can thiệp (${churnCustomers.length} khách hàng)`}
                  extra={
                    <Button icon={<DownloadOutlined />} onClick={handleExportChurnCsv}>
                      Xuất danh sách (CSV)
                    </Button>
                  }
                >
                  <Table
                    dataSource={churnCustomers}
                    columns={churnColumns}
                    rowKey="customerId"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'revenue',
            label: (
              <span>
                <RiseOutlined style={{ color: '#10B981' }} /> Doanh Thu & Cohort Theo Tháng
              </span>
            ),
            children: (
              <div>
                <Card className="glass-card" style={{ marginBottom: '24px' }} title="Biểu đồ xu hướng doanh thu và khách hàng mua theo tháng">
                  <MonthlyRevenueChart data={revenueTrends} />
                </Card>

                <Card className="glass-card" title="Bảng thống kê chi tiết theo tháng (View: v_monthly_revenue_cohort)">
                  <Table
                    dataSource={revenueTrends}
                    columns={revenueColumns}
                    rowKey="orderMonth"
                    loading={loading}
                    pagination={false}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'category',
            label: (
              <span>
                <AppstoreOutlined style={{ color: '#38BDF8' }} /> Thị Hiếu Danh Mục Sản Phẩm
              </span>
            ),
            children: (
              <div>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <Card className="glass-card" title="Biểu đồ phân bổ doanh thu theo danh mục" style={{ height: '100%' }}>
                      <CategoryBarChart data={categoryPrefs} />
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card className="glass-card" title="Chi tiết thị hiếu sản phẩm theo phân khúc (View: v_category_preference)">
                      <Table
                        dataSource={categoryPrefs}
                        columns={categoryColumns}
                        rowKey={(r) => `${r.segment}_${r.categoryName}`}
                        loading={loading}
                        pagination={{ pageSize: 8 }}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};
