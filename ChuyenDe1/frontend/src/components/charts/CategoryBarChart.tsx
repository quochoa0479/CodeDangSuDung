import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { CategoryPreference } from '../../types/analytics';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { getSegmentMeta } from '../../utils/segmentColors';

interface CategoryBarChartProps {
  data: CategoryPreference[];
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Chưa có dữ liệu danh mục ưa chuộng
      </div>
    );
  }

  // Take top 8 items
  const topItems = data.slice(0, 8);

  return (
    <div style={{ width: '100%', height: '320px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={topItems} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
          <XAxis
            dataKey="categoryName"
            stroke="#94A3B8"
            fontSize={11}
            interval={0}
            angle={-15}
            textAnchor="end"
          />
          <YAxis
            stroke="#94A3B8"
            fontSize={12}
            tickLine={false}
            tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as CategoryPreference;
                const meta = getSegmentMeta(d.segment);
                return (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: `1px solid ${meta.color}`,
                      padding: '12px 16px',
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>{d.categoryName}</div>
                    <div style={{ color: meta.color, fontWeight: 600, marginBottom: '6px' }}>{meta.nameVi}</div>
                    <div style={{ color: '#fff' }}>Doanh thu: <strong>{formatCurrency(d.categoryRevenue)}</strong></div>
                    <div style={{ color: 'var(--text-secondary)' }}>Đã bán: {formatNumber(d.totalItemsSold)} sản phẩm</div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="categoryRevenue" radius={[6, 6, 0, 0]}>
            {topItems.map((entry, index) => {
              const meta = getSegmentMeta(entry.segment);
              return <Cell key={`bar-${index}`} fill={meta.color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
