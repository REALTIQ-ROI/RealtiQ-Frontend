import { useEffect, useState } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export const useAsync = <T,>(asyncFn: () => Promise<T>, immediate = true) => {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = async () => {
    setState((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const data = await asyncFn();
      setState({ data, loading: false, error: null });
      return data;
    } catch {
      setState({ data: null, loading: false, error: 'Something went wrong. Please try again.' });
      return null;
    }
  };

  useEffect(() => {
    if (immediate) {
      void execute();
    }
  }, [immediate]);

  return { ...state, execute };
};