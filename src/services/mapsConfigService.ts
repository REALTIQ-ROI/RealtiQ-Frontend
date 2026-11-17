import api, { type AuthlessRequestConfig } from '../lib/axios';

export type MapProviderId = 'google_maps' | 'mapbox';

export interface SupportedMapProvider {
  id: MapProviderId;
  label: string;
}

export interface MapsConfig {
  provider: MapProviderId;
  selectionSource: 'default' | 'console_policy';
  policyRevision: number;
  supportedProviders: SupportedMapProvider[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseMapsConfig = (value: unknown): MapsConfig => {
  if (!isRecord(value) || !Array.isArray(value.supportedProviders)) {
    throw new Error('The map configuration response is not available in a supported format.');
  }
  const providers = value.supportedProviders.filter((provider): provider is SupportedMapProvider =>
    isRecord(provider) && (provider.id === 'google_maps' || provider.id === 'mapbox') && typeof provider.label === 'string');
  if (
    (value.provider !== 'google_maps' && value.provider !== 'mapbox') ||
    (value.selectionSource !== 'default' && value.selectionSource !== 'console_policy') ||
    !Number.isInteger(value.policyRevision) || (value.policyRevision as number) < 0 ||
    providers.length !== value.supportedProviders.length || !providers.some((provider) => provider.id === value.provider)
  ) {
    throw new Error('The map configuration response is not available in a supported format.');
  }
  return {
    provider: value.provider,
    selectionSource: value.selectionSource,
    policyRevision: value.policyRevision as number,
    supportedProviders: providers,
  };
};

export const mapsConfigService = {
  async get(): Promise<MapsConfig> {
    const { data } = await api.get<unknown>('/maps/config', {
      headers: { 'Cache-Control': 'no-store' },
      skipAuth: true,
    } as AuthlessRequestConfig);
    return parseMapsConfig(data);
  },
};

