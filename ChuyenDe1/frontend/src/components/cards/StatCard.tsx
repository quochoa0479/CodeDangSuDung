import React from 'react';
import { Card } from 'antd';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: string;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  trend,
  color = '#38BDF8',
}) => {
  return (
    <Card className="glass-card" style={{ height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div
            style={{
              color: '#94A3B8',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
            }}
          >
            {value}
          </div>
          {(subtitle || trend) && (
            <div
              style={{
                marginTop: '6px',
                fontSize: '12px',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {trend && <span style={{ color: '#10B981', fontWeight: 600 }}>{trend}</span>}
              <span>{subtitle}</span>
            </div>
          )}
        </div>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: '#1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
            fontSize: '18px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
};
