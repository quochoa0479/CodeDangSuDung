import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyRevenue } from '../../types/analytics';
import { formatCurrency, formatCompactNumber } from '../../utils/formatters';

interface MonthlyRevenueChartProps {
  data: MonthlyRevenue[];
}

export const MonthlyRevenueChart: React.FC<MonthlyRevenueChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Chưa có dữ liệu xu hướng doanh thu
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '320px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
          <XAxis
            dataKey="orderMonth"
            stroke="#94A3B8"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#94A3B8"
            fontSize={12}
            tickLine={false}
            tickFormatter={(val) => formatCompactNumber(val)}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as MonthlyRevenue;
                return (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#A5B4FC', marginBottom: '6px' }}>Tháng {label}</div>
                    <div style={{ color: '#fff' }}>Doanh thu: <strong>{formatCurrency(d.monthlyRevenue)}</strong></div>
                    <div style={{ color: 'var(--text-secondary)' }}>Tổng đơn hàng: {d.totalOrders} đơn</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Khách mua hàng: {d.activeCustomers} người</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Giá trị TB/đơn: {formatCurrency(d.avgOrderValue)}</div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="monthlyRevenue"
            stroke="#6366F1"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#revenueGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
