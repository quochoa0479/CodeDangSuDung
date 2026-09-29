import dayjs from 'dayjs';

export const formatCurrency = (value?: number | null): string => {
  if (value === undefined || value === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatCompactNumber = (value?: number | null): string => {
  if (value === undefined || value === null) return '0';
  if (value >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1) + ' tỷ';
  }
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + ' tr';
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(1) + ' k';
  }
  return value.toLocaleString('vi-VN');
};

export const formatNumber = (value?: number | null): string => {
  if (value === undefined || value === null) return '0';
  return value.toLocaleString('vi-VN');
};

export const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  return dayjs(dateStr).format('DD/MM/YYYY');
};

export const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  return dayjs(dateStr).format('DD/MM/YYYY HH:mm');
};
