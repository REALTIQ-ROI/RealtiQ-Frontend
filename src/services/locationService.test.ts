import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { locationService } from './locationService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn() } }));

describe('locationService', () => {
  beforeEach(() => vi.clearAllMocks());
  it('queries the documented gazetteer hierarchy and returns stable location IDs', async () => {
    const result = { revision: 4, suggestions: [{ id: 'lga-1', level: 'lga', name: 'Eti-Osa', parentId: 'state-1', breadcrumbs: [], publishedStockCount: 3 }] };
    vi.mocked(api.get).mockResolvedValue({ data: result } as never);
    await expect(locationService.suggestions({ level: 'lga', q: 'Eti', parentId: 'state-1', limit: 10 })).resolves.toEqual(result);
    expect(api.get).toHaveBeenCalledWith('/locations/suggestions', { params: { level: 'lga', q: 'Eti', parentId: 'state-1', limit: 10 }, signal: undefined });
  });
});
