import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { propertyService } from './propertyService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const property = { _id: 'property-1', title: 'Listing', status: 'available', version: 8 } as never;

describe('property project association contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('patches the association with expectedVersion and the bound step-up header', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { property, version: 9 } });
    const body = { projectId: 'project-2', projectUnit: { unitNumber: 'B-12' }, expectedVersion: 8 };
    await expect(propertyService.attachPropertyToProject('property 1', body, 'challenge-1')).resolves.toMatchObject({
      property: { _id: 'property-1' }, version: 9,
    });
    expect(api.patch).toHaveBeenCalledWith('/properties/property%201/project', body, {
      headers: { 'X-Step-Up-Challenge': 'challenge-1' },
    });
  });

  it('uses DELETE with an expected version instead of sending a null project ID', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { property, version: 9 } });
    const body = { expectedVersion: 8 };
    await expect(propertyService.detachPropertyFromProject('property-1', body, 'challenge-2')).resolves.toMatchObject({
      property: { _id: 'property-1' }, version: 9,
    });
    expect(api.delete).toHaveBeenCalledWith('/properties/property-1/project', {
      data: body,
      headers: { 'X-Step-Up-Challenge': 'challenge-2' },
    });
  });
});
