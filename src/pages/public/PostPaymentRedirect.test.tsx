import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostPaymentRedirect from './PostPaymentRedirect';
import { escrowService } from '../../services/escrowService';
import { paymentService } from '../../services/paymentService';
import { titleDocumentService } from '../../services/titleDocumentService';
import { cartService } from '../../services/cartService';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../components/layout/PublicLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true, user: { _id: 'buyer1', role: 'buyer' } })),
}));
vi.mock('../../services/paymentService', () => ({ paymentService: { getPendingPaymentReference: vi.fn(), verifyPayment: vi.fn(), clearPendingPayment: vi.fn() } }));
vi.mock('../../services/escrowService', () => ({ escrowService: { getPendingId: vi.fn(), getPendingReference: vi.fn(), get: vi.fn(), clearPending: vi.fn() } }));
vi.mock('../../services/cartService', () => ({
  cartService: {
    getPendingCheckout: vi.fn(() => ({ checkoutId: null, reference: null })),
    getCartCheckout: vi.fn(),
    listCartCheckouts: vi.fn(),
    clearPendingCheckout: vi.fn(),
  },
}));
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
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, user: { _id: 'buyer1', role: 'buyer' } } as ReturnType<typeof useAuth>);
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
  it('verifies cart payments through shared payment verify and shows the cart receipt link', async () => {
    vi.mocked(escrowService.getPendingId).mockReturnValue(null);
    vi.mocked(escrowService.getPendingReference).mockReturnValue(null);
    vi.mocked(cartService.getPendingCheckout).mockReturnValue({ checkoutId: 'checkout1', reference: 'cart-ref-1' });
    vi.mocked(paymentService.verifyPayment).mockResolvedValue({
      verified: true,
      payment: { _id: 'pay1', status: 'paid', reference: 'cart-ref-1', purpose: 'multi_service_cart', amount: 55000 },
    });
    vi.mocked(cartService.getCartCheckout).mockResolvedValue({
      checkoutId: 'checkout1',
      paymentReference: 'cart-ref-1',
      totalAmount: 55000,
      currency: 'NGN',
      status: 'partially_failed',
      items: [{ id: 'item1', type: 'title_document_view', resourceId: 'doc1', amount: 5000, status: 'failed' }],
    });
    render(<MemoryRouter initialEntries={['/post-payment-redirect?reference=cart-ref-1']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Service checkout received' })).toBeInTheDocument();
    expect(screen.getByText(/No additional payment is required/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Service Receipt' })).toHaveAttribute('href', '/dashboard/buyer/cart-checkouts/checkout1');
    expect(cartService.getCartCheckout).toHaveBeenCalledWith('checkout1');
    expect(cartService.listCartCheckouts).not.toHaveBeenCalled();
  });
  it('keeps guest cart payment returns on a public cart path', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false, user: null } as ReturnType<typeof useAuth>);
    vi.mocked(escrowService.getPendingId).mockReturnValue(null);
    vi.mocked(escrowService.getPendingReference).mockReturnValue(null);
    vi.mocked(cartService.getPendingCheckout).mockReturnValue({ checkoutId: 'checkout1', reference: 'cart-ref-1' });
    vi.mocked(paymentService.verifyPayment).mockResolvedValue({
      verified: true,
      payment: { _id: 'pay1', status: 'paid', reference: 'cart-ref-1', purpose: 'multi_service_cart', amount: 55000 },
    });
    vi.mocked(cartService.getCartCheckout).mockResolvedValue({
      checkoutId: 'checkout1',
      paymentReference: 'cart-ref-1',
      totalAmount: 55000,
      currency: 'NGN',
      status: 'completed',
      items: [{ id: 'item1', type: 'title_document_view', resourceId: 'doc1', amount: 5000, status: 'allocated' }],
    });
    render(<MemoryRouter initialEntries={['/post-payment-redirect?reference=cart-ref-1']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Service checkout received' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Service Cart' })).toHaveAttribute('href', '/cart');
  });
});
