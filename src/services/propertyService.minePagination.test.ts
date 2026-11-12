import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { propertyService } from './propertyService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn() } }));

describe('propertyService.getMyProperties pagination', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserves the mounted owner inventory pagination envelope', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        properties: [{ _id: 'internal-property-id', title: 'Example home', price: 0, location: 'Lagos', propertyType: 'house', bedrooms: 0, bathrooms: 0, description: '', paymentTypes: [], media: [], status: 'unpublished' }],
        pagination: { page: 3, limit: 20, total: 45, pages: 3 },
      },
    });

    const result = await propertyService.getMyProperties(3, 20);

    expect(api.get).toHaveBeenCalledWith('/properties/mine', { params: { page: 3, limit: 20 } });
    expect(result).toMatchObject({ page: 3, limit: 20, total: 45, pages: 3 });
    expect(result.properties[0]).toMatchObject({ _id: 'internal-property-id', price: 0 });
  });
});
