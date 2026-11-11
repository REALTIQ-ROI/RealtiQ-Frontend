import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { promotionCampaignService } from './promotionCampaignService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('profile promotion campaign contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses opaque cursors for campaign and ledger pages', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { campaigns: [], entries: [], nextCursor: null } });
    await promotionCampaignService.list({ after: 'campaign-cursor', limit: 25 });
    await promotionCampaignService.ledger('campaign-1', { before: 'entry-cursor', limit: 25 });
    expect(api.get).toHaveBeenCalledWith('/profiles/current/promotion-campaigns', { params: { after: 'campaign-cursor', limit: 25 } });
    expect(api.get).toHaveBeenCalledWith('/profiles/current/promotion-campaigns/campaign-1/ledger', { params: { before: 'entry-cursor', limit: 25 } });
  });

  it('sends exact campaign funding and end bodies with distinct bound challenges', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    const funding = { budgetMinor: 100000, operationKey: 'stable-topup-key' };
    const ending = { disposition: 'refund' as const, operationKey: 'stable-end-key', expectedVersion: 3 };
    await promotionCampaignService.topUp('campaign-1', funding, 'challenge-1');
    await promotionCampaignService.end('campaign-1', ending, 'challenge-2');
    expect(api.post).toHaveBeenCalledWith('/profiles/current/promotion-campaigns/campaign-1/top-ups', funding, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
    expect(api.post).toHaveBeenCalledWith('/profiles/current/promotion-campaigns/campaign-1/end', ending, { headers: { 'X-Step-Up-Challenge': 'challenge-2' } });
  });

  it('reads eligible placements for the selected property without client eligibility fields', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { state: 'ready', placements: [], currencyRules: [] } });
    await promotionCampaignService.eligiblePlacements('66a000000000000000000001');
    expect(api.get).toHaveBeenCalledWith('/profiles/current/promotion-campaigns/eligible-placements', { params: { propertyId: '66a000000000000000000001' } });
  });
});
