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
