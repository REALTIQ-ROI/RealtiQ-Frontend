import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostPaymentRedirect from './PostPaymentRedirect';
import { escrowService } from '../../services/escrowService';
import { paymentService } from '../../services/paymentService';
import { titleDocumentService } from '../../services/titleDocumentService';

vi.mock('../../components/layout/PublicLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('../../services/paymentService', () => ({ paymentService: { getPendingPaymentReference: vi.fn(), verifyPayment: vi.fn(), clearPendingPayment: vi.fn() } }));
vi.mock('../../services/escrowService', () => ({ escrowService: { getPendingId: vi.fn(), getPendingReference: vi.fn(), get: vi.fn(), clearPending: vi.fn() } }));
vi.mock('../../services/titleDocumentService', () => ({
  titleDocumentService: {
    getPendingPayment: vi.fn(() => ({ documentId: null, propertyId: null, reference: null })),
    accessStatus: vi.fn(),
    clearPendingPayment: vi.fn(),
    openViewer: vi.fn(),
  },
}));

describe('PostPaymentRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(titleDocumentService.getPendingPayment).mockReturnValue({ documentId: null, propertyId: null, reference: null });
    vi.mocked(paymentService.verifyPayment).mockResolvedValue({ verified: true, payment: { _id: 'pay1', status: 'paid', reference: 'ref1' } });
    vi.mocked(escrowService.getPendingId).mockReturnValue('e1'); vi.mocked(escrowService.getPendingReference).mockReturnValue('ref1');
    vi.mocked(escrowService.get).mockResolvedValue({ _id: 'e1', amount: 10, status: 'locked', createdAt: '', logs: [], rules: [] });
  });
  it('verifies title-document payment and exposes access without opening or consuming the viewer', async () => {
    vi.mocked(escrowService.getPendingId).mockReturnValue(null);
    vi.mocked(escrowService.getPendingReference).mockReturnValue(null);
    vi.mocked(titleDocumentService.getPendingPayment).mockReturnValue({ documentId: 'doc1', propertyId: 'prop1', reference: 'RTQ-DOC-PAY-1' });
    vi.mocked(paymentService.verifyPayment).mockResolvedValue({
      verified: true,
      payment: {
        _id: 'pay1',
        status: 'paid',
        reference: 'RTQ-DOC-PAY-1',
        purpose: 'title_document_view',
        metadata: { paymentPurpose: 'title_document_view', documentId: 'doc1', propertyId: 'prop1' },
      },
    });
    vi.mocked(titleDocumentService.accessStatus).mockResolvedValue({ hasAccess: true, paymentRequired: false, price: 5000, mode: 'view_once', remainingViews: 1 });
    render(<MemoryRouter initialEntries={['/post-payment-redirect?reference=RTQ-DOC-PAY-1']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Document access ready' })).toBeInTheDocument();
    expect(screen.getByText(/Payment did not start or consume a viewer session/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open protected viewer' })).toBeInTheDocument();
    expect(titleDocumentService.openViewer).not.toHaveBeenCalled();
  });
  it('shows escrow-specific success and does not claim property purchase completion', async () => {
    render(<MemoryRouter initialEntries={['/post-payment-redirect?reference=ref1']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Payment secured in escrow' })).toBeInTheDocument();
    expect(screen.getByText(/not yet a completed property purchase/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Escrow' })).toHaveAttribute('href', '/dashboard/buyer/escrows/e1');
    expect(escrowService.clearPending).toHaveBeenCalled();
  });
  it('shows retry recovery when verification fails', async () => {
    vi.mocked(paymentService.verifyPayment).mockRejectedValueOnce(new Error('Network unavailable'));
    render(<MemoryRouter initialEntries={['/post-payment-redirect?trxref=ref1']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByText('Network unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry Verification' })).toBeInTheDocument();
  });
});
