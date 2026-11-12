import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { documentManagerService } from './documentManagerService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

describe('document manager API contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the profile-scoped template and document list DTOs without caching', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { templates: [], nextCursor: 'next-template' } })
      .mockResolvedValueOnce({ data: { documents: [], nextCursor: null } });
    expect(await documentManagerService.listTemplates({ state: 'active', limit: 25 })).toEqual({ items: [], nextCursor: 'next-template' });
    expect(api.get).toHaveBeenNthCalledWith(1, '/document-manager/templates', { headers: { 'Cache-Control': 'no-store' }, params: { state: 'active', limit: 25 } });
    expect(await documentManagerService.listDocuments({ state: 'draft', limit: 25 })).toEqual({ items: [], nextCursor: null });
    expect(api.get).toHaveBeenNthCalledWith(2, '/document-manager/documents', { headers: { 'Cache-Control': 'no-store' }, params: { state: 'draft', limit: 25 } });
  });

  it('sends current expected versions and the bound challenge on protected actions', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { document: { id: 'doc-1', state: 'approved', version: 2 } } });
    const body = { expectedVersion: 1 };
    await documentManagerService.issue('doc-1', body, 'challenge-1');
    expect(api.post).toHaveBeenCalledWith('/document-manager/documents/doc-1/issue', body, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });

  it('loads private sealed-document readiness without caching or exposing provider secrets', async () => {
    const readiness = { authority: { state: 'authorized', signatory: { state: 'not_required' } }, qrSigning: { state: 'configured' }, verificationOrigin: { state: 'configured' }, privateEnvelope: { state: 'configured' }, privateStorage: { state: 'configured' }, maxIssuedBytes: 5242880, issuance: { state: 'ready', usableNow: true, reasonCodes: [] } };
    vi.mocked(api.get).mockResolvedValue({ data: readiness });
    await expect(documentManagerService.getReadiness()).resolves.toEqual(readiness);
    expect(api.get).toHaveBeenCalledWith('/document-manager/readiness', { headers: { 'Cache-Control': 'no-store' } });
  });

  it('uses the returned recipient response after acknowledgment', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { document: { id: 'doc-1', version: 5, state: 'issued', myResponse: { profileId: 'selected-profile', state: 'acknowledged', acknowledged: true, signed: false, respondedAt: '2026-11-12T10:00:00Z' } } } });
    const result = await documentManagerService.acknowledge('doc-1', { expectedVersion: 4 });
    expect(api.post).toHaveBeenCalledWith('/document-manager/documents/doc-1/acknowledge', { expectedVersion: 4 });
    expect(result).toMatchObject({ version: 5, myResponse: { state: 'acknowledged', acknowledged: true, signed: false } });
  });

  it('reads only private PDF content and rejects a non-PDF response', async () => {
    const pdf = new Blob(['pdf'], { type: 'application/pdf' });
    vi.mocked(api.get).mockResolvedValueOnce({ data: pdf, headers: { 'content-type': 'application/pdf' } });
    expect(await documentManagerService.getContent('doc-1')).toBe(pdf);
    expect(api.get).toHaveBeenCalledWith('/document-manager/documents/doc-1/content', { headers: { 'Cache-Control': 'no-store' }, responseType: 'blob' });
    vi.mocked(api.get).mockResolvedValueOnce({ data: new Blob(['html']), headers: { 'content-type': 'text/html' } });
    await expect(documentManagerService.getContent('doc-1')).rejects.toThrow(/unsupported protected content type/i);
  });
});
