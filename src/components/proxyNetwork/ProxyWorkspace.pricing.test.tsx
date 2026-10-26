import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProxyInspectionDetail } from '../../types/proxyNetwork';
import { proxyNetworkService } from '../../services/proxyNetworkService';
import ProxyWorkspace from './ProxyWorkspace';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'buyer-1', role: 'buyer', name: 'Buyer' }, activeProfile: { id: 'buyer-profile-1' }, token: 'test-token' }),
}));

vi.mock('../../services/stepUpService', () => ({
  stepUpService: { start: vi.fn(), verify: vi.fn() },
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
    verifyPayment: vi.fn(),
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

import { stepUpService } from '../../services/stepUpService';

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
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('activeProfileId', 'buyer-profile-1');
    vi.mocked(stepUpService.start).mockResolvedValue({
      challengeId: 'challenge-1',
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      method: 'totp',
    });
    vi.mocked(stepUpService.verify).mockResolvedValue(undefined);
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
    expect(screen.getAllByText(/not a confirmation that an approved, versioned partner-fee policy/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/The approved, versioned partner-fee policy and provider activation are not confirmed/i)).toBeInTheDocument();
  });

  it('shows inspector commission and payout from backend pricing', () => {
    render(
      <MemoryRouter>
        <ProxyWorkspace detail={detail({ request: { ...detail().request, status: 'awaiting_price_confirmation' } })} requestId="request-1" role="proxy_inspector" reload={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('₦36,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/These amounts are returned by the backend/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/approved, versioned partner-fee policy or provider activation/i).length).toBeGreaterThan(0);
  });

  it('binds checkout to TOTP and redirects only after the user reviews server pricing', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Pay Now' }));

    expect(stepUpService.start).toHaveBeenCalledWith('POST', '/api/proxy-inspections/request-1/initialize-payment', {});
    await user.type(screen.getByLabelText('Six-digit authenticator code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }));

    expect(proxyNetworkService.initializePayment).toHaveBeenCalledTimes(1);
    expect(proxyNetworkService.initializePayment).toHaveBeenCalledWith('request-1', 'challenge-1', {});
    expect(reload).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('realtiq.proxyPaymentContext')).toBe(JSON.stringify({ reference: 'pay-ref-1', requestId: 'request-1' }));
    await user.click(screen.getByRole('button', { name: /Continue to provider checkout/ }));
    expect(assign).toHaveBeenCalledWith('https://pay.example/checkout');
  });

  it('continues an existing pending initialization without issuing another request', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Pay Now' }));
    await user.type(screen.getByLabelText('Six-digit authenticator code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }));

    expect(proxyNetworkService.initializePayment).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('realtiq.proxyPaymentContext')).toBe(JSON.stringify({ reference: 'pay-ref-pending', requestId: 'request-1' }));
    await user.click(screen.getByRole('button', { name: /Continue to provider checkout/ }));
    expect(assign).toHaveBeenCalledWith('https://pay.example/pending-checkout');
  });

  it('preserves a checkout reference without a redirect and offers status verification instead of retry', async () => {
    const user = userEvent.setup();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    vi.mocked(proxyNetworkService.initializePayment).mockResolvedValue({
      reference: 'pay-ref-no-link',
      message: 'Checkout link is unavailable. Try again later.',
    });
    vi.mocked(proxyNetworkService.verifyPayment).mockResolvedValue({
      verified: false,
    });

    render(
      <MemoryRouter>
        <ProxyWorkspace detail={detail()} requestId="request-1" role="buyer" reload={vi.fn()} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Pay Now' }));
    await user.type(screen.getByLabelText('Six-digit authenticator code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }));

    expect(assign).not.toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent('Checkout link is unavailable. Try again later.');
    expect(screen.getByText('Payment reference: pay-ref-no-link')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry initialization/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check payment status' }));
    expect(proxyNetworkService.verifyPayment).toHaveBeenCalledWith('pay-ref-no-link');
    expect(await screen.findByText(/No new checkout was started/i)).toBeInTheDocument();
  });
});
