import { useCallback, useEffect, useState } from 'react';
import { canonicalFieldService, type CanonicalFieldDictionary } from '../services/canonicalFieldService';

export const useCanonicalFieldDictionary = () => {
  const [dictionary, setDictionary] = useState<CanonicalFieldDictionary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    canonicalFieldService.getDictionary(refreshVersion > 0)
      .then((value) => { if (active) { setDictionary(value); setError(null); } })
      .catch((raw: unknown) => { if (active) setError(raw instanceof Error ? raw.message : 'Canonical field metadata is unavailable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshVersion]);

  const refresh = useCallback(() => setRefreshVersion((version) => version + 1), []);
  return { dictionary, loading, error, refresh };
};
