import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useProxyResource } from './useProxyResource';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

describe('useProxyResource request lifecycle', () => {
  it('aborts superseded profile requests and ignores their late responses', async () => {
    const first = deferred<{ profileId: string }>();
    const second = deferred<{ profileId: string }>();
    let firstSignal: AbortSignal | undefined;
    const loader = (profileId: string) => (signal: AbortSignal) => {
      if (profileId === 'profile-a') {
        firstSignal = signal;
        return first.promise;
      }
      return second.promise;
    };

    const { result, rerender } = renderHook(
      ({ profileId }) => useProxyResource(loader(profileId), [profileId]),
      { initialProps: { profileId: 'profile-a' } },
    );
    await waitFor(() => expect(firstSignal).toBeDefined());

    rerender({ profileId: 'profile-b' });
    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(firstSignal?.aborted).toBe(true);

    await act(async () => second.resolve({ profileId: 'profile-b' }));
    await waitFor(() => expect(result.current.data).toEqual({ profileId: 'profile-b' }));
    await act(async () => first.resolve({ profileId: 'profile-a' }));
    expect(result.current.data).toEqual({ profileId: 'profile-b' });
  });
});
