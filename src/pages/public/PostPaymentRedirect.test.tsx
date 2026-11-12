import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostPaymentRedirect from './PostPaymentRedirect';
import { escrowService } from '../../services/escrowService';
import { paymentService } from '../../services/paymentService';
import { titleDocumentService } from '../../services/titleDocumentService';
import { cartService } from '../../services/cartService';
import { protectedMediaService } from '../../services/protectedMediaService';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../components/layout/PublicLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn() } }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true, user: { _id: 'buyer1', role: 'buyer' }, activeProfile: { id: 'buyer-profile', kind: 'buyer' } })),
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
    getPendingPayment: vi.fn(() => ({ documentId: null, propertyId: null, reference: null, profileId: null })),
    accessStatus: vi.fn(),
    clearPendingPayment: vi.fn(),
    openViewer: vi.fn(),
  },
}));
vi.mock('../../services/protectedMediaService', () => ({
  protectedMediaService: {
    getPendingOrder: vi.fn(() => ({ id: null, paymentReference: null, profileId: null })),
    getOrder: vi.fn(), clearPendingOrder: vi.fn(), persistPendingOrder: vi.fn(),
  },
}));

describe('PostPaymentRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, user: { _id: 'buyer1', role: 'buyer' }, activeProfile: { id: 'buyer-profile', kind: 'buyer' } } as ReturnType<typeof useAuth>);
    vi.mocked(titleDocumentService.getPendingPayment).mockReturnValue({ documentId: null, propertyId: null, reference: null, profileId: null });
    vi.mocked(protectedMediaService.getPendingOrder).mockReturnValue({ id: null, paymentReference: null, profileId: null });
    vi.mocked(paymentService.verifyPayment).mockResolvedValue({ verified: true, payment: { _id: 'pay1', status: 'paid', reference: 'ref1' } });
    vi.mocked(escrowService.getPendingId).mockReturnValue('e1'); vi.mocked(escrowService.getPendingReference).mockReturnValue('ref1');
    vi.mocked(escrowService.get).mockResolvedValue({ _id: 'e1', amount: 10, status: 'locked', createdAt: '', logs: [], rules: [] });
  });
  it('checks title-document access status and exposes confirmed access without verifying a provider return', async () => {
    vi.mocked(escrowService.getPendingId).mockReturnValue(null);
    vi.mocked(escrowService.getPendingReference).mockReturnValue(null);
    vi.mocked(titleDocumentService.getPendingPayment).mockReturnValue({ documentId: 'doc1', propertyId: 'prop1', reference: 'RTQ-DOC-PAY-1', profileId: 'buyer-profile' });
    vi.mocked(titleDocumentService.accessStatus).mockResolvedValue({ hasAccess: true, purchaseState: 'active', paymentRequired: false, price: 5000, mode: 'view_once', remainingViews: 1 });
    render(<MemoryRouter initialEntries={['/post-payment-redirect?reference=RTQ-DOC-PAY-1']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Document access ready' })).toBeInTheDocument();
    expect(screen.getByText(/server confirms that this Buyer profile has document access/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open protected viewer' })).toBeInTheDocument();
    expect(titleDocumentService.openViewer).not.toHaveBeenCalled();
    expect(titleDocumentService.accessStatus).toHaveBeenCalledWith('doc1');
    expect(paymentService.verifyPayment).not.toHaveBeenCalled();
  });
  it('keeps document access pending when the current server status has not activated access', async () => {
    vi.mocked(escrowService.getPendingId).mockReturnValue(null);
    vi.mocked(escrowService.getPendingReference).mockReturnValue(null);
    vi.mocked(titleDocumentService.getPendingPayment).mockReturnValue({ documentId: 'doc1', propertyId: 'prop1', reference: 'RTQ-DOC-PAY-1', profileId: 'buyer-profile' });
    vi.mocked(titleDocumentService.accessStatus).mockResolvedValue({ hasAccess: false, purchaseState: 'processing', paymentRequired: false, price: 5000, mode: 'view_once', remainingViews: 0, message: 'Activation pending' });
    render(<MemoryRouter initialEntries={['/post-payment-redirect?reference=RTQ-DOC-PAY-1']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Checking document access' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open protected viewer' })).not.toBeInTheDocument();
    expect(paymentService.verifyPayment).not.toHaveBeenCalled();
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
    expect(screen.getByRole('button', { name: 'Check payment status again' })).toBeInTheDocument();
  });
  it('keeps an unverified provider return unresolved without calling it failed or successful', async () => {
    vi.mocked(escrowService.getPendingId).mockReturnValue(null);
    vi.mocked(escrowService.getPendingReference).mockReturnValue(null);
    vi.mocked(paymentService.verifyPayment).mockResolvedValue({
      verified: false,
    });
    render(<MemoryRouter initialEntries={['/post-payment-redirect?reference=pending-ref']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByText(/provider has not confirmed this payment yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Payment Successful' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Payment Failed' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check payment status again' })).toBeInTheDocument();
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
      paymentParts: [{ key: 'merchant_collection_1', custody: 'merchant_collection', paymentId: 'pay1', reference: 'cart-ref-1', amount: 55000, currency: 'NGN', state: 'paid', redirectUrl: null, providerCode: null }],
      items: [{ id: 'item1', type: 'title_document_view', resourceId: 'doc1', amount: 5000, status: 'failed' }],
    });
    render(<MemoryRouter initialEntries={['/post-payment-redirect?reference=cart-ref-1']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Service checkout update' })).toBeInTheDocument();
    expect(screen.getByText(/No additional payment is required/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Service Checkout' })).toHaveAttribute('href', '/dashboard/buyer/cart-checkouts/checkout1');
    expect(cartService.getCartCheckout).toHaveBeenCalledWith('checkout1');
    expect(cartService.listCartCheckouts).not.toHaveBeenCalled();
  });
  it('keeps guest cart payment returns on a public cart path', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false, user: null, activeProfile: null } as ReturnType<typeof useAuth>);
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
      paymentParts: [{ key: 'merchant_collection_1', custody: 'merchant_collection', paymentId: 'pay1', reference: 'cart-ref-1', amount: 55000, currency: 'NGN', state: 'paid', redirectUrl: null, providerCode: null }],
      items: [{ id: 'item1', type: 'title_document_view', resourceId: 'doc1', amount: 5000, status: 'allocated' }],
    });
    render(<MemoryRouter initialEntries={['/post-payment-redirect?reference=cart-ref-1']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Service checkout update' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Service Cart' })).toHaveAttribute('href', '/cart');
  });
  it('matches a later payment part and keeps the checkout reference while other parts are pending', async () => {
    vi.mocked(escrowService.getPendingId).mockReturnValue(null);
    vi.mocked(escrowService.getPendingReference).mockReturnValue(null);
    vi.mocked(cartService.getPendingCheckout).mockReturnValue({ checkoutId: 'checkout1', reference: 'part-1' });
    vi.mocked(paymentService.verifyPayment).mockResolvedValue({ verified: true, payment: { _id: 'pay2', status: 'paid', reference: 'part-2', purpose: 'multi_service_cart', amount: 2000 } });
    vi.mocked(cartService.getCartCheckout).mockResolvedValue({
      checkoutId: 'checkout1', paymentReference: 'part-1', totalAmount: 5000, currency: 'NGN', status: 'partially_paid',
      paymentParts: [
        { key: 'merchant_collection_1', custody: 'merchant_collection', paymentId: 'pay1', reference: 'part-1', amount: 3000, currency: 'NGN', state: 'initializing', redirectUrl: null, providerCode: null },
        { key: 'merchant_collection_2', custody: 'merchant_collection', paymentId: 'pay2', reference: 'part-2', amount: 2000, currency: 'NGN', state: 'paid', redirectUrl: null, providerCode: null },
      ],
      items: [],
    });
    render(<MemoryRouter initialEntries={['/post-payment-redirect?reference=part-2']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Service checkout update' })).toBeInTheDocument();
    expect(screen.getByText(/Other parts or service allocations may still be pending/)).toBeInTheDocument();
    expect(cartService.clearPendingCheckout).not.toHaveBeenCalled();
  });

  it('checks the same protected media order and waits while the backend reports pending', async () => {
    vi.mocked(escrowService.getPendingId).mockReturnValue(null);
    vi.mocked(escrowService.getPendingReference).mockReturnValue(null);
    vi.mocked(protectedMediaService.getPendingOrder).mockReturnValue({ id: 'order-1', paymentReference: 'media-ref', profileId: 'buyer-profile' });
    vi.mocked(protectedMediaService.getOrder).mockResolvedValue({ order: { id: 'order-1', kind: 'purchase', itemId: 'item-1', paymentReference: 'media-ref', amountMinor: 400000, currency: 'NGN', state: 'pending', checkoutUrl: null, expiresAt: null, lastErrorCode: null, createdAt: '', updatedAt: '' }, paymentStatus: 'pending' });
    render(<MemoryRouter initialEntries={['/post-payment-redirect?reference=media-ref']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Protected media order pending' })).toBeInTheDocument();
    expect(screen.getByText(/server has not confirmed access yet/i)).toBeInTheDocument();
    expect(protectedMediaService.getOrder).toHaveBeenCalledWith('order-1');
    expect(protectedMediaService.clearPendingOrder).not.toHaveBeenCalled();
    expect(paymentService.verifyPayment).not.toHaveBeenCalled();
  });

  it('does not load a protected media order under a different selected profile', async () => {
    vi.mocked(escrowService.getPendingId).mockReturnValue(null);
    vi.mocked(escrowService.getPendingReference).mockReturnValue(null);
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, user: { _id: 'buyer1', role: 'buyer' }, activeProfile: { id: 'another-profile', kind: 'buyer' } } as ReturnType<typeof useAuth>);
    vi.mocked(protectedMediaService.getPendingOrder).mockReturnValue({ id: 'order-1', paymentReference: 'media-ref', profileId: 'buyer-profile' });
    render(<MemoryRouter initialEntries={['/post-payment-redirect?reference=media-ref']}><PostPaymentRedirect /></MemoryRouter>);
    expect(await screen.findByText(/Select the Buyer profile that started this media order/i)).toBeInTheDocument();
    expect(protectedMediaService.getOrder).not.toHaveBeenCalled();
  });
});
