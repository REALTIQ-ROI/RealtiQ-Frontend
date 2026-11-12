import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { titleDocumentService } from './titleDocumentService';
import { buildTitleUploadStepUpBody } from '../utils/titleUploadStepUp';

vi.mock('../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('titleDocumentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('initializes title payment with empty body and request-bound step-up', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    await titleDocumentService.initializePayment('doc1', 'challenge-1');
    expect(api.post).toHaveBeenCalledWith(
      '/title-documents/doc1/initialize-view-payment',
      {},
      { headers: { 'X-Step-Up-Challenge': 'challenge-1', 'Cache-Control': 'no-store' } },
    );
  });

  it('uses the property-scoped title upload route and sends the exact bound multipart metadata', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { document: { _id: 'doc-1', documentType: 'survey_plan', title: 'Survey' }, riskDetected: false } });
    const file = new File(['private title bytes'], 'survey.pdf', { type: 'application/pdf' });
    const input = { file, documentType: 'survey_plan' as const, title: ' Survey ', accessPolicy: { enabled: false, mode: 'private' as const } };
    const body = buildTitleUploadStepUpBody({ documentType: input.documentType, title: 'Survey', accessPolicy: input.accessPolicy }, 'f'.repeat(64));
    await titleDocumentService.upload('prop-1', input, 'challenge-1', body);
    expect(api.post).toHaveBeenCalledWith('/documents/properties/prop-1/title-upload', expect.any(FormData), { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
    const form = vi.mocked(api.post).mock.calls[0]?.[1] as FormData;
    expect(form.get('file')).toBe(file);
    expect(form.get('__stepUpFileSha256')).toBe('f'.repeat(64));
    expect(form.get('title')).toBe('Survey');
  });

  it('checks access without opening the viewer and disables caching', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { hasAccess: true, paymentRequired: false, price: 5000 } });
    await titleDocumentService.accessStatus('doc1');
    expect(api.get).toHaveBeenCalledWith('/title-documents/doc1/access-status', { headers: { 'Cache-Control': 'no-store' } });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('updates policy with expected version, step-up and no client price', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: { documentId: 'doc1', version: 3, accessPolicy: { enabled: true, mode: 'paid_view_multiple', price: 5000 } },
    });
    await titleDocumentService.updatePolicy('doc1', { expectedVersion: 2, accessPolicy: { enabled: true, mode: 'paid_view_multiple', buyerPassEnabled: true } }, 'challenge-2');
    expect(api.patch).toHaveBeenCalledWith('/title-documents/doc1/access-policy', {
      expectedVersion: 2,
      accessPolicy: { enabled: true, mode: 'paid_view_multiple', buyerPassEnabled: true },
    }, { headers: { 'X-Step-Up-Challenge': 'challenge-2' } });
  });

  it('fetches protected content as a blob and resolves the backend /api route safely', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    vi.mocked(api.get).mockResolvedValue({ data: blob, headers: { 'content-type': 'application/pdf', 'x-document-version-id': 'version-1', 'x-document-submission-version': '1', 'x-document-content-sha256': 'a'.repeat(64) } });
    const result = await titleDocumentService.fetchViewerContent('/api/title-document-viewer/token/content');
    expect(api.get).toHaveBeenCalledWith('/title-document-viewer/token/content', {
      responseType: 'blob',
      headers: { 'Cache-Control': 'no-store' },
    });
    expect(result.blob).toBe(blob);
    expect(result).toMatchObject({ documentVersionId: 'version-1', submissionVersion: 1, contentSha256: 'a'.repeat(64) });
  });

  it('rejects an absolute viewer URL so permanent/external storage URLs are never followed', async () => {
    await expect(titleDocumentService.fetchViewerContent('https://storage.example/private.pdf')).rejects.toThrow(
      'invalid content route',
    );
    expect(api.get).not.toHaveBeenCalled();
  });

  it('rejects same-origin routes outside the documented protected viewer content endpoint', async () => {
    await expect(titleDocumentService.fetchViewerContent('/api/admin/users')).rejects.toThrow('invalid content route');
    await expect(titleDocumentService.fetchViewerContent('//storage.example/private.pdf')).rejects.toThrow('invalid content route');
    await expect(titleDocumentService.fetchViewerContent('/api/title-document-viewer/token/content?download=1')).rejects.toThrow('invalid content route');
    expect(api.get).not.toHaveBeenCalled();
  });
});
