import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../lib/axios';
import type { ProfileEvidenceContract } from '../services/verificationCaseService';
import { buildBoundEvidenceFormData, buildEvidenceStepUpBody, evidenceUploadFieldLimitMessage, evidenceUploadTextFieldNames, formatEvidenceFileSize, formatEvidenceUploadError, isProfileEvidenceAvailable, isProfileEvidenceProcessing, profileEvidenceUploadLimitBytes, sha256File, validateEvidenceUpload } from './profileEvidenceUpload';

const contract: ProfileEvidenceContract = {
  version: 1, formats: ['application/pdf', 'image/png'], purposes: ['nin'], documentKinds: { nin: ['nin_slip'] }, maxBytes: 1024,
  policies: { upload: { state: 'configured', revision: 3 }, acceptedIdentity: { state: 'configured', revision: 1 } },
  acceptedInternationalIds: [], individualRoutes: {}, serviceAreaSource: { state: 'not_applicable' }, subjects: { fixed: ['self'], personFields: [] },
};

describe('profile evidence byte-bound multipart request', () => {
  it('hashes actual file bytes and binds the same digest in the challenge and multipart fields', async () => {
    const file = new File(['test'], 'id.pdf', { type: 'application/pdf' });
    const digest = await sha256File(file);
    expect(digest).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    const metadata = { purpose: 'nin', subject: 'self', documentKind: 'nin_slip', operationKey: 'evidence_nin_2026_a1b2' };
    expect(buildEvidenceStepUpBody(metadata, digest)).toEqual({ ...metadata, __stepUpFileSha256: digest });
    const form = buildBoundEvidenceFormData(file, metadata, digest);
    expect(form.get('__stepUpFileSha256')).toBe(digest);
    expect(form.get('purpose')).toBe('nin');
    expect(form.get('file')).toBeInstanceOf(File);
    expect([...form.keys()]).toEqual(['file', 'purpose', 'subject', 'documentKind', 'operationKey', '__stepUpFileSha256']);
    expect(form.getAll('file')).toHaveLength(1);
    expect(form.get('profileId')).toBeNull();
    expect(form.get('expectedVersion')).toBeNull();
  });

  it('binds the exact six text fields for a replacement upload', () => {
    const file = new File(['replacement'], 'id.pdf', { type: 'application/pdf' });
    const metadata = { purpose: 'nin', subject: 'self', documentKind: 'nin_slip', operationKey: 'evidence_nin_2026_b2c3', previousEvidenceId: 'evidence-current' };
    const digest = 'a'.repeat(64);
    const body = buildEvidenceStepUpBody(metadata, digest);
    const form = buildBoundEvidenceFormData(file, metadata, digest);

    expect(body).toEqual({ ...metadata, __stepUpFileSha256: digest });
    expect([...form.keys()]).toEqual(['file', 'purpose', 'subject', 'documentKind', 'operationKey', 'previousEvidenceId', '__stepUpFileSha256']);
    expect(evidenceUploadTextFieldNames(metadata)).toEqual(['purpose', 'subject', 'documentKind', 'operationKey', 'previousEvidenceId', '__stepUpFileSha256']);
    expect(evidenceUploadFieldLimitMessage(metadata)).toBeNull();
    expect(form.get('previousEvidenceId')).toBe('evidence-current');
    expect(form.get('__stepUpFileSha256')).toBe(digest);
    expect(form.getAll('file')).toHaveLength(1);
  });

  it('allows a complete six-text-field replacement request without dropping required values', () => {
    const initial = { purpose: 'nin', subject: 'self', documentKind: 'nin_slip', operationKey: 'evidence_nin_2026_a1b2' };
    const replacement = { ...initial, previousEvidenceId: 'latest-evidence-id' };

    expect(evidenceUploadTextFieldNames(initial)).toEqual(['purpose', 'subject', 'documentKind', 'operationKey', '__stepUpFileSha256']);
    expect(evidenceUploadFieldLimitMessage(initial, 'Buyer profile (buyer · individual)')).toBeNull();
    expect(evidenceUploadTextFieldNames(replacement)).toHaveLength(6);
    expect(evidenceUploadFieldLimitMessage(replacement, 'Buyer profile (buyer · individual)')).toBeNull();
  });

  it('omits optional documentKind only when the current contract has no explicit kind choices', () => {
    const metadata = { purpose: 'nin', subject: 'self', operationKey: 'evidence_nin_2026_c3d4', previousEvidenceId: 'latest-evidence' };
    const digest = 'b'.repeat(64);
    const form = buildBoundEvidenceFormData(new File(['replacement'], 'nin.pdf', { type: 'application/pdf' }), metadata, digest);

    expect(validateEvidenceUpload(new File(['replacement'], 'nin.pdf', { type: 'application/pdf' }), metadata, { ...contract, documentKinds: {} })).toBeNull();
    expect([...form.keys()]).toEqual(['file', 'purpose', 'subject', 'operationKey', 'previousEvidenceId', '__stepUpFileSha256']);
    expect(evidenceUploadTextFieldNames(metadata)).toHaveLength(5);
    expect(buildEvidenceStepUpBody(metadata, digest)).not.toHaveProperty('documentKind');
  });

  it('enforces active purpose, subject, document-kind, MIME and size policy', () => {
    const metadata = { purpose: 'nin', subject: 'self', documentKind: 'nin_slip', operationKey: 'evidence_123456' };
    expect(validateEvidenceUpload(new File(['abc'], 'id.pdf', { type: 'application/pdf' }), metadata, contract)).toBeNull();
    expect(validateEvidenceUpload(new File(['abc'], 'id.pdf', { type: 'application/pdf' }), { ...metadata, purpose: 'other' }, contract)).toContain('purpose');
    expect(validateEvidenceUpload(new File(['abc'], 'id.pdf', { type: 'application/pdf' }), { ...metadata, subject: 'someone' }, contract)).toContain('subject');
    expect(validateEvidenceUpload(new File(['abc'], 'id.pdf', { type: 'application/pdf' }), { ...metadata, documentKind: 'wrong' }, contract)).toContain('document kind');
    expect(validateEvidenceUpload(new File(['abc'], 'id.pdf', { type: 'application/pdf' }), { ...metadata, operationKey: 'invalid:key' }, contract)).toContain('underscores or hyphens');
    expect(validateEvidenceUpload(new File(['x'], 'bad.txt', { type: 'text/plain' }), metadata, contract)).toContain('PDF');
    expect(validateEvidenceUpload(new File(['x'.repeat(2048)], 'large.pdf', { type: 'application/pdf' }), metadata, contract)).toContain('no larger');
    expect(profileEvidenceUploadLimitBytes(contract)).toBe(1024);
    expect(formatEvidenceFileSize(profileEvidenceUploadLimitBytes(contract))).toBe('1 KiB');
  });

  it('caps the client upload size at 50 MiB even when policy allows more', () => {
    const highLimitContract = { ...contract, maxBytes: 100 * 1024 * 1024 };
    const limit = profileEvidenceUploadLimitBytes(highLimitContract);
    const metadata = { purpose: 'nin', subject: 'self', documentKind: 'nin_slip', operationKey: 'evidence_123456' };

    expect(limit).toBe(50 * 1024 * 1024);
    expect(formatEvidenceFileSize(limit)).toBe('50 MiB');
    expect(validateEvidenceUpload({ type: 'application/pdf', size: limit + 1 } as File, metadata, highLimitContract)).toContain('50 MiB');
  });

  it('maps upload request, file content, size and idempotency errors to distinct safe messages', () => {
    const malformed = formatEvidenceUploadError(new ApiRequestError('Raw parser detail must not be shown.', { status: 422, code: 'INPUT_EVIDENCE_UPLOAD_INVALID', requestId: 'req-upload-1' }), contract);
    expect(malformed).toMatch(/upload request could not be parsed/i);
    expect(malformed).toMatch(/one file/i);
    expect(malformed).toMatch(/up to 6 text fields/i);
    expect(malformed).toContain('req-upload-1');
    expect(malformed).not.toMatch(/corrupt|raw parser detail/i);

    const content = formatEvidenceUploadError(new ApiRequestError('Internal scanner or parser detail.', { status: 422, code: 'DOCUMENT_CONTENT_INVALID' }), contract);
    expect(content).toMatch(/file content or format was rejected/i);
    expect(content).toContain('PDF');
    expect(content).not.toMatch(/scanner|internal/i);

    const size = formatEvidenceUploadError(new ApiRequestError('Too large.', { status: 413, code: 'DOCUMENT_SIZE_INVALID' }), contract);
    expect(size).toContain('1 KiB');

    const operation = formatEvidenceUploadError(new ApiRequestError('Operation key conflict.', { status: 409, code: 'CONFLICT_EVIDENCE_OPERATION' }), contract);
    expect(operation).toMatch(/start a new upload operation/i);
    expect(operation).toMatch(/cannot be reused/i);
  });

  it('does not allow a residence national ID upload when international acceptance is unconfigured', () => {
    const internationalContract: ProfileEvidenceContract = {
      ...contract,
      purposes: [...contract.purposes, 'residence_national_id'],
      documentKinds: { ...contract.documentKinds, residence_national_id: ['national_id_card'] },
      individualRoutes: { international: ['passport', 'residence_national_id', 'overseas_address_proof'] },
    };
    const file = new File(['identity'], 'id.pdf', { type: 'application/pdf' });
    const metadata = { purpose: 'residence_national_id', subject: 'self', documentKind: 'national_id_card', operationKey: 'evidence_id_1234' };
    expect(validateEvidenceUpload(file, metadata, internationalContract)).toMatch(/accepted international identity document list has not been configured/i);
  });

  it('polls current backend validation and removal states', () => {
    expect(isProfileEvidenceProcessing('migration_pending')).toBe(true);
    expect(isProfileEvidenceProcessing('awaiting_upload')).toBe(true);
    expect(isProfileEvidenceProcessing('quarantined')).toBe(true);
    expect(isProfileEvidenceProcessing('validating')).toBe(true);
    expect(isProfileEvidenceProcessing('activation_pending')).toBe(true);
    expect(isProfileEvidenceProcessing('deleting')).toBe(true);
    expect(isProfileEvidenceProcessing('privacy_deleting')).toBe(true);
    expect(isProfileEvidenceProcessing('available')).toBe(false);
    expect(isProfileEvidenceProcessing('rejected')).toBe(false);
    expect(isProfileEvidenceProcessing('retry')).toBe(false);
    expect(isProfileEvidenceAvailable('available')).toBe(true);
    expect(isProfileEvidenceAvailable('validating')).toBe(false);
  });
});
