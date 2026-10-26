import api from '../lib/axios';

export type LocationSuggestionLevel = 'state' | 'lga' | 'area' | 'estate';
export interface LocationSuggestion {
  id: string;
  level: LocationSuggestionLevel;
  name: string;
  parentId: string | null;
  breadcrumbs: Array<{ id: string; level: LocationSuggestionLevel; name: string }>;
  publishedStockCount: number;
}

export const locationService = {
  async suggestions(input: { level: LocationSuggestionLevel; q: string; parentId?: string; limit?: number }, signal?: AbortSignal) {
    const { data } = await api.get<{ suggestions: LocationSuggestion[]; revision: number }>('/locations/suggestions', {
      params: input,
      signal,
    });
    return data;
  },
};
