import type { ProfileEvidenceContract } from '../services/verificationCaseService';
import { internationalIdentityUnavailable } from './individualKycEvidence';
import { ApiRequestError } from '../lib/axios';

export const HARD_EVIDENCE_UPLOAD_LIMIT = 50 * 1024 * 1024;
export const MAX_EVIDENCE_UPLOAD_TEXT_FIELDS = 5;
export const STEP_UP_FILE_DIGEST_FIELD = '__stepUpFileSha256';
const processingEvidenceStates = new Set(['migration_pending', 'awaiting_upload', 'quarantined', 'validating', 'activation_pending', 'deleting', 'privacy_deleting']);

export const isProfileEvidenceProcessing = (state: string): boolean => processingEvidenceStates.has(state);
export const isProfileEvidenceAvailable = (state: string): boolean => state === 'available';
export const profileEvidenceUploadLimitBytes = (contract: ProfileEvidenceContract): number => Math.min(contract.maxBytes, HARD_EVIDENCE_UPLOAD_LIMIT);

export const withEvidenceSupportReference = (message: string, error: unknown): string => {
  const requestId = error instanceof ApiRequestError ? error.requestId : undefined;
  return requestId ? `${message} Support reference: ${requestId}.` : message;
};

export const formatEvidenceFileSize = (bytes: number): string => bytes >= 1024 * 1024
  ? `${Number((bytes / (1024 * 1024)).toFixed(2))} MiB`
  : `${Number((bytes / 1024).toFixed(2))} KiB`;

const acceptedFormatLabel = (format: string): string => ({
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
} as Record<string, string>)[format] ?? format;

export const formatEvidenceUploadError = (error: unknown, contract?: ProfileEvidenceContract | null): string => {
  const apiError = error instanceof ApiRequestError ? error : null;
  let message: string;
  switch (apiError?.code) {
    case 'INPUT_EVIDENCE_UPLOAD_INVALID':
      message = `The upload request could not be parsed. It supports one file and up to ${MAX_EVIDENCE_UPLOAD_TEXT_FIELDS} text fields. Retry once with the current evidence details; if it continues, contact support.`;
      break;
    case 'DOCUMENT_CONTENT_INVALID': {
      const formats = contract?.formats.map(acceptedFormatLabel).join(', ');
      message = `The file content or format was rejected.${formats ? ` Choose a supported format: ${formats}.` : ' Choose a format supported by the current evidence contract.'}`;
      break;
    }
    case 'DOCUMENT_SIZE_INVALID':
      message = contract
        ? `The file exceeds the allowed size. Choose a file no larger than ${formatEvidenceFileSize(profileEvidenceUploadLimitBytes(contract))}.`
        : 'The file exceeds the allowed size. Choose a smaller file and retry.';
      break;
    case 'CONFLICT_EVIDENCE_OPERATION':
      message = 'This upload operation key was already used with different details. Start a new upload operation; the previous key cannot be reused for changed file or metadata.';
      break;
    default:
      message = error instanceof Error ? error.message : 'The upload could not be completed. Retry or contact support.';
  }
  return withEvidenceSupportReference(message, error);
};

export interface BoundEvidenceMetadata {
  purpose: string;
  subject: string;
  documentKind?: string;
  operationKey: string;
  previousEvidenceId?: string;
}

export const evidenceUploadTextFieldNames = (metadata: BoundEvidenceMetadata): string[] => [
  'purpose',
  ...(metadata.subject ? ['subject'] : []),
  ...(metadata.documentKind ? ['documentKind'] : []),
  'operationKey',
  ...(metadata.previousEvidenceId ? ['previousEvidenceId'] : []),
  STEP_UP_FILE_DIGEST_FIELD,
];

export const evidenceUploadFieldLimitMessage = (metadata: BoundEvidenceMetadata, profileLabel?: string): string | null => {
  const fields = evidenceUploadTextFieldNames(metadata);
  if (fields.length <= MAX_EVIDENCE_UPLOAD_TEXT_FIELDS) return null;
  const profile = profileLabel ? `${profileLabel} ` : 'This profile ';
  return `${profile}${metadata.purpose} evidence needs ${fields.length} text fields (${fields.join(', ')}), including its file digest. The backend accepts at most ${MAX_EVIDENCE_UPLOAD_TEXT_FIELDS}; no required fields were removed, so this upload is blocked until the backend contract supports the complete request.`;
};

export const sha256File = async (file: File): Promise<string> => {
  if (!globalThis.crypto?.subtle) throw new Error('This browser cannot safely hash the selected file. Use a current secure browser.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const validateEvidenceUpload = (file: File, metadata: BoundEvidenceMetadata, contract: ProfileEvidenceContract): string | null => {
  if (!contract.policies.upload || contract.policies.upload.state !== 'configured') return 'The active evidence upload policy is not configured.';
  if (!contract.purposes.includes(metadata.purpose)) return 'Choose a purpose from the current evidence policy.';
  if (!contract.subjects.fixed.includes(metadata.subject) && !contract.subjects.personFields.includes(metadata.subject)) return 'Choose a subject from the current profile evidence policy.';
  const allowedKinds = contract.documentKinds[metadata.purpose];
  if (metadata.purpose === 'residence_national_id') {
    const unavailable = internationalIdentityUnavailable(contract);
    if (unavailable) return unavailable;
    if (!allowedKinds?.length) return 'Accepted residence national ID document kinds are unavailable. Contact support before uploading this evidence.';
  }
  if (allowedKinds?.length ? !metadata.documentKind || !allowedKinds.includes(metadata.documentKind) : Boolean(metadata.documentKind && metadata.documentKind !== metadata.purpose)) return 'Choose a document kind allowed by the current evidence policy.';
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,99}$/.test(metadata.operationKey) || metadata.operationKey.startsWith('legacy_')) return 'The upload operation key must contain 8–100 allowed characters.';
  if (!contract.formats.includes(file.type)) return 'Choose a PDF, JPEG, PNG or WebP file accepted by the current policy.';
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > profileEvidenceUploadLimitBytes(contract)) return `The file must be no larger than ${formatEvidenceFileSize(profileEvidenceUploadLimitBytes(contract))}.`;
  return null;
};

export const buildEvidenceStepUpBody = (metadata: BoundEvidenceMetadata, digest: string) => ({
  ...metadata,
  [STEP_UP_FILE_DIGEST_FIELD]: digest,
});

export const buildBoundEvidenceFormData = (file: File, metadata: BoundEvidenceMetadata, digest: string): FormData => {
  const form = new FormData();
  form.append('file', file);
  form.append('purpose', metadata.purpose);
  form.append('subject', metadata.subject);
  if (metadata.documentKind) form.append('documentKind', metadata.documentKind);
  form.append('operationKey', metadata.operationKey);
  if (metadata.previousEvidenceId) form.append('previousEvidenceId', metadata.previousEvidenceId);
  form.append(STEP_UP_FILE_DIGEST_FIELD, digest);
  return form;
};
