import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { parseSavedSearch, personalisationService } from './personalisationService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() } }));

describe('saved search revision DTOs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('unwraps the documented response and preserves a configuration revision on update', async () => {
    const savedSearch = {
      _id: 'search-1', publicReference: 'RTQ-SEARCH-1', name: 'Two bedrooms',
      filters: { bedrooms: 2 }, configurationRevision: 4,
      createdAt: '2026-10-24T12:00:00.000Z', updatedAt: '2026-10-24T12:00:00.000Z',
    };
    vi.mocked(api.patch).mockResolvedValue({ data: { savedSearch } });

    await expect(personalisationService.updateSearch('search-1', {
      name: 'Two bedrooms', expectedConfigurationRevision: 3,
    })).resolves.toEqual(savedSearch);
    expect(api.patch).toHaveBeenCalledWith('/personalisation/searches/search-1', {
      name: 'Two bedrooms', expectedConfigurationRevision: 3,
    });
  });

  it('rejects a saved-search response without its documented revision', () => {
    expect(() => parseSavedSearch({
      _id: 'search-1', publicReference: 'RTQ-SEARCH-1', name: 'Two bedrooms', filters: { bedrooms: 2 },
      createdAt: '2026-10-24T12:00:00.000Z', updatedAt: '2026-10-24T12:00:00.000Z',
    })).toThrow(/revision or identity/i);
  });
});
