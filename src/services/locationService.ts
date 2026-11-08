import api, { ApiRequestError } from '../lib/axios';

export type LocationSuggestionLevel = 'state' | 'lga' | 'area' | 'estate';
export interface LocationSuggestion {
  id: string;
  level: LocationSuggestionLevel;
  name: string;
  parentId: string | null;
  breadcrumbs: Array<{ id: string; level: LocationSuggestionLevel; name: string }>;
  publishedStockCount: number;
  revision?: number;
}

export interface GazetteerStatus {
  state: 'configured' | 'unconfigured' | 'unavailable' | (string & {});
  revision: number;
  errorCode?: string | null;
  activeDataset?: { sourceKind: string; rowCount: number; digest: string; approvedAt: string } | null;
}

export interface ResolvedLocation extends LocationSuggestion {
  revision: number;
}

export type LocationCascadeSelection = Partial<Record<LocationSuggestionLevel, ResolvedLocation>>;

export const locationSuggestionFailureMessage = (error: unknown): string => {
  if (error instanceof ApiRequestError && ['FEATURE_SEARCH_GAZETTEER_UNCONFIGURED', 'FEATURE_SEARCH_LOCATION_PROVIDER_UNAVAILABLE', 'FEATURE_SEARCH_GAZETTEER_SOURCE_UNAVAILABLE'].includes(error.code ?? '')) {
    return 'The location directory is unavailable. Your current draft has been kept; no guessed location was selected.';
  }
  if (error instanceof ApiRequestError && error.code === 'CONTENT_LOCATION_NOT_FOUND') {
    return 'This location is no longer in the active directory. Select a current location before saving.';
  }
  return error instanceof Error ? error.message : 'Location suggestions are unavailable.';
};

export const locationService = {
  async gazetteerStatus(signal?: AbortSignal): Promise<GazetteerStatus> {
    const { data } = await api.get<GazetteerStatus>('/locations/gazetteer/status', { signal });
    return data;
  },

  async suggestions(input: { level: LocationSuggestionLevel; q: string; parentId?: string; limit?: number }, signal?: AbortSignal) {
    const query = input.q.trim();
    if (query.length < 2 || query.length > 80) throw new Error('Search text must be between 2 and 80 characters.');
    if (input.level !== 'state' && !input.parentId) throw new Error('Select the parent location before searching this level.');
    const { data } = await api.get<{ suggestions: LocationSuggestion[]; revision: number }>('/locations/suggestions', {
      params: { ...input, q: query },
      signal,
    });
    return { ...data, suggestions: data.suggestions.map((suggestion) => ({ ...suggestion, revision: data.revision })) };
  },

  async resolve(id: string, signal?: AbortSignal): Promise<{ location: ResolvedLocation }> {
    const { data } = await api.get<{ location: ResolvedLocation }>(`/locations/${encodeURIComponent(id)}`, { signal });
    return data;
  },
};

const cascadeLevels: LocationSuggestionLevel[] = ['state', 'lga', 'area', 'estate'];

/** Re-resolve selected IDs against the current dataset before a form submits them. */
export const resolveCurrentLocationCascade = async (selection: LocationCascadeSelection): Promise<LocationCascadeSelection> => {
  if (!cascadeLevels.some((level) => selection[level])) return {};
  const status = await locationService.gazetteerStatus();
  if (status.state !== 'configured') throw new Error(locationSuggestionFailureMessage(new ApiRequestError('The location directory is unavailable.', { status: 503, code: status.errorCode ?? 'FEATURE_SEARCH_GAZETTEER_UNCONFIGURED' })));
  const resolved: LocationCascadeSelection = {};
  for (const level of cascadeLevels) {
    const selected = selection[level];
    if (!selected) continue;
    const parentLevel = cascadeLevels[cascadeLevels.indexOf(level) - 1];
    const parent = parentLevel ? resolved[parentLevel] : undefined;
    if (level !== 'state' && !parent) throw new Error(`Select a current ${parentLevel} before submitting ${level}.`);
    const { location } = await locationService.resolve(selected.id);
    if (location.level !== level || (level !== 'state' && location.parentId !== parent?.id)) {
      throw new Error(`The selected ${level} is no longer under its current parent. Choose it again from the location directory.`);
    }
    resolved[level] = location;
  }
  return resolved;
};
