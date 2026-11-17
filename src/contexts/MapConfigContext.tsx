import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { mapsConfigService, type MapsConfig } from '../services/mapsConfigService';
import { hasMapProviderCredential } from '../config/maps';
import { ApiRequestError } from '../lib/axios';

type MapConfigState =
  | { status: 'loading'; config: null; error: null }
  | { status: 'error'; config: null; error: string }
  | { status: 'ready'; config: MapsConfig; error: null };

interface MapConfigContextValue {
  state: MapConfigState;
  refresh: () => Promise<MapsConfig | null>;
  hasCredential: typeof hasMapProviderCredential;
}

const MapConfigContext = createContext<MapConfigContextValue>({
  state: { status: 'loading', config: null, error: null },
  refresh: async () => null,
  hasCredential: hasMapProviderCredential,
});

export const MapConfigProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<MapConfigState>({ status: 'loading', config: null, error: null });

  const refresh = useCallback(async () => {
    setState((current) => current.status === 'ready'
      ? current
      : { status: 'loading', config: null, error: null });
    try {
      const config = await mapsConfigService.get();
      setState({ status: 'ready', config, error: null });
      return config;
    } catch (error) {
      const requestId = error instanceof ApiRequestError && error.requestId ? ` Support reference: ${error.requestId}.` : '';
      setState({ status: 'error', config: null, error: `Map settings could not be loaded. Search results remain available.${requestId}` });
      return null;
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const value = useMemo(() => ({ state, refresh, hasCredential: hasMapProviderCredential }), [state, refresh]);
  return <MapConfigContext.Provider value={value}>{children}</MapConfigContext.Provider>;
};

export const useMapConfig = (): MapConfigContextValue => {
  return useContext(MapConfigContext);
};

