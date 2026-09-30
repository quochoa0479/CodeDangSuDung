import React from 'react';
import { Card, Tooltip } from 'antd';
import type { RfmMatrixCell } from '../../types/analytics';
import { getSegmentMeta } from '../../utils/segmentColors';

interface HeatmapGridProps {
  matrix: RfmMatrixCell[];
  onCellClick?: (r: number, f: number) => void;
}

// Map (R, F) to approximate business segment label
const getSegmentForRF = (r: number, f: number): string => {
  if (r >= 4 && f >= 4) return 'CHAMPIONS';
  if (r >= 3 && f >= 3) return 'LOYAL_CUSTOMERS';
  if (r >= 4 && f >= 1 && f <= 3) return 'POTENTIAL_LOYALISTS';
  if (r >= 4 && f === 1) return 'NEW_CUSTOMERS';
  if (r >= 3 && r <= 4 && f <= 2) return 'PROMISING';
  if (r <= 2 && f >= 4) return 'CANNOT_LOSE_THEM';
  if (r <= 2 && f >= 3) return 'AT_RISK';
  if (r <= 2 && f <= 2) return 'ABOUT_TO_SLEEP';
  return 'LOST';
};

export const HeatmapGrid: React.FC<HeatmapGridProps> = ({ matrix, onCellClick }) => {
  const rScores = [5, 4, 3, 2, 1]; // Rows (Y axis - Recency: 5 high to 1 low)
  const fScores = [1, 2, 3, 4, 5]; // Columns (X axis - Frequency: 1 to 5)

  // Quick lookup map: "R_F" -> count
  const cellMap = new Map<string, number>();
  let maxCount = 1;
  matrix.forEach((m) => {
    const key = `${m.rScore}_${m.fScore}`;
    cellMap.set(key, m.count);
    if (m.count > maxCount) maxCount = m.count;
  });

  return (
    <Card
      className="glass-card"
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Ma trận nhiệt RFM 5x5 (Recency × Frequency)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>
            *Trục dọc: Điểm Recency (Gần đây) | Trục ngang: Điểm Frequency (Tần suất)
          </span>
        </div>
      }
    >
      <div style={{ overflowX: 'auto', padding: '10px 0' }}>
        <div style={{ display: 'inline-block', minWidth: '550px', width: '100%' }}>
          {/* Header Row: Frequency Labels */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(5, 1fr)', gap: '8px', marginBottom: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              R \ F
            </div>
            {fScores.map((f) => (
              <div key={`header-f-${f}`} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                F = {f}
              </div>
            ))}
          </div>

          {/* 5 Rows */}
          {rScores.map((r) => (
            <div
              key={`row-r-${r}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px repeat(5, 1fr)',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              {/* Row Header (Recency) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                R = {r}
              </div>

              {/* 5 Column Cells */}
              {fScores.map((f) => {
                const count = cellMap.get(`${r}_${f}`) || 0;
                const segKey = getSegmentForRF(r, f);
                const meta = getSegmentMeta(segKey);

                // Background opacity based on count
                const intensity = count > 0 ? Math.max(0.2, count / maxCount) : 0.05;

                return (
                  <Tooltip
                    key={`cell-${r}-${f}`}
                    title={
                      <div style={{ fontSize: '12px' }}>
                        <div style={{ fontWeight: 700, color: meta.color }}>{meta.nameVi}</div>
                        <div>Tọa độ: Điểm R = {r}, Điểm F = {f}</div>
                        <div>Số lượng: <strong>{count} khách hàng</strong></div>
                      </div>
                    }
                  >
                    <div
                      onClick={() => onCellClick?.(r, f)}
                      style={{
                        height: '68px',
                        borderRadius: '10px',
                        backgroundColor: count > 0 ? `${meta.color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}` : 'rgba(255, 255, 255, 0.02)',
                        border: count > 0 ? `1px solid ${meta.borderColor}80` : '1px solid rgba(255, 255, 255, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: count > 0 ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        padding: '6px',
                        textAlign: 'center',
                      }}
                      onMouseEnter={(e) => {
                        if (count > 0) {
                          e.currentTarget.style.transform = 'scale(1.04)';
                          e.currentTarget.style.borderColor = meta.color;
                          e.currentTarget.style.zIndex = '10';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.borderColor = count > 0 ? `${meta.borderColor}80` : 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.zIndex = '1';
                      }}
                    >
                      <span style={{ fontSize: '18px', fontWeight: 800, color: count > 0 ? '#FFFFFF' : '#475569' }}>
                        {count}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          color: count > 0 ? '#E2E8F0' : '#475569',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '90%',
                        }}
                      >
                        {meta.nameVi.split(' ')[0]} {meta.nameVi.split(' ')[1] || ''}
                      </span>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
