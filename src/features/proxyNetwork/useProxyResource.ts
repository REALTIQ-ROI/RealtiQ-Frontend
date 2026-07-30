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
  const pollRef = useRef(options?.poll);
  const pollCountRef = useRef(0);
  loaderRef.current = loader;
  pollRef.current = options?.poll;

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
    pollCountRef.current = 0;
  }, [load]);
  useEffect(() => {
    const shouldPoll = pollRef.current;
    if (!shouldPoll?.(data) || document.hidden || !navigator.onLine) {
      pollCountRef.current = 0;
      return;
    }
    const delays = [2000, 4000, 8000, 15000, 30000];
    if (pollCountRef.current >= delays.length) return;
    const delay = delays[Math.min(pollCountRef.current, delays.length - 1)];
    const timer = window.setTimeout(async () => {
      if (document.hidden || !navigator.onLine || pollCountRef.current >= delays.length) return;
      pollCountRef.current += 1;
      await load(true);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [data, load]);
  return { data, loading, refreshing, error, status: error instanceof ApiRequestError ? error.status : undefined, reload: () => load(false) };
};
