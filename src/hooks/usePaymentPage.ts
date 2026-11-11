import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { paymentService } from '../services/paymentService';
import type { ApiPayment } from '../types';

/** Private payment pages use server pagination and discard stale profile/page reads. */
export const usePaymentPage = () => {
  const { activeProfile, token } = useAuth();
  const profileId = activeProfile?.id;
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ payments: ApiPayment[]; page: number; limit: number; total: number | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const execute = useCallback(async () => {
    if (!profileId || !token) { setData(null); setLoading(false); setError(null); return null; }
    const version = ++requestVersion.current;
    setLoading(true); setError(null);
    try {
      const result = await paymentService.getPaymentsPage(page, 20);
      if (version !== requestVersion.current || localStorage.getItem('activeProfileId') !== profileId) return null;
      setData(result);
      return result;
    } catch (raw) {
      if (version === requestVersion.current && localStorage.getItem('activeProfileId') === profileId) {
        setData(null); setError(raw instanceof Error ? raw.message : 'Unable to load payments.');
      }
      return null;
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, [page, profileId, token]);

  useEffect(() => { setPage(1); setData(null); requestVersion.current += 1; }, [profileId, token]);
  useEffect(() => { void execute(); return () => { requestVersion.current += 1; }; }, [execute]);
  return { data, loading, error, execute, page, setPage };
};
