import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { documentService, sha256FileHex } from './documentService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

describe('Group 06 project survey access client', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads project registered surveys with the documented category, pagination, and no-store request', async () => {
    const response = { documents: [], pagination: { page: 1, limit: 25, total: 0, pages: 0 } };
    vi.mocked(api.get).mockResolvedValue({ data: response });
    await expect(documentService.listProjectRegisteredSurveys('project-1', { page: 1, limit: 25 })).resolves.toEqual(response);
    expect(api.get).toHaveBeenCalledWith('/documents', {
      headers: { 'Cache-Control': 'no-store' },
      params: { projectId: 'project-1', category: 'registered_survey', page: 1, limit: 25 },
    });
  });

  it('requests survey access with an empty body and uses a bound decision header', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { request: { id: 'request-1', documentId: 'doc-1', state: 'pending', version: 0 } } });
    await documentService.requestProjectSurveyAccess('doc-1');
    expect(api.post).toHaveBeenCalledWith('/documents/doc-1/access-requests', {}, { headers: { 'Cache-Control': 'no-store' } });
    await documentService.decideProjectSurveyAccess('doc-1', { requestId: 'request-1', decision: 'approve', expectedVersion: 0 }, 'challenge-1');
    expect(api.post).toHaveBeenLastCalledWith('/documents/doc-1/grant', { requestId: 'request-1', decision: 'approve', expectedVersion: 0 }, { headers: { 'X-Step-Up-Challenge': 'challenge-1', 'Cache-Control': 'no-store' } });
  });

  it('uploads one survey file with the exact bound fields and challenge header', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { document: { id: 'doc-1', submissionVersion: 2 }, projectVersion: 8, publicationRevalidationRequired: true } });
    const file = new File(['survey bytes'], 'plan.pdf', { type: 'application/pdf' });
    const fields = { expectedProjectVersion: '7', accessPolicy: '{"mode":"on_request","enabled":true}', __stepUpFileSha256: 'a'.repeat(64) };
    await documentService.uploadProjectRegisteredSurvey('project-1', file, fields, 'challenge-1');
    expect(api.post).toHaveBeenCalledWith('/documents/projects/project-1/registered-survey', expect.any(FormData), { headers: { 'X-Step-Up-Challenge': 'challenge-1', 'Cache-Control': 'no-store' } });
    const form = vi.mocked(api.post).mock.calls[0]?.[1] as FormData;
    expect(form.getAll('file')).toEqual([file]);
    expect([...form.keys()].sort()).toEqual(['__stepUpFileSha256', 'accessPolicy', 'expectedProjectVersion', 'file'].sort());
    expect(form.get('expectedProjectVersion')).toBe('7');
    expect(form.get('accessPolicy')).toBe(fields.accessPolicy);
    expect(form.get('__stepUpFileSha256')).toBe(fields.__stepUpFileSha256);
  });

  it('hashes exact selected file bytes with Web Crypto SHA-256', async () => {
    const digest = vi.spyOn(globalThis.crypto.subtle, 'digest').mockResolvedValue(new Uint8Array([0xab, 0xcd]).buffer);
    const file = new File(['private bytes'], 'personal-name.pdf', { type: 'application/pdf' });
    await expect(sha256FileHex(file)).resolves.toBe('abcd');
    expect(digest).toHaveBeenCalledWith('SHA-256', await file.arrayBuffer());
    digest.mockRestore();
  });

  it('opens the protected viewer and verifies returned document-version headers', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    vi.mocked(api.post).mockResolvedValue({ data: { sessionToken: 'opaque', contentUrl: '/api/title-document-viewer/opaque/content', expiresAt: '2026-11-12T12:00:00Z', documentVersion: 2, watermark: {}, controls: {} } });
    await documentService.openProjectSurveyViewer('doc-1');
    expect(api.post).toHaveBeenCalledWith('/documents/doc-1/open-viewer', {}, { headers: { 'Cache-Control': 'no-store' } });
    vi.mocked(api.get).mockResolvedValue({ data: blob, headers: { 'content-type': 'application/pdf', 'x-document-version-id': 'version-2', 'x-document-submission-version': '2', 'x-document-content-sha256': 'b'.repeat(64) } });
    const content = await documentService.getAuthorizedViewerContent(`${window.location.origin}/api/title-document-viewer/opaque/content`);
    expect(api.get).toHaveBeenCalledWith('/title-document-viewer/opaque/content', { headers: { 'Cache-Control': 'no-store' }, responseType: 'blob' });
    expect(content).toMatchObject({ blob, contentType: 'application/pdf', documentVersionId: 'version-2', submissionVersion: 2, contentSha256: 'b'.repeat(64) });
    await expect(documentService.getAuthorizedViewerContent('https://storage.example/private.pdf')).rejects.toThrow('unsupported protected route');
  });
});
