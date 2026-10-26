import { sha256File } from './profileEvidenceUpload';

export const TITLE_UPLOAD_DIGEST_FIELD = '__stepUpFileSha256';
export const TITLE_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
const acceptedTitleMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

export interface TitleUploadStepUpFields {
  documentType?: string;
  title?: string;
  accessPolicy?: { enabled: boolean; mode: string };
}

export type TitleUploadStepUpBody = Record<string, string> & { __stepUpFileSha256: string };

export const validateTitleUploadFile = (file: File): string | null => {
  if (!acceptedTitleMimeTypes.has(file.type)) return 'Choose a PDF, JPEG, PNG or WebP title document.';
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > TITLE_UPLOAD_MAX_BYTES) return 'The title document must be no larger than 50 MiB.';
  return null;
};

export const buildTitleUploadStepUpBody = (fields: TitleUploadStepUpFields, digest: string): TitleUploadStepUpBody => {
  if (!/^[a-f\d]{64}$/i.test(digest)) throw new Error('The selected title document could not be securely bound.');
  const body: Record<string, string> = {};
  if (fields.documentType) body.documentType = fields.documentType;
  if (fields.title?.trim()) body.title = fields.title.trim();
  if (fields.accessPolicy) body.accessPolicy = JSON.stringify(fields.accessPolicy);
  body[TITLE_UPLOAD_DIGEST_FIELD] = digest.toLowerCase();
  return body as TitleUploadStepUpBody;
};

export const buildBoundTitleUploadFormData = (file: File, body: TitleUploadStepUpBody): FormData => {
  const form = new FormData();
  if (body.documentType) form.append('documentType', body.documentType);
  if (body.title) form.append('title', body.title);
  if (body.accessPolicy) form.append('accessPolicy', body.accessPolicy);
  form.append(TITLE_UPLOAD_DIGEST_FIELD, body[TITLE_UPLOAD_DIGEST_FIELD]);
  form.append('file', file);
  return form;
};

export const digestTitleUpload = sha256File;
