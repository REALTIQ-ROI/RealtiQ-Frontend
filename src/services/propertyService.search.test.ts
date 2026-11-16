import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { propertyService } from './propertyService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn() } }));

describe('canonical property search requests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends supported aliases as canonical filters and preserves false, zero and arrays', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { properties: [], total: 0, page: 1, limit: 25 } });
    await propertyService.getProperties(new URLSearchParams('min_price=0&beds=3&amenities=pool&amenities=lift&negotiable=false'));

    expect(api.get).toHaveBeenCalledWith('/properties', expect.objectContaining({ params: expect.any(URLSearchParams) }));
    const params = vi.mocked(api.get).mock.calls[0][1]?.params as URLSearchParams;
    expect(params.get('minPrice')).toBe('0');
    expect(params.has('min_price')).toBe(false);
    expect(params.get('bedrooms')).toBe('3');
    expect(params.has('beds')).toBe(false);
    expect(params.getAll('amenities')).toEqual(['pool', 'lift']);
    expect(params.get('negotiable')).toBe('false');
    expect(params.get('sort')).toBe('recommended');
    expect(params.get('status')).toBe('available');
  });

  it('uses the canonical nearby endpoint with the same catalogue defaults', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { properties: [], total: 0, page: 1, limit: 25, center: [3.3, 6.5], radiusKm: 10 } });
    await propertyService.getCanonicalNearbyProperties(new URLSearchParams('nearbyLat=6.5&nearbyLng=3.3&nearbyRadiusKm=10'));

    expect(api.get).toHaveBeenCalledWith('/properties/map/nearby', expect.objectContaining({ params: expect.any(URLSearchParams) }));
    const params = vi.mocked(api.get).mock.calls[0][1]?.params as URLSearchParams;
    expect(params.get('nearbyLat')).toBe('6.5');
    expect(params.get('nearbyLng')).toBe('3.3');
    expect(params.get('nearbyRadiusKm')).toBe('10');
    expect(params.get('includeUnpriced')).toBe('true');
    expect(params.get('withPhotosOnly')).toBe('true');
  });
});
