export const formatNaira = (value?: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? Number(value) : 0);

export const formatUsd = (value?: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? Number(value) : 0);

export const formatPercent = (value?: number, digits = 1) =>
  `${Number.isFinite(value) ? Number(value).toFixed(digits) : '0.0'}%`;

export const formatDate = (value?: string) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(date);
};

export const formatMonth = (value?: string) => {
  if (!value) return 'Not set';
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-NG', { month: 'short', year: 'numeric' }).format(date);
};
