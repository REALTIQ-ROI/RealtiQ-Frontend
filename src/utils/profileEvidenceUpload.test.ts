import { describe, expect, it } from 'vitest';
import type { ProfileEvidenceContract } from '../services/verificationCaseService';
import { buildBoundEvidenceFormData, buildEvidenceStepUpBody, isProfileEvidenceProcessing, sha256File, validateEvidenceUpload } from './profileEvidenceUpload';

const contract: ProfileEvidenceContract = {
  version: 1, formats: ['application/pdf', 'image/png'], purposes: ['nin'], documentKinds: { nin: ['nin_slip'] }, maxBytes: 1024,
  policies: { upload: { state: 'configured', revision: 3 }, acceptedIdentity: { state: 'configured', revision: 1 } },
  acceptedInternationalIds: [], individualRoutes: {}, serviceAreaSource: { state: 'not_applicable' }, subjects: { fixed: ['self'], personFields: [] },
};

describe('profile evidence byte-bound multipart request', () => {
  it('hashes actual bytes and repeats the digest in step-up and multipart metadata', async () => {
    const file = new File(['test'], 'id.pdf', { type: 'application/pdf' });
    const digest = await sha256File(file);
    expect(digest).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    const metadata = { purpose: 'nin', subject: 'self', documentKind: 'nin_slip', operationKey: 'evidence_nin_2026_a1b2' };
    expect(buildEvidenceStepUpBody(metadata, digest)).toEqual({ ...metadata, __stepUpFileSha256: digest });
    const form = buildBoundEvidenceFormData(file, metadata, digest);
    expect(form.get('__stepUpFileSha256')).toBe(digest);
    expect(form.get('purpose')).toBe('nin');
    expect(form.get('file')).toBeInstanceOf(File);
  });

  it('binds the exact previous evidence reference for a replacement upload', () => {
    const file = new File(['replacement'], 'id.pdf', { type: 'application/pdf' });
    const metadata = { purpose: 'nin', subject: 'self', documentKind: 'nin_slip', operationKey: 'evidence_nin_2026_b2c3', previousEvidenceId: 'evidence-current' };
    const digest = 'a'.repeat(64);
    const body = buildEvidenceStepUpBody(metadata, digest);
    const form = buildBoundEvidenceFormData(file, metadata, digest);

    expect(body).toEqual({ ...metadata, __stepUpFileSha256: digest });
    expect(form.get('previousEvidenceId')).toBe('evidence-current');
    expect(form.get('__stepUpFileSha256')).toBe(digest);
  });

  it('enforces active purpose, subject, document-kind, MIME and size policy', () => {
    const metadata = { purpose: 'nin', subject: 'self', documentKind: 'nin_slip', operationKey: 'evidence_123456' };
    expect(validateEvidenceUpload(new File(['abc'], 'id.pdf', { type: 'application/pdf' }), metadata, contract)).toBeNull();
    expect(validateEvidenceUpload(new File(['abc'], 'id.pdf', { type: 'application/pdf' }), { ...metadata, purpose: 'other' }, contract)).toContain('purpose');
    expect(validateEvidenceUpload(new File(['abc'], 'id.pdf', { type: 'application/pdf' }), { ...metadata, subject: 'someone' }, contract)).toContain('subject');
    expect(validateEvidenceUpload(new File(['abc'], 'id.pdf', { type: 'application/pdf' }), { ...metadata, documentKind: 'wrong' }, contract)).toContain('document kind');
    expect(validateEvidenceUpload(new File(['x'], 'bad.txt', { type: 'text/plain' }), metadata, contract)).toContain('PDF');
    expect(validateEvidenceUpload(new File(['x'.repeat(2048)], 'large.pdf', { type: 'application/pdf' }), metadata, contract)).toContain('no larger');
  });

  it('polls only backend-reported processing states and leaves terminal outcomes alone', () => {
    expect(isProfileEvidenceProcessing('quarantined')).toBe(true);
    expect(isProfileEvidenceProcessing('scanning')).toBe(true);
    expect(isProfileEvidenceProcessing('deleting')).toBe(true);
    expect(isProfileEvidenceProcessing('clean')).toBe(false);
    expect(isProfileEvidenceProcessing('rejected')).toBe(false);
  });
});
