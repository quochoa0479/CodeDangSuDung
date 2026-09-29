import React from 'react';
import { getSegmentMeta } from '../../utils/segmentColors';

interface SegmentBadgeProps {
  segment?: string;
  showDot?: boolean;
  size?: 'small' | 'middle' | 'large';
}

export const SegmentBadge: React.FC<SegmentBadgeProps> = ({
  segment,
  showDot = true,
  size = 'middle',
}) => {
  const meta = getSegmentMeta(segment);

  const sizeStyles = {
    small: { padding: '2px 8px', fontSize: '11px' },
    middle: { padding: '3px 10px', fontSize: '12px' },
    large: { padding: '5px 14px', fontSize: '13px' },
  }[size];

  return (
    <span
      className="pulse-badge"
      style={{
        ...sizeStyles,
        backgroundColor: meta.bgLight,
        color: meta.color,
        border: `1px solid ${meta.borderColor}30`,
      }}
      title={meta.description}
    >
      {showDot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: meta.color,
          }}
        />
      )}
      {meta.nameVi}
    </span>
  );
};
