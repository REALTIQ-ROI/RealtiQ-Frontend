import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ExecuteOptions {
  silent?: boolean;
}

export const useAsync = <T,>(asyncFn: () => Promise<T>, immediate = true) => {
  const asyncFnRef = useRef(asyncFn);
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  useEffect(() => {
    asyncFnRef.current = asyncFn;
  }, [asyncFn]);

  const execute = useCallback(async (options?: ExecuteOptions) => {
    const silent = options?.silent === true;
    if (!silent) {
      setState((previous) => ({ ...previous, loading: true, error: null }));
    }

    try {
      const data = await asyncFnRef.current();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      if (!silent) {
        setState({ data: null, loading: false, error: message });
      }
      return null;
    }
  }, []);

  useEffect(() => {
    if (immediate) {
      queueMicrotask(() => {
        void execute();
      });
    }
  }, [execute, immediate]);

  return { ...state, execute };
};
