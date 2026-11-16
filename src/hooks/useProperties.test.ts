import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Property } from '../types';
import type { PropertiesResponse } from '../services/propertyService';
import { propertyService } from '../services/propertyService';
import { useProperties } from './useProperties';
import { ApiRequestError } from '../lib/axios';

vi.mock('../services/propertyService', () => ({ propertyService: { getProperties: vi.fn() } }));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
};

const response = (property: Property): PropertiesResponse => ({ properties: [property], total: 1, page: 1, limit: 10 });

describe('useProperties catalogue request ordering', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not let an older search response overwrite the latest criteria', async () => {
    const older = deferred<PropertiesResponse>();
    const newer = deferred<PropertiesResponse>();
    vi.mocked(propertyService.getProperties)
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    const { result } = renderHook(() => useProperties({ limit: 10 }));

    act(() => { result.current.applyFilters(new URLSearchParams('search=older')); });
    act(() => { result.current.applyFilters(new URLSearchParams('search=newer')); });

    await act(async () => { older.resolve(response({ _id: 'older', title: 'Older result' } as Property)); await older.promise; });
    expect(result.current.properties).toEqual([]);

    await act(async () => { newer.resolve(response({ _id: 'newer', title: 'Newer result' } as Property)); await newer.promise; });
    expect(result.current.properties.map((property) => property._id)).toEqual(['newer']);
    expect(result.current.loading).toBe(false);
  });

  it('does not retry or change Recommended when the backend reports a ranking gate', async () => {
    vi.mocked(propertyService.getProperties).mockRejectedValueOnce(new ApiRequestError('Recommended ranking is unavailable.', { code: 'FEATURE_POLICY_UNCONFIGURED', status: 503 }));
    const { result } = renderHook(() => useProperties({ limit: 10 }));

    act(() => { result.current.applyFilters(new URLSearchParams('search=lagos&sort=recommended')); });
    await waitFor(() => expect(result.current.error).toContain('FEATURE_POLICY_UNCONFIGURED'));

    expect(propertyService.getProperties).toHaveBeenCalledOnce();
    expect(result.current.properties).toEqual([]);
    expect(result.current.error).toContain('FEATURE_POLICY_UNCONFIGURED');
  });

  it('does not retry non-recommended searches when another backend error occurs', async () => {
    vi.mocked(propertyService.getProperties).mockRejectedValueOnce(new ApiRequestError('Search unavailable.', { code: 'CONTENT_QUERY_INVALID', status: 400 }));
    const { result } = renderHook(() => useProperties({ limit: 10 }));

    act(() => { result.current.applyFilters(new URLSearchParams('sort=newest')); });
    await waitFor(() => expect(result.current.error).toContain('CONTENT_QUERY_INVALID'));

    expect(propertyService.getProperties).toHaveBeenCalledOnce();
    expect(result.current.error).toContain('CONTENT_QUERY_INVALID');
  });

  it('passes the server normalized query and original request to the caller', async () => {
    const onNormalizationQuery = vi.fn();
    vi.mocked(propertyService.getProperties).mockResolvedValueOnce({
      ...response({ _id: 'normalized', title: 'Normalized result' } as Property),
      normalization: { queryVersion: 'canonical-v1', query: { queryVersion: 'canonical-v1', sort: 'newest', minPrice: 0, verified: false, amenities: ['pool', 'lift'] }, notices: [] },
    });
    const { result } = renderHook(() => useProperties({ limit: 10, onNormalizationQuery }));
    const request = new URLSearchParams('sort=recommended&amenities=pool&amenities=lift');

    act(() => { result.current.applyFilters(request); });
    await waitFor(() => expect(onNormalizationQuery).toHaveBeenCalledOnce());

    expect(onNormalizationQuery.mock.calls[0][0]).toMatchObject({ sort: 'newest', minPrice: 0, verified: false });
    expect(onNormalizationQuery.mock.calls[0][1]).toBeInstanceOf(URLSearchParams);
    expect((onNormalizationQuery.mock.calls[0][1] as URLSearchParams).get('page')).toBe('1');
  });

  it('clears search results and derived facets when the active profile context changes', async () => {
    vi.mocked(propertyService.getProperties).mockResolvedValueOnce({
      ...response({ _id: 'profile-result', title: 'Profile scoped result' } as Property),
      facets: { categories: { houses: 1 } },
      diagnostics: { state: 'zero_results', suggestions: [] },
    });
    const { result } = renderHook(() => useProperties({ limit: 10 }));
    act(() => { result.current.applyFilters(new URLSearchParams('fromAccountsIFollow=true')); });
    await waitFor(() => expect(result.current.properties).toHaveLength(1));
    expect(result.current.facets).toEqual({ categories: { houses: 1 } });

    act(() => { result.current.clearResults(); });
    expect(result.current.properties).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.facets).toBeNull();
    expect(result.current.diagnostics).toBeNull();
  });
});
