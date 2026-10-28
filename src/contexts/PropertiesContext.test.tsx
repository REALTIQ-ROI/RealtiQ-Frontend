import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Property } from '../types';
import type { PropertiesResponse } from '../services/propertyService';
import { propertyService } from '../services/propertyService';
import { PropertiesProvider, useProperties } from './PropertiesContext';

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock('./AuthContext', () => ({ useAuth: useAuthMock }));
vi.mock('../services/propertyService', () => ({
  propertyService: {
    getProperties: vi.fn(),
    getMyProperties: vi.fn(),
    createPropertyWithResponse: vi.fn(),
    updateProperty: vi.fn(),
    deleteProperty: vi.fn(),
  },
}));

const wrapper = ({ children }: PropsWithChildren) => <PropertiesProvider>{children}</PropertiesProvider>;
const makeProperty = (id: string) => ({ _id: id, title: id } as Property);
const makeResponse = (properties: Property[], page: number, total: number, limit = 100): PropertiesResponse => ({
  properties,
  page,
  total,
  limit,
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
};

describe('PropertiesProvider pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: { _id: 'user-1', role: 'buyer' },
      token: 'session-1',
      activeProfile: { id: 'profile-1' },
    });
    vi.mocked(propertyService.getProperties).mockResolvedValue(makeResponse([], 1, 0));
    vi.mocked(propertyService.getMyProperties).mockResolvedValue(makeResponse([], 1, 0, 20));
  });

  it('loads multiple valid-size pages and stops at the requested total', async () => {
    const { result } = renderHook(() => useProperties(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    vi.mocked(propertyService.getProperties).mockClear().mockImplementation(async (query) => {
      const page = Number((query as { page: number }).page);
      const ids = page === 1
        ? Array.from({ length: 100 }, (_, index) => `property-${index + 1}`)
        : Array.from({ length: 100 }, (_, index) => `property-${index + 51}`);
      return makeResponse(ids.map(makeProperty), page, 1_000);
    });

    await act(async () => { await result.current.refreshProperties(150); });

    expect(propertyService.getProperties).toHaveBeenCalledTimes(2);
    expect(propertyService.getProperties).toHaveBeenNthCalledWith(1, { page: 1, limit: 100 });
    expect(propertyService.getProperties).toHaveBeenNthCalledWith(2, { page: 2, limit: 100 });
    for (const [query] of vi.mocked(propertyService.getProperties).mock.calls) {
      expect((query as { limit: number }).limit).toBeLessThanOrEqual(100);
    }
    expect(result.current.properties).toHaveLength(150);
    expect(new Set(result.current.properties.map((property) => property._id)).size).toBe(150);
  });

  it('stops when the backend reports there are no more properties', async () => {
    const { result } = renderHook(() => useProperties(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    vi.mocked(propertyService.getProperties).mockClear().mockResolvedValue(
      makeResponse(Array.from({ length: 37 }, (_, index) => makeProperty(`property-${index + 1}`)), 1, 37),
    );

    await act(async () => { await result.current.refreshProperties(500); });

    expect(propertyService.getProperties).toHaveBeenCalledTimes(1);
    expect(propertyService.getProperties).toHaveBeenCalledWith({ page: 1, limit: 100 });
    expect(result.current.properties).toHaveLength(37);
  });

  it('keeps landlord loading on the owner endpoint and its 20-item pages', async () => {
    useAuthMock.mockReturnValue({
      user: { _id: 'user-1', role: 'landlord' },
      token: 'session-1',
      activeProfile: { id: 'profile-1' },
    });
    vi.mocked(propertyService.getMyProperties)
      .mockResolvedValueOnce(makeResponse(Array.from({ length: 20 }, (_, index) => makeProperty(`owned-${index + 1}`)), 1, 25, 20))
      .mockResolvedValueOnce(makeResponse(Array.from({ length: 5 }, (_, index) => makeProperty(`owned-${index + 21}`)), 2, 25, 20));

    const { result } = renderHook(() => useProperties(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(propertyService.getMyProperties).toHaveBeenNthCalledWith(1, 1, 20);
    expect(propertyService.getMyProperties).toHaveBeenNthCalledWith(2, 2, 20);
    expect(propertyService.getProperties).not.toHaveBeenCalled();
    expect(result.current.properties).toHaveLength(25);
  });

  it('ignores a pending response from the previous profile', async () => {
    const previousProfile = deferred<PropertiesResponse>();
    const currentProfile = deferred<PropertiesResponse>();
    vi.mocked(propertyService.getProperties)
      .mockReturnValueOnce(previousProfile.promise)
      .mockReturnValueOnce(currentProfile.promise);
    const { result, rerender } = renderHook(() => useProperties(), { wrapper });
    await waitFor(() => expect(propertyService.getProperties).toHaveBeenCalledTimes(1));

    useAuthMock.mockReturnValue({
      user: { _id: 'user-1', role: 'buyer' },
      token: 'session-1',
      activeProfile: { id: 'profile-2' },
    });
    rerender();
    await waitFor(() => expect(propertyService.getProperties).toHaveBeenCalledTimes(2));

    await act(async () => {
      currentProfile.resolve(makeResponse([makeProperty('current-profile-property')], 1, 1));
      await currentProfile.promise;
    });
    await act(async () => {
      previousProfile.resolve(makeResponse([makeProperty('old-profile-property')], 1, 1));
      await previousProfile.promise;
    });

    expect(result.current.properties.map((property) => property._id)).toEqual(['current-profile-property']);
    expect(result.current.loading).toBe(false);
  });
});
