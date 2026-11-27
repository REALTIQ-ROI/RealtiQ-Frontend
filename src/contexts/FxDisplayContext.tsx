import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useCanonicalFieldDictionary } from '../hooks/useCanonicalFieldDictionary';
import { officialFxRateFromDictionary, type DisplayCurrency, type OfficialFxRate } from '../utils/fxDisplay';

const STORAGE_KEY = 'realtiq:display-currency:v1';

interface FxDisplayContextValue {
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (currency: DisplayCurrency) => void;
  officialRate: OfficialFxRate | null;
  loading: boolean;
  error: string | null;
  configurationState: string | null;
  refreshFx: () => void;
}

const FxDisplayContext = createContext<FxDisplayContextValue>({
  displayCurrency: null,
  setDisplayCurrency: () => undefined,
  officialRate: null,
  loading: true,
  error: null,
  configurationState: null,
  refreshFx: () => undefined,
});

const readCurrency = (): DisplayCurrency => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'NGN' || value === 'USD' ? value : null;
  } catch { return null; }
};

export const FxDisplayProvider = ({ children }: { children: ReactNode }) => {
  const { dictionary, loading, error, refresh } = useCanonicalFieldDictionary();
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>(readCurrency);
  const previouslyHidden = useRef(false);
  const fxConfiguration = dictionary?.configuration.fx;
  const officialRate = useMemo(() => officialFxRateFromDictionary(dictionary), [dictionary]);

  const setDisplayCurrency = useCallback((currency: DisplayCurrency) => {
    setDisplayCurrencyState(currency);
    try {
      if (currency) localStorage.setItem(STORAGE_KEY, currency);
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* Display preference remains active for this session. */ }
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) { previouslyHidden.current = true; return; }
      if (previouslyHidden.current) {
        previouslyHidden.current = false;
        refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [refresh]);

  const value = useMemo<FxDisplayContextValue>(() => ({
    displayCurrency,
    setDisplayCurrency,
    officialRate,
    loading,
    error,
    configurationState: fxConfiguration?.state ?? null,
    refreshFx: refresh,
  }), [displayCurrency, error, fxConfiguration?.state, loading, officialRate, refresh, setDisplayCurrency]);

  return <FxDisplayContext.Provider value={value}>{children}</FxDisplayContext.Provider>;
};

export const useFxDisplay = (): FxDisplayContextValue => {
  return useContext(FxDisplayContext);
};
