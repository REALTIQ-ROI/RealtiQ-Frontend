import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compareFxSourceLabel, compareService } from './compareService';

const apiGet = vi.hoisted(() => vi.fn());
vi.mock('../lib/axios', () => ({ default: { get: apiGet } }));

describe('Compare display FX contract', () => {
  beforeEach(() => apiGet.mockReset());

  it('sends a buyer rate as a query parameter to the existing view endpoint', async () => {
    apiGet.mockResolvedValue({ data: { comparison: { items: [] } } });
    await compareService.view({ propertyIds: ['property-1', 'property-2'], displayCurrency: 'NGN', buyerFxOverrideNgnPerUsd: 1510.5 });
    expect(apiGet).toHaveBeenCalledWith('/compare/view', expect.objectContaining({
      params: { propertyIds: 'property-1,property-2', displayCurrency: 'NGN', buyerFxOverrideNgnPerUsd: 1510.5 },
    }));
  });

  it('labels a buyer override as the buyer’s rate, not the official NFEM rate', () => {
    expect(compareFxSourceLabel('buyer_override')).toBe('Your rate');
    expect(compareFxSourceLabel('official_nfem')).toBe('CBN NFEM');
  });
});
