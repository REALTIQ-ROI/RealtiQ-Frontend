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

  it('falls back from unavailable recommended weights to newest and informs the caller', async () => {
    const fallbackNotice = vi.fn();
    vi.mocked(propertyService.getProperties)
      .mockRejectedValueOnce(new ApiRequestError('Recommended weights are not configured.', { code: 'RECOMMENDED_WEIGHTS_UNCONFIGURED', status: 503 }))
      .mockResolvedValueOnce(response({ _id: 'newest-property', title: 'Newest property' } as Property));
    const { result } = renderHook(() => useProperties({ limit: 10, onRecommendedUnavailable: fallbackNotice }));

    act(() => { result.current.applyFilters(new URLSearchParams('search=lagos')); });
    await waitFor(() => expect(propertyService.getProperties).toHaveBeenCalledTimes(2));

    expect(propertyService.getProperties).toHaveBeenCalledTimes(2);
    const fallbackQuery = vi.mocked(propertyService.getProperties).mock.calls[1][0] as URLSearchParams;
    expect(fallbackQuery.get('search')).toBe('lagos');
    expect(fallbackQuery.get('sort')).toBe('newest');
    expect(fallbackQuery.get('page')).toBe('1');
    expect(fallbackQuery.get('limit')).toBe('10');
    expect(fallbackNotice).toHaveBeenCalledOnce();
    expect(result.current.properties.map((property) => property._id)).toEqual(['newest-property']);
    expect(result.current.notices).toContain('Recommended sorting is unavailable right now. Showing newest properties instead.');
    expect(result.current.error).toBeNull();
  });

  it('does not retry non-recommended searches when another backend error occurs', async () => {
    vi.mocked(propertyService.getProperties).mockRejectedValueOnce(new ApiRequestError('Search unavailable.', { code: 'CONTENT_QUERY_INVALID', status: 400 }));
    const { result } = renderHook(() => useProperties({ limit: 10 }));

    act(() => { result.current.applyFilters(new URLSearchParams('sort=newest')); });
    await waitFor(() => expect(result.current.error).toContain('CONTENT_QUERY_INVALID'));

    expect(propertyService.getProperties).toHaveBeenCalledOnce();
    expect(result.current.error).toContain('CONTENT_QUERY_INVALID');
  });
});
