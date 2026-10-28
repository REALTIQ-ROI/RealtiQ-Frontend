import type { ProfessionalType, RequestedService } from '../../types/proxyNetwork';

export const PROFESSIONAL_TYPES: Array<{ value: ProfessionalType; label: string }> = [
  ['real_estate_agent', 'Real estate agent'], ['property_inspector', 'Property inspector'],
  ['civil_engineer', 'Civil engineer'], ['structural_engineer', 'Structural engineer'],
  ['architect', 'Architect'], ['surveyor', 'Surveyor'], ['lawyer', 'Lawyer'], ['valuer', 'Valuer'],
  ['building_professional', 'Building professional'], ['other', 'Other'],
].map(([value, label]) => ({ value: value as ProfessionalType, label }));
export const REQUESTED_SERVICES: Array<{ value: RequestedService; label: string }> = [
  ['physical_inspection', 'Physical inspection'], ['recorded_video_walkthrough', 'Recorded video walkthrough'],
  ['photos', 'Inspection photos'], ['condition_report', 'Condition report'],
  ['neighbourhood_review', 'Neighbourhood review'], ['location_confirmation', 'Location confirmation'],
  ['document_observation', 'Document observation'], ['custom', 'Custom requirement'],
].map(([value, label]) => ({ value: value as RequestedService, label }));
export const DECLARATION_TEXT = 'I certify that I personally inspected this property and that this report accurately represents my observations at the time of inspection.';
export const formatLabel = (value?: string) => value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—';
export const formatNgn = (value?: number) => value == null ? '—' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
export const refId = <T extends { _id: string }>(value?: string | T | null) => typeof value === 'string' ? value : value?._id ?? '';

export const publicInspectorDisplayName = (user: unknown): string => {
  if (typeof user !== 'object' || user === null || Array.isArray(user)) return 'Verified professional';
  const name = (user as Record<string, unknown>).name;
  return typeof name === 'string' && name.trim() ? name.trim() : 'Verified professional';
};

/** Resolve only the professional profile's own identifier; never substitute its user/account ID. */
export const adminInspectorProfileId = (value: unknown): string | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const profile = value as Record<string, unknown>;
  for (const key of ['_id', 'profileId', 'id']) {
    const id = profile[key];
    if (typeof id !== 'string') continue;
    const normalized = id.trim();
    if (normalized && normalized !== 'undefined' && normalized !== 'null') return normalized;
  }
  return null;
};
