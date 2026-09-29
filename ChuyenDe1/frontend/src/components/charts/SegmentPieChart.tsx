import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { SegmentSummary } from '../../types/analytics';
import { getSegmentMeta } from '../../utils/segmentColors';
import { formatNumber, formatCurrency } from '../../utils/formatters';

interface SegmentPieChartProps {
  data: SegmentSummary[];
}

export const SegmentPieChart: React.FC<SegmentPieChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Chưa có dữ liệu phân khúc
      </div>
    );
  }

  const chartData = data.map((item) => {
    const meta = getSegmentMeta(item.segment);
    return {
      name: meta.nameVi,
      segmentKey: item.segment,
      value: item.total_customers,
      percentage: item.percentage,
      revenue: item.total_revenue,
      avgSpend: item.avg_monetary,
      color: meta.color,
    };
  });

  return (
    <div style={{ width: '100%', height: '320px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: `1px solid ${d.color}`,
                      padding: '12px 16px',
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: d.color, marginBottom: '6px' }}>{d.name}</div>
                    <div style={{ color: '#fff' }}>Số lượng: <strong>{formatNumber(d.value)} KH</strong> ({d.percentage}%)</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Tổng doanh thu: {formatCurrency(d.revenue)}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Chi tiêu TB: {formatCurrency(d.avgSpend)}</div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={105}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
