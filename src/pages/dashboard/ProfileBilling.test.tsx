import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileBilling from './ProfileBilling';
import { revenueFoundationService, type RevenueDocument } from '../../services/revenueFoundationService';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';

vi.mock('../../components/layout/BuyerPortalLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../components/layout/LandlordPortalLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../components/billing/ProfilePayoutSetup', () => ({ default: () => null }));
vi.mock('../../components/billing/ProfileCampaigns', () => ({ default: () => null }));
vi.mock('../../components/auth/StepUpDialog', () => ({ default: () => null }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'owner' }, activeProfile: { id: 'developer-profile', kind: 'developer', permissions: ['team.manage'] } }) }));
vi.mock('../../hooks/useBoundStepUp', () => ({ useBoundStepUp: vi.fn() }));
vi.mock('../../services/revenueFoundationService', () => ({ revenueFoundationService: {
  listPublicationPlans: vi.fn(), getPublicationPlan: vi.fn(), listPublicationPurchases: vi.fn(),
  listRenewalPreferences: vi.fn(), listPaymentAuthorizations: vi.fn(), listRevenueDocuments: vi.fn(),
  quotePublicationChange: vi.fn(), purchasePublicationPlan: vi.fn(),
} }));

const begin = vi.fn();
const catalogue: Awaited<ReturnType<typeof revenueFoundationService.listPublicationPlans>> = {
  state: 'configured', catalogueSource: 'unified', category: 'developer', revision: 3, taxPolicyRevision: 2, currency: 'NGN',
  renewalAvailability: { state: 'available', manual: { method: 'manual', available: true, automaticRenewal: false }, methods: [{ method: 'transfer_invoice', automaticRenewal: false, requiresActiveAuthorization: false }], unavailableMethods: [{ method: 'direct_debit', reasonCode: 'FEATURE_PAYSTACK_DIRECT_DEBIT_UNAVAILABLE' }] },
  plans: [{ key: 'starter', label: 'Starter', profileType: 'developer', terms: [{ period: 'monthly', amountMinor: 100000, currency: 'NGN', netMinor: 90000, vatMinor: 10000, grossMinor: 100000, vatRatePercent: 10, vatPolicyRevision: 2 }], entitlements: { activeProjects: 1, activeListings: 3, units: 5, includedSeats: 1, promotionCreditsMinor: 0 }, policyRevision: 3 }],
};
const document = (id: string): RevenueDocument => ({ id, kind: 'receipt', number: id, state: 'issued',
  supplier: {}, purchaser: {}, currency: 'NGN', netMinor: 10000, vatMinor: 0, vatRatePercent: 0,
  grossMinor: 10000, issuedAt: '2026-11-01T00:00:00.000Z' });

describe('profile publication billing', () => {
  beforeEach(() => {
    vi.clearAllMocks(); sessionStorage.clear(); localStorage.setItem('activeProfileId', 'developer-profile');
    vi.mocked(useBoundStepUp).mockReturnValue({ begin, challenge: null, busy: false, error: null, cancel: vi.fn(), complete: vi.fn() } as unknown as ReturnType<typeof useBoundStepUp>);
    vi.mocked(revenueFoundationService.listPublicationPlans).mockResolvedValue(catalogue);
    vi.mocked(revenueFoundationService.getPublicationPlan).mockResolvedValue({ profileId: 'developer-profile', category: 'developer', entitlement: null, latest: null, usage: { activeProjects: 0, activeListings: 0, units: 0, additionalSeats: 0, includedHolderSeat: true }, publicationAllowedByPlan: false });
    vi.mocked(revenueFoundationService.listPublicationPurchases).mockResolvedValue({ purchases: [], nextCursor: null });
    vi.mocked(revenueFoundationService.listRenewalPreferences).mockResolvedValue([]);
    vi.mocked(revenueFoundationService.listPaymentAuthorizations).mockResolvedValue([]);
    vi.mocked(revenueFoundationService.listRevenueDocuments).mockResolvedValue({ documents: [], nextCursor: null });
  });

  it('shows server catalogue terms and binds a purchase to the exact selected term', async () => {
    render(<ProfileBilling />);
    expect(await screen.findByRole('heading', { name: 'Starter' })).toBeInTheDocument();
    expect(screen.getByText(/₦1,000\.00 gross/i)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Plan'), 'starter');
    await userEvent.click(screen.getByRole('button', { name: 'Purchase with authenticator' }));
    await waitFor(() => expect(begin).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/api/profiles/current/publication-plan-purchases', body: expect.objectContaining({ planKey: 'starter', billingPeriod: 'monthly', operationKey: expect.stringMatching(/^publication_/) }) })));
  });

  it('does not offer a second purchase while the server reports an unresolved purchase', async () => {
    vi.mocked(revenueFoundationService.listPublicationPurchases).mockResolvedValue({ purchases: [{ id: 'purchase-1', profileId: 'developer-profile', category: 'developer', plan: { key: 'starter', label: 'Starter', profileType: 'developer', billingPeriod: 'monthly', entitlements: catalogue.plans[0].entitlements, amountMinor: 100000, currency: 'NGN', policyRevision: 3 }, reference: 'RTQ-PUB-1', state: 'outcome_unknown', createdAt: '2026-11-10T00:00:00.000Z' }], nextCursor: null });
    render(<ProfileBilling />);
    expect(await screen.findByText(/An existing purchase is outcome unknown/i)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Plan'), 'starter');
    expect(screen.getByRole('button', { name: 'Purchase with authenticator' })).toBeDisabled();
    expect(begin).not.toHaveBeenCalled();
  });

  it('does not append an older document page after a billing refresh', async () => {
    let resolveOldPage!: (value: { documents: RevenueDocument[]; nextCursor: null }) => void;
    const oldPage = new Promise<{ documents: RevenueDocument[]; nextCursor: null }>((resolve) => { resolveOldPage = resolve; });
    let firstPageReads = 0;
    vi.mocked(revenueFoundationService.listRevenueDocuments).mockImplementation(async (params) => {
      if (params.before) return oldPage;
      firstPageReads += 1;
      return firstPageReads === 1
        ? { documents: [document('first-document')], nextCursor: 'older-cursor' }
        : { documents: [document('current-document')], nextCursor: null };
    });
    render(<ProfileBilling />);
    await screen.findByText(/receipt first-document/);
    await userEvent.click(screen.getByRole('button', { name: 'Load more documents' }));
    await waitFor(() => expect(revenueFoundationService.listRevenueDocuments).toHaveBeenCalledWith({ limit: 25, before: 'older-cursor' }));
    await userEvent.click(screen.getByRole('button', { name: 'Refresh billing state' }));
    expect(await screen.findByText(/receipt current-document/)).toBeInTheDocument();
    await act(async () => { resolveOldPage({ documents: [document('stale-document')], nextCursor: null }); });
    expect(screen.queryByText(/stale-document/)).not.toBeInTheDocument();
  });

  it('offers only server available renewal methods and binds the selected preference', async () => {
    const user = userEvent.setup();
    render(<ProfileBilling />);
    await user.selectOptions(await screen.findByLabelText('Plan'), 'starter');
    const methods = screen.getByLabelText('Renewal method');
    expect(methods).toHaveTextContent('Manual');
    expect(methods).toHaveTextContent('transfer invoice');
    expect(methods).not.toHaveTextContent('direct debit');
    await user.selectOptions(methods, 'transfer_invoice');
    await user.click(screen.getByRole('button', { name: 'Save preference with authenticator' }));
    expect(begin).toHaveBeenCalledWith(expect.objectContaining({ method: 'PUT', path: '/api/profiles/current/billing/renewal-preferences', body: { kind: 'publication_plan', targetId: 'developer', planKey: 'starter', billingPeriod: 'monthly', method: 'transfer_invoice', autoRenew: false, expectedVersion: 0 } }));
  });

  it('binds explicit saved-card authorization consent to the publication purchase body', async () => {
    vi.mocked(revenueFoundationService.listPublicationPlans).mockResolvedValue({ ...catalogue, renewalAvailability: { ...catalogue.renewalAvailability!, methods: [], unavailableMethods: [{ method: 'saved_card', reasonCode: 'PAYMENT_AUTHORIZATION_REQUIRED' }] } });
    const user = userEvent.setup();
    render(<ProfileBilling />);
    await user.selectOptions(await screen.findByLabelText('Plan'), 'starter');
    await user.click(screen.getByLabelText(/Save the payment authorization for future renewals/));
    await user.click(screen.getByRole('button', { name: 'Purchase with authenticator' }));
    expect(begin).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/api/profiles/current/publication-plan-purchases', body: expect.objectContaining({ saveAuthorizationForRenewal: true, planKey: 'starter', billingPeriod: 'monthly' }) }));
  });
});
