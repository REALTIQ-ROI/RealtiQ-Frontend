import type {
  ExternalAnchorStatus,
  PropertyTitleVerificationStatus,
  TitleDocumentType,
  TitleRiskFlag,
  TitleVerificationStatus,
} from '../types';
import type { CanonicalFieldDictionary } from '../services/canonicalFieldService';
import { dictionaryVocabularyOptions, vocabularyLabel } from './propertyVocabulary';

export const titleDocumentTypeOptions: Array<{ value: TitleDocumentType; label: string }> = [
  { value: 'c_of_o', label: 'C of O' },
  { value: 'global_c_of_o', label: 'Global C of O' },
  { value: 'governors_consent', label: 'Governor’s Consent' },
  { value: 'deed_of_assignment', label: 'Deed of Assignment' },
  { value: 'deed_of_sub_lease', label: 'Deed of Sub-Lease' },
  { value: 'letter_of_allocation', label: 'Letter of Allocation' },
  { value: 'registered_survey', label: 'Registered Survey' },
  { value: 'excision', label: 'Excision' },
  { value: 'gazette', label: 'Gazette' },
  { value: 'approved_building_plan', label: 'Approved Building Plan' },
  { value: 'r_of_o', label: 'R of O' },
  { value: 'other', label: 'Other' },
];

const legacyTitleDocumentTypeAliases: Partial<Record<TitleDocumentType, TitleDocumentType>> = {
  survey_plan: 'registered_survey',
  certificate_of_occupancy: 'c_of_o',
  allocation_letter: 'letter_of_allocation',
  excision_document: 'excision',
};

/** Map only the four documented compatibility aliases to canonical upload values. */
export const canonicalTitleDocumentTypeKey = (value?: string): string | undefined =>
  value ? legacyTitleDocumentTypeAliases[value as TitleDocumentType] ?? value : undefined;

/** Active upload choices come from the current property field dictionary, not this legacy display map. */
export const currentTitleDocumentTypeOptions = (dictionary: CanonicalFieldDictionary | null | undefined) =>
  dictionaryVocabularyOptions(dictionary, 'titleDocumentTypes');

export const currentDocumentTypeLabel = (dictionary: CanonicalFieldDictionary | null | undefined, value?: string): string =>
  vocabularyLabel(dictionary, 'titleDocumentTypes', canonicalTitleDocumentTypeKey(value)) ?? documentTypeLabel(value);

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
  titleDocumentTypeOptions.find((option) => option.value === canonicalTitleDocumentTypeKey(value))?.label ?? 'Title Document';

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
