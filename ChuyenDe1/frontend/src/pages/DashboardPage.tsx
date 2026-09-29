import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Spin, Alert, Button, message } from 'antd';
import {
  UsergroupAddOutlined,
  DollarCircleOutlined,
  ShoppingOutlined,
  AlertOutlined,
  RiseOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../api/analyticsApi';
import type { DashboardSummary } from '../types/analytics';
import { StatCard } from '../components/cards/StatCard';
import { SegmentBadge } from '../components/cards/SegmentBadge';
import { SegmentPieChart } from '../components/charts/SegmentPieChart';
import { MonthlyRevenueChart } from '../components/charts/MonthlyRevenueChart';
import { CategoryBarChart } from '../components/charts/CategoryBarChart';
import { formatCurrency, formatNumber } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getDashboard();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể nạp dữ liệu Dashboard');
      message.error(err.message || 'Lỗi nạp dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '100px 0', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
          Đang tải dữ liệu phân tích khách hàng...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert
        type="error"
        message="Lỗi nạp dữ liệu"
        description={error || 'Không nhận được dữ liệu từ backend.'}
        showIcon
        action={<Button onClick={fetchDashboard}>Thử lại</Button>}
      />
    );
  }

  const segmentTableColumns = [
    {
      title: 'Phân khúc khách hàng',
      dataIndex: 'segment',
      key: 'segment',
      render: (seg: string) => <SegmentBadge segment={seg} />,
    },
    {
      title: 'Số khách hàng',
      dataIndex: 'total_customers',
      key: 'total_customers',
      render: (val: number, row: any) => (
        <span>
          <strong>{formatNumber(val)}</strong> ({row.percentage}%)
        </span>
      ),
      sorter: (a: any, b: any) => a.total_customers - b.total_customers,
    },
    {
      title: 'Tổng doanh thu',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      render: (val: number) => formatCurrency(val),
      sorter: (a: any, b: any) => a.total_revenue - b.total_revenue,
    },
    {
      title: 'Chi tiêu TB/khách',
      dataIndex: 'avg_monetary',
      key: 'avg_monetary',
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Điểm RFM TB',
      dataIndex: 'avg_rfm_score',
      key: 'avg_rfm_score',
      render: (val: number) => (
        <span style={{ fontWeight: 700, color: val >= 3.5 ? '#10B981' : val >= 2.5 ? '#F59E0B' : '#EF4444' }}>
          {val?.toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, row: any) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/customers?segment=${row.segment}`)}
        >
          Xem khách hàng <RightOutlined style={{ fontSize: '10px' }} />
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-up">
      {/* Page Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Dashboard Phân Tích Khách Hàng
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Tổng quan chỉ số RFM (Recency, Frequency, Monetary) & hành vi mua sắm
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            type="primary"
            icon={<RiseOutlined />}
            onClick={() => navigate('/rfm')}
            style={{ borderRadius: '6px', fontWeight: 600 }}
          >
            Ma trận Heatmap RFM
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Tổng khách hàng"
            value={formatNumber(data.totalCustomers)}
            icon={<UsergroupAddOutlined />}
            subtitle="Đã được phân loại RFM"
            color="#6366F1"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Tổng doanh thu"
            value={formatCurrency(data.totalRevenue)}
            icon={<DollarCircleOutlined />}
            subtitle="Từ tất cả các đơn thành công"
            color="#10B981"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Tổng đơn hàng"
            value={formatNumber(data.totalOrders)}
            icon={<ShoppingOutlined />}
            subtitle={`Chi tiêu TB: ${formatCurrency(data.avgSpendPerCustomer)}`}
            color="#3B82F6"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Cảnh báo rời bỏ (Churn Risk)"
            value={formatNumber(data.churnRiskCount)}
            icon={<AlertOutlined />}
            subtitle="Khách hàng cần kích hoạt lại"
            color="#EF4444"
          />
        </Col>
      </Row>

      {/* Charts Section */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={10}>
          <Card
            className="glass-card"
            title="Tỷ lệ phân khúc khách hàng"
            extra={
              <Button type="link" size="small" onClick={() => navigate('/customers')}>
                Xem tất cả
              </Button>
            }
          >
            <SegmentPieChart data={data.vrfmSummary || []} />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card
            className="glass-card"
            title="Xu hướng doanh thu theo tháng (Cohorts)"
            extra={<span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Dữ liệu từ View v_monthly_revenue_cohort</span>}
          >
            <MonthlyRevenueChart data={data.monthlyTrends || []} />
          </Card>
        </Col>
      </Row>

      {/* Segment Breakdown Table & Category Preferences */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card
            className="glass-card"
            title="Bảng thống kê chi tiết từng phân khúc (View: v_rfm_summary)"
          >
            <Table
              dataSource={data.vrfmSummary || []}
              columns={segmentTableColumns}
              rowKey="segment"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card
            className="glass-card"
            title="Danh mục bán chạy theo phân khúc"
            extra={<span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>View: v_category_preference</span>}
          >
            <CategoryBarChart data={data.topCategoryPreferences || []} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
