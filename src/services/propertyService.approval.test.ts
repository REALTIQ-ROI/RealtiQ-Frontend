import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { propertyService, type PropertyApprovalInput } from './propertyService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const property = {
  _id: 'property-1',
  title: 'Review listing',
  price: 100,
  location: 'Lagos',
  propertyType: 'apartment',
  bedrooms: 2,
  bathrooms: 2,
  squareFeet: 1000,
  description: 'Listing description',
  paymentTypes: [],
  media: [],
  status: 'available',
};

describe('propertyService approval step-up contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each<PropertyApprovalInput>([
    { decision: 'approve' },
    { decision: 'reject', rejectionReason: 'Missing required ownership details.' },
  ])('sends the exact $decision body with the one-use challenge header', async (body) => {
    vi.mocked(api.patch).mockResolvedValue({ data: { property, approvalStatus: body.decision === 'approve' ? 'approved' : 'rejected' } } as never);

    await propertyService.updatePropertyApproval('property-1', body, 'challenge-1');

    expect(api.patch).toHaveBeenCalledWith('/properties/property-1/approval', body, {
      headers: { 'X-Step-Up-Challenge': 'challenge-1' },
    });
  });

  it('encodes the property id used in the PATCH path', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { property, approvalStatus: 'approved' } } as never);

    await propertyService.updatePropertyApproval('property/1', { decision: 'approve' }, 'challenge-2');

    expect(api.patch).toHaveBeenCalledWith('/properties/property%2F1/approval', { decision: 'approve' }, {
      headers: { 'X-Step-Up-Challenge': 'challenge-2' },
    });
  });
});
