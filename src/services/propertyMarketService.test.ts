import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { propertyService } from './propertyService';

vi.mock('../lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

describe('property market service endpoints', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the viewport map endpoint with bounds and activity filters', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        mode: 'clusters',
        bounds: { north: 6.65, south: 6.35, east: 3.65, west: 3.2, zoom: 10 },
        zoom: 10,
        total: 0,
        clusters: [],
      },
    });
    await propertyService.getMapProperties({
      north: 6.65,
      south: 6.35,
      east: 3.65,
      west: 3.2,
      zoom: 10,
      activityMetric: 'market_interest',
      activityLevel: 'high',
      activityPeriod: '30d',
    });
    expect(api.get).toHaveBeenCalledWith('/properties/map', {
      params: {
        north: 6.65,
        south: 6.35,
        east: 3.65,
        west: 3.2,
        zoom: 10,
        activityMetric: 'market_interest',
        activityLevel: 'high',
        activityPeriod: '30d',
      },
      signal: undefined,
    });
  });

  it('loads public property price history table and chart endpoints', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { history: [], total: 0, page: 1, limit: 20 } })
      .mockResolvedValueOnce({ data: { propertyId: 'RTQ-PROP-1', currency: 'NGN', series: [] } });
    await propertyService.getPriceHistory('RTQ-PROP-1', { sort: 'desc', page: 1, limit: 20 });
    await propertyService.getPriceHistoryChart('RTQ-PROP-1');
    expect(api.get).toHaveBeenNthCalledWith(1, '/properties/RTQ-PROP-1/price-history', {
      params: { sort: 'desc', page: 1, limit: 20 },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, '/properties/RTQ-PROP-1/price-history/chart', {
      params: undefined,
    });
  });

  it('sends the optional priceChangeReason during updates', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: {
        _id: 'prop1',
        title: 'Updated',
        price: 45_000_000,
        location: 'Lekki',
        propertyType: 'apartment',
        bedrooms: 3,
        bathrooms: 3,
        description: 'Updated',
        squareFeet: 1000,
        media: [],
        paymentTypes: ['outright'],
        status: 'available',
      },
    });
    await propertyService.updateProperty('prop1', {
      price: 45_000_000,
      priceChangeReason: 'Updated after renovation',
    });
    expect(api.patch).toHaveBeenCalledWith('/properties/prop1', {
      price: 45_000_000,
      priceChangeReason: 'Updated after renovation',
    });
  });
});
