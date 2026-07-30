import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { propertyAnalyticsService } from './propertyAnalyticsService';

vi.mock('../lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

describe('propertyAnalyticsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('checks paid analytics access from the backend', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { hasAccess: false, product: 'property_market_analytics', access: null } });
    const result = await propertyAnalyticsService.getAccessStatus();
    expect(api.get).toHaveBeenCalledWith('/analytics/access/status');
    expect(result.hasAccess).toBe(false);
  });

  it('initializes one-time analytics payment and returns checkout urls', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { reference: 'ref1', redirectUrl: 'https://checkout.paystack.com/ref1' } });
    const result = await propertyAnalyticsService.initializePayment('one_time');
    expect(api.post).toHaveBeenCalledWith('/analytics/access/initialize-payment', { accessType: 'one_time' });
    expect(result.redirectUrl).toContain('paystack');
  });

  it('passes heatmap filters without raw analytics assumptions', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { metric: 'market_interest', totalEvents: 0, points: [] } });
    await propertyAnalyticsService.getHeatmap({ metric: 'market_interest', propertyType: 'apartment', limit: 200 });
    expect(api.get).toHaveBeenCalledWith('/analytics/property-heatmap', {
      params: { metric: 'market_interest', propertyType: 'apartment', limit: 200 },
      signal: undefined,
    });
  });
});
