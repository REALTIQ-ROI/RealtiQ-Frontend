import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProxyInspectionDetail } from '../../types/proxyNetwork';
import { proxyNetworkService } from '../../services/proxyNetworkService';
import ProxyWorkspace from './ProxyWorkspace';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'buyer-1', role: 'buyer', name: 'Buyer' } }),
}));

vi.mock('../../services/proxyNetworkService', () => ({
  proxyNetworkService: {
    sendMessage: vi.fn(),
    getEvidence: vi.fn(),
    uploadEvidence: vi.fn(),
    saveReport: vi.fn(),
    proposePrice: vi.fn(),
    confirmPrice: vi.fn(),
    initializePayment: vi.fn(),
    schedule: vi.fn(),
    start: vi.fn(),
    submitCompletion: vi.fn(),
    confirmCompletion: vi.fn(),
    dispute: vi.fn(),
    review: vi.fn(),
    releasePayment: vi.fn(),
    resolveDispute: vi.fn(),
  },
}));

const detail = (overrides: Partial<ProxyInspectionDetail> = {}): ProxyInspectionDetail => ({
  request: {
    _id: 'request-1',
    property: { _id: 'property-1', title: 'Lekki duplex', publicReference: 'RTQ-1' },
    buyer: { _id: 'buyer-1', name: 'Buyer', role: 'buyer' },
    inspector: { _id: 'agent-1', name: 'Ada Okafor', role: 'proxy_inspector' },
    inspectorProfile: 'profile-1',
    requestedServices: ['photos'],
    status: 'awaiting_payment',
    proposedPrice: 40_000,
    agreedPrice: 40_000,
    buyerPriceConfirmed: true,
    inspectorPriceConfirmed: true,
    priceLockedAt: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  pricing: {
    agreedPrice: 40_000,
    buyerFeePercentage: 10,
    buyerFeeAmount: 4_000,
    buyerTotalAmount: 44_000,
    inspectorCommissionPercentage: 10,
    inspectorCommissionAmount: 4_000,
    inspectorPayoutAmount: 36_000,
    totalPlatformRevenue: 8_000,
  },
  serviceEscrow: null,
  report: null,
  evidence: [],
  dispute: null,
  ...overrides,
});

describe('ProxyWorkspace pricing display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('shows buyer fee and total payable from backend pricing', () => {
    render(
      <MemoryRouter>
        <ProxyWorkspace detail={detail()} requestId="request-1" role="buyer" reload={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('₦40,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₦4,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₦44,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/RealtiQ adds a 10% Platform & Protection Fee/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Platform & Protection Fee to your agreed inspection price/i)[0]).toHaveTextContent('10%');
  });

  it('shows inspector commission and payout from backend pricing', () => {
    render(
      <MemoryRouter>
        <ProxyWorkspace detail={detail({ request: { ...detail().request, status: 'awaiting_price_confirmation' } })} requestId="request-1" role="proxy_inspector" reload={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('₦36,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/This supports client acquisition, secure payment collection, task coordination/i)[0]).toHaveTextContent('10%');
    expect(screen.getAllByText(/RealtiQ deducts a/i)[0]).toHaveTextContent('10%');
    expect(screen.getAllByText(/Payment processing charges are covered by RealtiQ/i).length).toBeGreaterThan(0);
  });

  it('starts checkout from a fresh initialization redirect without forcing a workspace reload loop', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    vi.mocked(proxyNetworkService.initializePayment).mockResolvedValue({
      reference: 'pay-ref-1',
      redirectUrl: 'https://pay.example/checkout',
      pricing: {
        agreedPrice: 40_000,
        buyerFeePercentage: 10,
        buyerFeeAmount: 4_000,
        buyerTotalAmount: 44_000,
      },
    });

    render(
      <MemoryRouter>
        <ProxyWorkspace detail={detail()} requestId="request-1" role="buyer" reload={reload} />
      </MemoryRouter>,
    );

    expect(proxyNetworkService.initializePayment).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Load secure payment total' }));

    expect(proxyNetworkService.initializePayment).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith('https://pay.example/checkout');
    expect(sessionStorage.getItem('realtiq.proxyPaymentContext')).toBe(JSON.stringify({ reference: 'pay-ref-1', requestId: 'request-1' }));
  });

  it('starts checkout when retrying an existing pending payment initialization', async () => {
    const user = userEvent.setup();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    vi.mocked(proxyNetworkService.initializePayment).mockResolvedValue({
      reference: 'pay-ref-pending',
      redirectUrl: 'https://pay.example/pending-checkout',
      pending: true,
      message: 'A payment initialization already exists; continue with the returned redirectUrl.',
      pricing: {
        agreedPrice: 40_000,
        buyerFeePercentage: 10,
        buyerFeeAmount: 4_000,
        buyerTotalAmount: 44_000,
      },
    });

    render(
      <MemoryRouter>
        <ProxyWorkspace detail={detail()} requestId="request-1" role="buyer" reload={vi.fn()} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Load secure payment total' }));

    expect(proxyNetworkService.initializePayment).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith('https://pay.example/pending-checkout');
    expect(sessionStorage.getItem('realtiq.proxyPaymentContext')).toBe(JSON.stringify({ reference: 'pay-ref-pending', requestId: 'request-1' }));
  });

  it('shows the backend fallback message when initialization has no redirect URL', async () => {
    const user = userEvent.setup();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    vi.mocked(proxyNetworkService.initializePayment).mockResolvedValue({
      reference: 'pay-ref-no-link',
      message: 'Checkout link is unavailable. Try again later.',
    });

    render(
      <MemoryRouter>
        <ProxyWorkspace detail={detail()} requestId="request-1" role="buyer" reload={vi.fn()} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Load secure payment total' }));

    expect(assign).not.toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent('Checkout link is unavailable. Try again later.');
  });
});
