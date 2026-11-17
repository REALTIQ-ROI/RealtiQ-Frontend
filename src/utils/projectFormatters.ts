import type { OffPlanDevelopmentStatus, ProjectPriceRangesByCurrency, ProjectStatus, ProjectType } from '../types';

export const formatNgn = (value?: number, currency = 'NGN') =>
  typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
    : 'Price unavailable';

export const labelize = (value?: string | null) =>
  value ? value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Not specified';

export const projectTypeLabels: Record<ProjectType, string> = {
  estate: 'Estate',
  apartment_development: 'Apartment Development',
  residential: 'Residential',
  commercial: 'Commercial',
  mixed_use: 'Mixed Use',
  housing_project: 'Housing Project',
  other: 'Other',
};

export const projectStatusClasses: Record<ProjectStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  upcoming: 'bg-sky-100 text-sky-800',
  ongoing: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-indigo-100 text-indigo-800',
  sold_out: 'bg-amber-100 text-amber-800',
  suspended: 'bg-red-100 text-red-800',
};

export const offPlanStatusClasses: Record<OffPlanDevelopmentStatus, string> = {
  planned: 'bg-slate-100 text-slate-700',
  pre_construction: 'bg-sky-100 text-sky-800',
  foundation: 'bg-amber-100 text-amber-800',
  structural: 'bg-orange-100 text-orange-800',
  roofing: 'bg-purple-100 text-purple-800',
  finishing: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-emerald-100 text-emerald-800',
};

export const formatPriceRange = (minimum?: number, maximum?: number, currency = 'NGN') => {
  if (typeof minimum !== 'number' && typeof maximum !== 'number') return 'Price unavailable';
  if (minimum === maximum || typeof maximum !== 'number') return `From ${formatNgn(minimum, currency)}`;
  if (typeof minimum !== 'number') return `Up to ${formatNgn(maximum, currency)}`;
  return `${formatNgn(minimum, currency)} - ${formatNgn(maximum, currency)}`;
};

export const formatCurrencyRanges = (ranges?: ProjectPriceRangesByCurrency, fallback?: { minimum?: number; maximum?: number; currency?: string }, aggregateState?: string) => {
  const values = Object.entries(ranges ?? {}).flatMap(([currency, value]) => {
    if (!value) return [];
    const minimum = typeof value.minimum === 'number' && Number.isFinite(value.minimum) ? value.minimum : undefined;
    const maximum = typeof value.maximum === 'number' && Number.isFinite(value.maximum) ? value.maximum : undefined;
    const range = minimum !== undefined || maximum !== undefined ? formatPriceRange(minimum, maximum, currency) : '';
    const poaCount = Number.isInteger(value.priceOnApplicationCount) && value.priceOnApplicationCount > 0 ? value.priceOnApplicationCount : 0;
    const details = [range, poaCount ? `${poaCount} price on application` : ''].filter(Boolean);
    return details.length ? [`${currency}: ${details.join(' · ')}`] : [];
  });
  if (values.length) return values.join(' · ');
  if (aggregateState === 'fx_unconfigured' || aggregateState === 'unavailable') return 'Price comparison unavailable';
  if (fallback && (typeof fallback.minimum === 'number' || typeof fallback.maximum === 'number')) {
    const currency = fallback.currency ?? (Object.keys(ranges ?? {}).length === 1 ? Object.keys(ranges ?? {})[0] : undefined) ?? 'NGN';
    return formatPriceRange(fallback.minimum, fallback.maximum, currency);
  }
  return 'Price unavailable';
};

export const projectMapPricePresentation = (
  minimum: number | null | undefined,
  maximum: number | null | undefined,
  currency: string | undefined,
  state: 'configured' | 'fx_unconfigured',
) => state === 'fx_unconfigured'
  ? {
      label: 'Price comparison unavailable',
      notice: 'Some foreign-currency prices could not be normalized with approved current rates.',
    }
  : { label: formatPriceRange(minimum ?? undefined, maximum ?? undefined, currency), notice: null };

export const formatDate = (value?: string) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Not set';
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  return `${day}-${month}-${date.getFullYear()}`;
};
