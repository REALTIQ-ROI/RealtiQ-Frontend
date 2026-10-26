import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Property } from '../types';
import type { PropertiesResponse } from '../services/propertyService';
import { propertyService } from '../services/propertyService';
import { useProperties } from './useProperties';

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
});
