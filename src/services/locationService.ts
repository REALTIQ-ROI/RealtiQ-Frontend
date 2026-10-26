import api, { ApiRequestError } from '../lib/axios';

export type LocationSuggestionLevel = 'state' | 'lga' | 'area' | 'estate';
export interface LocationSuggestion {
  id: string;
  level: LocationSuggestionLevel;
  name: string;
  parentId: string | null;
  breadcrumbs: Array<{ id: string; level: LocationSuggestionLevel; name: string }>;
  publishedStockCount: number;
}

export const locationSuggestionFailureMessage = (error: unknown): string => {
  if (error instanceof ApiRequestError && error.code === 'FEATURE_SEARCH_GAZETTEER_UNCONFIGURED') {
    return 'Location suggestions are unavailable because the approved gazetteer is not active. No canonical location ID was selected.';
  }
  return error instanceof Error ? error.message : 'Location suggestions are unavailable.';
};

export const locationService = {
  async suggestions(input: { level: LocationSuggestionLevel; q: string; parentId?: string; limit?: number }, signal?: AbortSignal) {
    const { data } = await api.get<{ suggestions: LocationSuggestion[]; revision: number }>('/locations/suggestions', {
      params: input,
      signal,
    });
    return data;
  },
};
