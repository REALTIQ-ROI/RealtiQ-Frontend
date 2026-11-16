import { beforeEach, describe, expect, it, vi } from 'vitest';
import api, { ApiRequestError } from '../lib/axios';
import { locationService, locationSuggestionFailureMessage } from './locationService';

vi.mock('../lib/axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/axios')>();
  return { ...actual, default: { get: vi.fn() } };
});

describe('locationSuggestionFailureMessage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('explains an unconfigured gazetteer without inventing a location identifier', () => {
    const error = new ApiRequestError('Service unavailable.', { status: 503, code: 'FEATURE_SEARCH_GAZETTEER_UNCONFIGURED' });
    expect(locationSuggestionFailureMessage(error)).toMatch(/location directory is unavailable.*no guessed location was selected/i);
  });

  it('preserves other server-provided error messages', () => {
    expect(locationSuggestionFailureMessage(new Error('Select a parent location first.'))).toBe('Select a parent location first.');
  });

  it('uses the selected parent and no-store semantics for location suggestions', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { suggestions: [], revision: 8 } });
    await locationService.suggestions({ level: 'area', q: 'Lek', parentId: 'lga-current', limit: 10 });

    expect(api.get).toHaveBeenCalledWith('/locations/suggestions', {
      params: { level: 'area', q: 'Lek', parentId: 'lga-current', limit: 10 },
      headers: { 'Cache-Control': 'no-store' },
      signal: undefined,
    });
  });
});
