import type { OffPlanDevelopmentStatus, ProjectStatus, ProjectType } from '../types';

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

export const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not set';
