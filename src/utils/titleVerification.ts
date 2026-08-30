import type {
  ExternalAnchorStatus,
  PropertyTitleVerificationStatus,
  TitleDocumentType,
  TitleRiskFlag,
  TitleVerificationStatus,
} from '../types';

export const titleDocumentTypeOptions: Array<{ value: TitleDocumentType; label: string }> = [
  { value: 'survey_plan', label: 'Survey Plan' },
  { value: 'certificate_of_occupancy', label: 'Certificate of Occupancy' },
  { value: 'deed_of_assignment', label: 'Deed of Assignment' },
  { value: 'governors_consent', label: "Governor's Consent" },
  { value: 'allocation_letter', label: 'Allocation Letter' },
  { value: 'approved_building_plan', label: 'Approved Building Plan' },
  { value: 'gazette', label: 'Gazette' },
  { value: 'excision_document', label: 'Excision Document' },
  { value: 'other', label: 'Other' },
];

export const allowedTitleMatchMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export const titleVerificationDisclaimer =
  'This record confirms RealtIQ legal review and document integrity. It is not independent government proof of ownership.';

export const titleStatusLabel = (status?: TitleVerificationStatus | PropertyTitleVerificationStatus | string): string => {
  if (status === 'published') return 'Title Published in RealtIQ Registry';
  if (status === 'approved') return 'Title Legally Reviewed';
  if (status === 'revoked') return 'Title Verification Revoked';
  if (status === 'superseded') return 'Title Verification Superseded';
  if (status === 'rejected') return 'Title Verification Rejected';
  if (status === 'pending' || status === 'under_review') return 'Title Review Pending';
  return 'Title Not Submitted';
};

export const externalAnchorLabel = (status?: ExternalAnchorStatus | string): string => {
  if (status === 'anchored') return 'External Anchor Completed';
  if (status === 'anchoring') return 'External Anchor In Progress';
  if (status === 'pending') return 'External Anchor Pending';
  if (status === 'failed') return 'External Anchor Failed';
  if (status === 'not_configured') return 'External Anchor Not Configured';
  return 'External Anchor Not Requested';
};

export const documentTypeLabel = (value?: TitleDocumentType | string): string =>
  titleDocumentTypeOptions.find((option) => option.value === value)?.label ?? 'Title Document';

export const titleStatusClasses = (status?: string): string => {
  if (status === 'published') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (status === 'approved') return 'bg-blue-50 text-blue-800 border-blue-200';
  if (status === 'pending' || status === 'under_review') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (status === 'revoked' || status === 'rejected') return 'bg-red-50 text-red-800 border-red-200';
  if (status === 'superseded') return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-surface-container-low text-secondary border-outline-variant/20';
};

export const riskFlagText = (flag: TitleRiskFlag): string =>
  flag.message || 'This title-document fingerprint requires legal review before approval.';

export const formatDateTime = (value?: string | null): string => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const shortenHash = (value?: string | null, visible = 12): string => {
  if (!value) return 'Not recorded';
  if (value.length <= visible * 2 + 3) return value;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
};

export const isAllowedTitleMatchFile = (file: File): boolean => allowedTitleMatchMimeTypes.includes(file.type);
