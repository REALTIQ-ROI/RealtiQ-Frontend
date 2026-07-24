import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import type { CreatePropertyPayload } from './propertyService';
import { propertyService } from './propertyService';

vi.mock('../lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const payload: CreatePropertyPayload = {
  title: 'Waterfront Home',
  price: 75_000_000,
  location: 'Lagos',
  propertyType: 'villa',
  squareFeet: 3000,
  description: 'Waterfront property',
  media: [],
  paymentTypes: ['outright', 'escrow'],
};

describe('propertyService payment types', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the selected array and consumes the normalized create response', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        property: {
          _id: 'prop1',
          ...payload,
          bedrooms: 4,
          bathrooms: 4,
          status: 'available',
          paymentTypes: ['outright', 'installment', 'escrow'],
        },
      },
    });
    const result = await propertyService.createPropertyWithResponse(payload);
    expect(api.post).toHaveBeenCalledWith('/properties', payload);
    expect(result.property.paymentTypes).toEqual(['outright', 'installment', 'escrow']);
  });

  it('sends update choices and applies server/threshold normalization', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: {
        _id: 'prop1',
        ...payload,
        bedrooms: 4,
        bathrooms: 4,
        status: 'available',
        price: 65_000_000,
        paymentTypes: ['installment', 'escrow'],
      },
    });
    const result = await propertyService.updateProperty('prop1', { price: 65_000_000, paymentTypes: ['escrow'] });
    expect(api.patch).toHaveBeenCalledWith('/properties/prop1', { price: 65_000_000, paymentTypes: ['escrow'] });
    expect(result.paymentTypes).toEqual(['installment', 'escrow']);
  });

  it('temporarily normalizes a legacy read to outright', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { _id: 'prop1', ...payload, bedrooms: 4, bathrooms: 4, status: 'available', price: 40_000_000, paymentTypes: undefined },
    });
    const result = await propertyService.getPropertyById('prop1');
    expect(result.paymentTypes).toEqual(['outright']);
  });
});
