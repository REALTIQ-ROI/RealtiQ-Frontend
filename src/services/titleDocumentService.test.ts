import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { titleDocumentService } from './titleDocumentService';

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

  it('initializes guest payment with email and credentials without client price or identity metadata', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { existing: false, redirectUrl: 'https://pay.test', reference: 'RTQ-DOC-PAY-1', access: { id: 'a1', mode: 'view_once', status: 'payment_pending', viewCount: 0 } },
    });
    await titleDocumentService.initializePayment('doc1', 'guest@example.com');
    expect(api.post).toHaveBeenCalledWith(
      '/title-documents/doc1/initialize-view-payment',
      { email: 'guest@example.com' },
      { withCredentials: true },
    );
    expect(vi.mocked(api.post).mock.calls[0]?.[1]).not.toHaveProperty('price');
    expect(vi.mocked(api.post).mock.calls[0]?.[1]).not.toHaveProperty('guestIdentityId');
  });

  it('checks access without opening the viewer and sends credentials', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { hasAccess: true, paymentRequired: false, price: 5000 } });
    await titleDocumentService.accessStatus('doc1');
    expect(api.get).toHaveBeenCalledWith('/title-documents/doc1/access-status', { withCredentials: true });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('updates policy without sending a price', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: { documentId: 'doc1', accessPolicy: { enabled: true, mode: 'paid_view_multiple', price: 5000 } },
    });
    await titleDocumentService.updatePolicy('doc1', 'paid_view_multiple');
    expect(api.patch).toHaveBeenCalledWith('/title-documents/doc1/access-policy', {
      accessPolicy: { enabled: true, mode: 'paid_view_multiple' },
    });
  });

  it('fetches protected content as a blob and resolves the backend /api route safely', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    vi.mocked(api.get).mockResolvedValue({ data: blob, headers: { 'content-type': 'application/pdf' } });
    const result = await titleDocumentService.fetchViewerContent('/api/title-document-viewer/token/content');
    expect(api.get).toHaveBeenCalledWith('/title-document-viewer/token/content', {
      responseType: 'blob',
      withCredentials: true,
    });
    expect(result.blob).toBe(blob);
  });

  it('rejects an absolute viewer URL so permanent/external storage URLs are never followed', async () => {
    await expect(titleDocumentService.fetchViewerContent('https://storage.example/private.pdf')).rejects.toThrow(
      'invalid content route',
    );
    expect(api.get).not.toHaveBeenCalled();
  });
});
