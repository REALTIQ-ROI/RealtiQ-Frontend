import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '../../lib/axios';
import { PROXY_DATA_CHANGED } from './cache';

export const useProxyResource = <T,>(
  loader: (signal: AbortSignal) => Promise<T>,
  dependencies: unknown[],
  options?: { poll?: (data: T | null) => boolean },
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const load = useCallback(async (silent = false) => {
    const controller = new AbortController();
    if (silent) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const next = await loaderRef.current(controller.signal);
      setData(next);
      return next;
    } catch (raw) {
      if (!controller.signal.aborted) setError(raw instanceof Error ? raw : new Error('Unable to load this page.'));
      return null;
    } finally {
      setLoading(false); setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => void load(true);
    window.addEventListener(PROXY_DATA_CHANGED, refresh);
    return () => window.removeEventListener(PROXY_DATA_CHANGED, refresh);
  }, [load]);
  useEffect(() => {
    if (!options?.poll?.(data) || document.hidden || !navigator.onLine) return;
    let count = 0;
    const delays = [2000, 4000, 8000, 15000, 30000];
    let timer = 0;
    const tick = async () => {
      if (document.hidden || !navigator.onLine || count >= delays.length) return;
      const next = await load(true);
      count += 1;
      if (options.poll?.(next)) timer = window.setTimeout(tick, delays[Math.min(count, delays.length - 1)]);
    };
    timer = window.setTimeout(tick, delays[0]);
    return () => window.clearTimeout(timer);
  }, [data, load, options]);
  return { data, loading, refreshing, error, status: error instanceof ApiRequestError ? error.status : undefined, reload: () => load(false) };
};
