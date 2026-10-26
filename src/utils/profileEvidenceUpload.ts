import type { ProfileEvidenceContract } from '../services/verificationCaseService';

export const HARD_EVIDENCE_UPLOAD_LIMIT = 50 * 1024 * 1024;
export const STEP_UP_FILE_DIGEST_FIELD = '__stepUpFileSha256';
const processingEvidenceStates = new Set(['migration_pending', 'awaiting_upload', 'quarantined', 'scanning', 'activation_pending', 'deleting', 'privacy_deleting']);

export const isProfileEvidenceProcessing = (state: string): boolean => processingEvidenceStates.has(state);

export interface BoundEvidenceMetadata {
  purpose: string;
  subject: string;
  documentKind: string;
  operationKey: string;
  previousEvidenceId?: string;
}

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
  if (allowedKinds?.length ? !allowedKinds.includes(metadata.documentKind) : metadata.documentKind !== metadata.purpose) return 'Choose a document kind allowed by the current evidence policy.';
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,99}$/.test(metadata.operationKey) || metadata.operationKey.startsWith('legacy_')) return 'The upload operation key must contain 8–100 allowed characters.';
  if (!contract.formats.includes(file.type)) return 'Choose a PDF, JPEG, PNG or WebP file accepted by the current policy.';
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > Math.min(contract.maxBytes, HARD_EVIDENCE_UPLOAD_LIMIT)) return `The file must be no larger than ${Math.ceil(Math.min(contract.maxBytes, HARD_EVIDENCE_UPLOAD_LIMIT) / 1024 / 1024)} MB.`;
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
  form.append('documentKind', metadata.documentKind);
  form.append('operationKey', metadata.operationKey);
  if (metadata.previousEvidenceId) form.append('previousEvidenceId', metadata.previousEvidenceId);
  form.append(STEP_UP_FILE_DIGEST_FIELD, digest);
  return form;
};
