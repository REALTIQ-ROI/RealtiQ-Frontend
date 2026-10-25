import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import type { CreatePropertyPayload } from './propertyService';
import { propertyService } from './propertyService';

vi.mock('../lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
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

  it('replays property create and update with the bound challenge header when supplied', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { property: { _id: 'prop1', ...payload, bedrooms: 4, bathrooms: 4, status: 'available' } } });
    await propertyService.createPropertyWithResponse(payload, 'create-challenge');
    expect(api.post).toHaveBeenCalledWith('/properties', payload, { headers: { 'X-Step-Up-Challenge': 'create-challenge' } });
    vi.mocked(api.patch).mockResolvedValue({ data: { property: { _id: 'prop1', ...payload, bedrooms: 4, bathrooms: 4, status: 'available' } } });
    const update = { expectedVersion: 4, canonicalFields: { negotiable: false } };
    await propertyService.updateProperty('prop1', update, 'update-challenge');
    expect(api.patch).toHaveBeenCalledWith('/properties/prop1', update, { headers: { 'X-Step-Up-Challenge': 'update-challenge' } });
  });

  it('sends update choices and consumes the documented property envelope', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: {
        property: {
          _id: 'prop1', ...payload, bedrooms: 4, bathrooms: 4,
          status: 'available', price: 65_000_000, paymentTypes: ['installment', 'escrow'],
        },
        version: 3,
      },
    });
    const result = await propertyService.updateProperty('prop1', { price: 65_000_000, paymentTypes: ['escrow'] });
    expect(api.patch).toHaveBeenCalledWith('/properties/prop1', { price: 65_000_000, paymentTypes: ['escrow'] });
    expect(result.paymentTypes).toEqual(['installment', 'escrow']);
  });

  it('binds property archive version body and challenge header on DELETE', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { state: 'archived' } });
    await propertyService.deleteProperty('prop/1', { expectedVersion: 4 }, 'challenge-1');
    expect(api.delete).toHaveBeenCalledWith('/properties/prop%2F1', {
      data: { expectedVersion: 4 },
      headers: { 'X-Step-Up-Challenge': 'challenge-1' },
    });
  });

  it('does not invent outright payment on an omitted response field', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { _id: 'prop1', ...payload, bedrooms: 4, bathrooms: 4, status: 'available', price: 40_000_000, paymentTypes: undefined },
    });
    const result = await propertyService.getPropertyById('prop1');
    expect(result.paymentTypes).toEqual([]);
  });
});
