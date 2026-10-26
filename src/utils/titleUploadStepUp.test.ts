import { describe, expect, it } from 'vitest';
import { buildBoundTitleUploadFormData, buildTitleUploadStepUpBody, validateTitleUploadFile } from './titleUploadStepUp';

describe('title upload byte binding', () => {
  it('uses the same digest and serialized metadata in challenge body and multipart request', () => {
    const file = new File(['bytes'], 'title.pdf', { type: 'application/pdf' });
    const body = buildTitleUploadStepUpBody({ documentType: 'survey_plan', title: 'Plan', accessPolicy: { enabled: false, mode: 'private' } }, 'A'.repeat(64));
    const form = buildBoundTitleUploadFormData(file, body);
    expect(body).toEqual({ documentType: 'survey_plan', title: 'Plan', accessPolicy: '{"enabled":false,"mode":"private"}', __stepUpFileSha256: 'a'.repeat(64) });
    expect(form.get('documentType')).toBe(body.documentType);
    expect(form.get('title')).toBe(body.title);
    expect(form.get('accessPolicy')).toBe(body.accessPolicy);
    expect(form.get('__stepUpFileSha256')).toBe(body.__stepUpFileSha256);
    expect(form.get('file')).toBe(file);
  });

  it('enforces the documented single-file media allowlist and 50 MiB limit', () => {
    expect(validateTitleUploadFile(new File(['pdf'], 'title.pdf', { type: 'application/pdf' }))).toBeNull();
    expect(validateTitleUploadFile(new File(['x'], 'title.exe', { type: 'application/octet-stream' }))).toMatch(/PDF, JPEG, PNG or WebP/);
  });
});
