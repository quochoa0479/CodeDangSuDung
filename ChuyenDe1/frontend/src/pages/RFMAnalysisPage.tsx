import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Spin,
  Alert,
  Modal,
  message,
  Divider,
} from 'antd';
import {
  ReloadOutlined,
  ThunderboltOutlined,
  RightOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';
import { analyticsApi } from '../api/analyticsApi';
import { segmentApi } from '../api/segmentApi';
import type { RfmDistribution, SegmentSummary } from '../types/analytics';
import { HeatmapGrid } from '../components/charts/HeatmapGrid';
import { SEGMENT_METAS } from '../utils/segmentColors';
import { formatNumber } from '../utils/formatters';

const R_COLORS = ['#EF4444', '#F97316', '#FBBF24', '#38BDF8', '#10B981'];
const F_COLORS = ['#94A3B8', '#60A5FA', '#818CF8', '#A855F7', '#EC4899'];
const M_COLORS = ['#64748B', '#34D399', '#10B981', '#059669', '#047857'];

export const RFMAnalysisPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [data, setData] = useState<RfmDistribution | null>(null);
  const [summaries, setSummaries] = useState<SegmentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchRfmData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [distRes, overviewRes] = await Promise.all([
        analyticsApi.getRfmDistribution(),
        segmentApi.getOverview(),
      ]);

      if (distRes.success && distRes.data) {
        setData(distRes.data);
      }
      if (overviewRes.success && overviewRes.data) {
        setSummaries(overviewRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải dữ liệu phân tích RFM');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfmData();
  }, []);

  const handleRecalculate = () => {
    Modal.confirm({
      title: 'Xác nhận tính toán lại RFM toàn hệ thống?',
      content:
        'Hệ thống sẽ chạy Store Procedure `sp_calculate_rfm` để xếp hạng phân vị R, F, M (1-5) và phân loại lại toàn bộ khách hàng vào 10 phân khúc theo mô hình chuẩn.',
      okText: 'Chạy tính toán ngay',
      cancelText: 'Hủy bỏ',
      okButtonProps: { type: 'primary', danger: true },
      onOk: async () => {
        setRecalculating(true);
        try {
          const res = await segmentApi.recalculate();
          if (res.success) {
            message.success('Đã tính toán lại phân khúc RFM thành công!');
            fetchRfmData();
          } else {
            message.error(res.message || 'Lỗi khi tính toán phân khúc');
          }
        } catch (err: any) {
          message.error(err.message || 'Không thể thực thi phân loại RFM');
        } finally {
          setRecalculating(false);
        }
      },
    });
  };

  const handleCellClick = (r: number, f: number) => {
    // When a cell is clicked, navigate to customers or filter
    message.info(`Đang xem khách hàng có điểm R=${r} và F=${f}`);
  };

  if (loading) {
    return (
      <div style={{ padding: '120px 0', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
          Đang tính toán ma trận phân phối RFM...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert
        type="error"
        message="Không thể nạp dữ liệu RFM"
        description={error || 'Vui lòng kiểm tra kết nối tới backend.'}
        showIcon
        action={<Button onClick={fetchRfmData}>Thử lại</Button>}
      />
    );
  }

  // Transform distributions for charts
  const rChartData = (data.rdistribution || []).map((d) => ({
    label: `R = ${d.score}`,
    score: d.score,
    count: d.count,
  }));

  const fChartData = (data.fdistribution || []).map((d) => ({
    label: `F = ${d.score}`,
    score: d.score,
    count: d.count,
  }));

  const mChartData = (data.mdistribution || []).map((d) => ({
    label: `M = ${d.score}`,
    score: d.score,
    count: d.count,
  }));

  // Map summary counts for each segment
  const summaryCountMap = new Map<string, number>();
  summaries.forEach((s) => summaryCountMap.set(s.segment, s.total_customers));

  return (
    <div className="animate-fade-up">
      {/* Header */}
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
            Mô Hình Phân Khúc RFM Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Phân bổ khách hàng theo ma trận Recency (Gần đây), Frequency (Tần suất) và Monetary (Chi tiêu)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={recalculating}
            onClick={handleRecalculate}
            style={{
              borderRadius: '6px',
              fontWeight: 600,
            }}
          >
            Tính toán lại phân khúc RFM
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchRfmData}>
            Làm mới
          </Button>
        </div>
      </div>

      {/* RFM Methodology Explanatory Banner */}
      <Card
        className="glass-card"
        style={{
          marginBottom: '24px',
          borderLeft: '4px solid #6366F1',
          background: 'rgba(99, 102, 241, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <InfoCircleOutlined style={{ fontSize: '20px', color: '#818CF8', marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '15px', marginBottom: '4px' }}>
              Quy tắc tính điểm phân vị (Quintile Scoring 1 - 5) trong hệ thống
            </div>
            <div style={{ color: '#94A3B8', fontSize: '13px', lineHeight: 1.6 }}>
              Hệ thống áp dụng thuật toán chia phân vị chuẩn: <strong>Recency (R)</strong> đánh giá số ngày kể từ giao dịch cuối (ngày càng ít điểm càng cao), <strong>Frequency (F)</strong> tính theo tổng số đơn hàng đã hoàn tất, và <strong>Monetary (M)</strong> tính theo tổng giá trị chi tiêu thực tế. Mỗi chỉ số được gán từ 1 (thấp nhất) đến 5 (cao nhất). Kết hợp bộ ba chỉ số xác định 10 phân khúc hành vi khách hàng đặc trưng.
            </div>
          </div>
        </div>
      </Card>

      {/* Row 1: 5x5 Heatmap Matrix */}
      <div style={{ marginBottom: '24px' }}>
        <HeatmapGrid matrix={data.heatmapMatrix || []} onCellClick={handleCellClick} />
      </div>

      {/* Row 2: R, F, M Individual Distributions */}
      <div style={{ marginBottom: '32px' }}>
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            marginBottom: '16px',
            color: '#FFFFFF',
          }}
        >
          Phân Bổ Điểm Số R - F - M (Thang điểm 1 đến 5)
        </h2>

        <Row gutter={[16, 16]}>
          {/* Recency Distribution */}
          <Col xs={24} md={8}>
            <Card
              className="glass-card"
              title={
                <div>
                  <span style={{ color: '#38BDF8' }}>Điểm Recency (R)</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                    1: Rất lâu chưa mua ➔ 5: Vừa mua gần đây
                  </div>
                </div>
              }
            >
              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <RechartsTooltip
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#FFF',
                      }}
                      formatter={(val: any) => [`${formatNumber(val)} khách hàng`, 'Số lượng']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {rChartData.map((_, index) => (
                        <Cell key={`r-cell-${index}`} fill={R_COLORS[index % R_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          {/* Frequency Distribution */}
          <Col xs={24} md={8}>
            <Card
              className="glass-card"
              title={
                <div>
                  <span style={{ color: '#A855F7' }}>Điểm Frequency (F)</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                    1: Mua 1 đơn ➔ 5: Mua thường xuyên liên tục
                  </div>
                </div>
              }
            >
              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <RechartsTooltip
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#FFF',
                      }}
                      formatter={(val: any) => [`${formatNumber(val)} khách hàng`, 'Số lượng']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {fChartData.map((_, index) => (
                        <Cell key={`f-cell-${index}`} fill={F_COLORS[index % F_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          {/* Monetary Distribution */}
          <Col xs={24} md={8}>
            <Card
              className="glass-card"
              title={
                <div>
                  <span style={{ color: '#10B981' }}>Điểm Monetary (M)</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                    1: Chi tiêu ít nhất ➔ 5: Chi tiêu giá trị cực cao
                  </div>
                </div>
              }
            >
              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <RechartsTooltip
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#FFF',
                      }}
                      formatter={(val: any) => [`${formatNumber(val)} khách hàng`, 'Số lượng']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {mChartData.map((_, index) => (
                        <Cell key={`m-cell-${index}`} fill={M_COLORS[index % M_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Row 3: 10 Segment Playbook Cards */}
      <div>
        <div style={{ marginBottom: '16px' }}>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              marginBottom: '4px',
              color: '#FFFFFF',
            }}
          >
            Cẩm Nang & Chiến Lược Tiếp Thị 10 Phân Khúc (Segment Playbook)
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Kế hoạch hành động cụ thể để tối ưu chuyển đổi và hạn chế tỷ lệ khách hàng rời bỏ
          </p>
        </div>

        <Row gutter={[16, 16]}>
          {Object.entries(SEGMENT_METAS).map(([key, meta]) => {
            const customerCount = summaryCountMap.get(key) || 0;

            return (
              <Col xs={24} sm={12} lg={12} xl={8} key={key}>
                <Card
                  className="glass-card"
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderTop: `3px solid ${meta.color}`,
                  }}
                  bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '16px', color: '#FFFFFF' }}>
                        {meta.nameVi}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                        {meta.key}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        backgroundColor: meta.bgLight,
                        color: meta.color,
                        fontWeight: 700,
                        fontSize: '12px',
                        border: `1px solid ${meta.borderColor}50`,
                      }}
                    >
                      {formatNumber(customerCount)} KH
                    </span>
                  </div>

                  <p style={{ color: '#CBD5E1', fontSize: '13px', marginBottom: '12px' }}>
                    {meta.description}
                  </p>

                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      flex: 1,
                    }}
                  >
                    <div style={{ fontSize: '11px', color: meta.color, fontWeight: 700, marginBottom: '2px', textTransform: 'uppercase' }}>
                      💡 Chiến lược hành động:
                    </div>
                    <div style={{ fontSize: '12px', color: '#E2E8F0', lineHeight: 1.5 }}>
                      {meta.actionStrategy}
                    </div>
                  </div>

                  <Button
                    type="link"
                    size="small"
                    onClick={() => navigate(`/customers?segment=${meta.key}`)}
                    style={{ padding: 0, color: meta.color, fontWeight: 600 }}
                  >
                    Xem danh sách khách hàng <RightOutlined style={{ fontSize: '10px' }} />
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    </div>
  );
};
