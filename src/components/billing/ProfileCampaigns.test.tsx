import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileCampaigns from './ProfileCampaigns';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { promotionCampaignService, type PromotionCampaign, type PromotionEntry } from '../../services/promotionCampaignService';
import { propertyService } from '../../services/propertyService';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ activeProfile: { id: 'seller-profile', permissions: ['listing.boost'] } }) }));
vi.mock('../../hooks/useBoundStepUp', () => ({ useBoundStepUp: vi.fn() }));
vi.mock('../../services/promotionCampaignService', () => ({ promotionCampaignService: { list: vi.fn(), get: vi.fn(), ledger: vi.fn(), eligiblePlacements: vi.fn(), create: vi.fn(), topUp: vi.fn(), end: vi.fn() } }));
vi.mock('../../services/propertyService', () => ({ propertyService: { getMyProperties: vi.fn() } }));
vi.mock('../auth/StepUpDialog', () => ({ default: () => null }));

const begin = vi.fn();
const campaign = (id: string): PromotionCampaign => ({ id, profileId: 'seller-profile', propertyId: `property-${id}`,
  placementId: `placement-${id}`, billingEvent: 'click', currency: 'NGN', bidMinor: 10000, state: 'active',
  balanceMinor: 500000, totalFundedMinor: 500000, totalSpentMinor: 0, refundPendingMinor: 0, pauseCode: null,
  version: 1, startedAt: null, endedAt: null, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' });
const entry = (id: string, campaignId: string): PromotionEntry => ({ id, campaignId, kind: id, event: null,
  amountMinor: 500000, budgetMinor: 500000, remainingMinor: 500000, vatMinor: 0, currency: 'NGN', state: 'paid',
  documentsState: null, recognitionState: null, occurredAt: '2026-11-01T00:00:00.000Z' });

describe('profile campaign budgets', () => {
  beforeEach(() => {
    vi.restoreAllMocks(); vi.clearAllMocks(); sessionStorage.clear(); localStorage.setItem('activeProfileId', 'seller-profile');
    vi.mocked(useBoundStepUp).mockReturnValue({ begin, challenge: null, busy: false, error: null, cancel: vi.fn(), complete: vi.fn() } as unknown as ReturnType<typeof useBoundStepUp>);
    vi.mocked(promotionCampaignService.list).mockResolvedValue({ campaigns: [campaign('one'), campaign('two')], nextCursor: null });
    vi.mocked(promotionCampaignService.get).mockImplementation(async (id) => ({ campaign: campaign(id), entries: [] }));
    vi.mocked(promotionCampaignService.ledger).mockImplementation(async (id) => ({ entries: [entry(`entry-${id}`, id)], nextCursor: id === 'one' ? 'next-page' : null }));
    vi.mocked(propertyService.getMyProperties).mockResolvedValue({ properties: [{ _id: '66a000000000000000000001', title: 'Example home', publicReference: 'RTQ-ABC123' } as never], total: 1, page: 1, limit: 100 });
    vi.mocked(promotionCampaignService.eligiblePlacements).mockResolvedValue({ state: 'ready', property: { id: '66a000000000000000000001', title: 'Example home', publicReference: 'RTQ-ABC123' }, placements: [{ placementId: 'home_top', label: 'home_top' }], billingEvents: ['click', 'enquiry'], currencyRules: [{ currency: 'NGN', minimumBidMinor: 2500, state: 'available', reasonCode: null }], initialBudgetMinor: { minimum: 1, maximum: Number.MAX_SAFE_INTEGER, unit: 'minor', integerOnly: true, additionalLimit: 'Server limit' }, providerAvailability: { state: 'available', reasonCode: null } });
  });

  it('binds the exact selected campaign and integer minor-unit top-up', async () => {
    const user = userEvent.setup();
    render(<ProfileCampaigns />);
    await user.click(await screen.findByRole('button', { name: 'Campaign for property property-one' }));
    await user.type(await screen.findByLabelText('Top-up amount (NGN, whole units)'), '50');
    await user.click(screen.getByRole('button', { name: 'Top up with authenticator' }));
    expect(begin).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST', path: '/api/profiles/current/promotion-campaigns/one/top-ups',
      body: { budgetMinor: 5000, operationKey: expect.stringMatching(/^campaign_/) },
    }));
  });

  it('ignores an older ledger page after another campaign is selected', async () => {
    let resolveOldPage!: (value: { entries: PromotionEntry[]; nextCursor: null }) => void;
    const oldPage = new Promise<{ entries: PromotionEntry[]; nextCursor: null }>((resolve) => { resolveOldPage = resolve; });
    vi.mocked(promotionCampaignService.ledger).mockImplementation(async (id, params) =>
      id === 'one' && params.before ? oldPage : { entries: [entry(`entry-${id}`, id)], nextCursor: id === 'one' ? 'next-page' : null });
    const user = userEvent.setup();
    render(<ProfileCampaigns />);
    await user.click(await screen.findByRole('button', { name: 'Campaign for property property-one' }));
    await user.click(await screen.findByRole('button', { name: 'Load more entries' }));
    await waitFor(() => expect(promotionCampaignService.ledger).toHaveBeenCalledWith('one', { before: 'next-page', limit: 25 }));
    await user.click(screen.getByRole('button', { name: 'Campaign for property property-two' }));
    expect(await screen.findByText(/entry-two/)).toBeInTheDocument();
    resolveOldPage({ entries: [entry('stale-entry', 'one')], nextCursor: null });
    await waitFor(() => expect(screen.queryByText(/stale-entry/)).not.toBeInTheDocument());
  });

  it('creates a campaign only from the eligible lookup with an exact bound body', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<ProfileCampaigns />);
    await user.selectOptions(await screen.findByLabelText('Your listing'), '66a000000000000000000001');
    await waitFor(() => expect(promotionCampaignService.eligiblePlacements).toHaveBeenCalledWith('66a000000000000000000001'));
    await user.selectOptions(await screen.findByLabelText('Placement'), 'home_top');
    await user.selectOptions(screen.getByLabelText('Billing event'), 'click');
    await user.selectOptions(screen.getByLabelText('Currency'), 'NGN');
    await user.type(screen.getByLabelText(/Bid per event \(NGN\)/), '25');
    await user.type(screen.getByLabelText('Initial budget (NGN)'), '5000');
    await user.click(screen.getByRole('button', { name: 'Create with authenticator' }));
    expect(begin).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/api/profiles/current/promotion-campaigns', body: { propertyId: '66a000000000000000000001', placementId: 'home_top', billingEvent: 'click', currency: 'NGN', bidMinor: 2500, initialBudgetMinor: 500000, operationKey: expect.stringMatching(/^campaign_/) } }));
  });

  it('ignores a stale placement lookup after changing listings', async () => {
    let resolveOld!: (value: Awaited<ReturnType<typeof promotionCampaignService.eligiblePlacements>>) => void;
    const oldLookup = new Promise<Awaited<ReturnType<typeof promotionCampaignService.eligiblePlacements>>>((resolve) => { resolveOld = resolve; });
    vi.mocked(propertyService.getMyProperties).mockResolvedValue({ properties: [{ _id: '66a000000000000000000001', title: 'First' }, { _id: '66a000000000000000000002', title: 'Second' }] as never, total: 2, page: 1, limit: 100 });
    const ready = await promotionCampaignService.eligiblePlacements('66a000000000000000000001');
    vi.mocked(promotionCampaignService.eligiblePlacements).mockImplementation(async (id) => id.endsWith('001') ? oldLookup : { ...ready, property: { id, title: 'Second', publicReference: 'RTQ-SECOND' }, placements: [{ placementId: 'second_place', label: 'Second placement' }] });
    const user = userEvent.setup();
    render(<ProfileCampaigns />);
    await user.selectOptions(await screen.findByLabelText('Your listing'), '66a000000000000000000001');
    await user.selectOptions(screen.getByLabelText('Your listing'), '66a000000000000000000002');
    expect(await screen.findByRole('option', { name: 'Second placement' })).toBeInTheDocument();
    resolveOld(ready);
    await waitFor(() => expect(screen.queryByRole('option', { name: 'home_top' })).not.toBeInTheDocument());
  });

  it('retries a failed placement lookup for the same listing without creating a campaign', async () => {
    vi.mocked(promotionCampaignService.eligiblePlacements).mockRejectedValueOnce(new Error('Lookup unavailable'));
    const user = userEvent.setup();
    render(<ProfileCampaigns />);
    await user.selectOptions(await screen.findByLabelText('Your listing'), '66a000000000000000000001');
    expect(await screen.findByText(/Lookup unavailable/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry lookup' }));
    expect(await screen.findByRole('option', { name: 'home_top' })).toBeInTheDocument();
    expect(promotionCampaignService.eligiblePlacements).toHaveBeenCalledTimes(2);
    expect(begin).not.toHaveBeenCalled();
  });

  it('does not offer funding when the lookup reports provider unavailability', async () => {
    vi.mocked(promotionCampaignService.eligiblePlacements).mockResolvedValue({ state: 'provider_unavailable', reasonCode: 'FEATURE_PAYSTACK_UNCONFIGURED', placements: [{ placementId: 'home_top', label: 'home_top' }], currencyRules: [], providerAvailability: { state: 'unavailable', reasonCode: 'FEATURE_PAYSTACK_UNCONFIGURED' } });
    const user = userEvent.setup();
    render(<ProfileCampaigns />);
    await user.selectOptions(await screen.findByLabelText('Your listing'), '66a000000000000000000001');
    expect(await screen.findByText(/Campaign creation is provider unavailable/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create with authenticator' })).not.toBeInTheDocument();
    expect(begin).not.toHaveBeenCalled();
  });
});
