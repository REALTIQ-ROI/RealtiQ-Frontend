import api from "../lib/axios";
import type {
  FavouriteItem,
  Pagination,
  RecentlyViewedItem,
  SavedSearch,
  SavedSearchAlerts,
  SavedSearchFilters,
} from "../types";
export interface SavedSearchInput {
  name: string;
  filters: SavedSearchFilters;
  alerts?: SavedSearchAlerts;
}
export interface SavedSearchUpdateInput extends Partial<SavedSearchInput> { expectedConfigurationRevision?: number }
export interface FavouriteMutationResult {
  propertyReference: string;
  isFavourite: boolean;
  saves: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseSavedSearch = (value: unknown): SavedSearch => {
  if (
    !isRecord(value) ||
    typeof value._id !== 'string' ||
    typeof value.publicReference !== 'string' ||
    typeof value.name !== 'string' ||
    !isRecord(value.filters) ||
    !Number.isInteger(value.configurationRevision) ||
    (value.configurationRevision as number) < 0 ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    throw new Error('The saved-search response is missing documented revision or identity fields.');
  }
  return value as unknown as SavedSearch;
};

const parseSavedSearchEnvelope = (value: unknown): SavedSearch => {
  if (!isRecord(value) || !('savedSearch' in value)) {
    throw new Error('The saved-search response envelope is not available in a supported format.');
  }
  return parseSavedSearch(value.savedSearch);
};
const favouriteMutations = new Map<string, Promise<FavouriteMutationResult>>();
const mutateFavourite = (propertyId: string, value: boolean) => {
  const pending = favouriteMutations.get(propertyId);
  if (pending) return pending;
  const request = (
    value
      ? api.put<FavouriteMutationResult>(
          `/personalisation/favourites/${propertyId}`,
        )
      : api.delete<FavouriteMutationResult>(
          `/personalisation/favourites/${propertyId}`,
        )
  )
    .then(({ data }) => ({ ...data, saves: Math.max(0, data.saves) }))
    .finally(() => favouriteMutations.delete(propertyId));
  favouriteMutations.set(propertyId, request);
  return request;
};
export const personalisationService = {
  async favourites(page = 1, limit = 20) {
    const { data } = await api.get<{
      favourites: FavouriteItem[];
      pagination: Pagination;
    }>("/personalisation/favourites", { params: { page, limit } });
    return data;
  },
  setFavourite(propertyId: string, value: boolean) {
    return mutateFavourite(propertyId, value);
  },
  async updateFavourite(propertyId: string, input: Record<string, unknown>) {
    const { data } = await api.patch<FavouriteMutationResult>(
      `/personalisation/favourites/${propertyId}`,
      input,
    );
    return { ...data, saves: Math.max(0, data.saves) };
  },
  async recent(page = 1, limit = 20) {
    const { data } = await api.get<{
      recentlyViewed: RecentlyViewedItem[];
      pagination: Pagination;
    }>("/personalisation/recent", { params: { page, limit } });
    return data;
  },
  async recordRecent(propertyId: string) {
    await api.post(`/personalisation/recent/${propertyId}`);
  },
  async removeRecent(propertyId: string) {
    const { data } = await api.delete<{ removed: boolean }>(
      `/personalisation/recent/${propertyId}`,
    );
    return data;
  },
  async clearRecent() {
    const { data } = await api.delete<{ deletedCount: number }>(
      "/personalisation/recent",
    );
    return data;
  },
  async searches(page = 1, limit = 20) {
    const { data } = await api.get<{
      savedSearches: SavedSearch[];
      pagination: Pagination;
    }>("/personalisation/searches", { params: { page, limit } });
    if (!isRecord(data) || !Array.isArray(data.savedSearches)) {
      throw new Error('The saved-search list response is not available in a supported format.');
    }
    return { ...data, savedSearches: data.savedSearches.map(parseSavedSearch) };
  },
  async createSearch(input: SavedSearchInput) {
    const { data } = await api.post<{ savedSearch: SavedSearch }>(
      "/personalisation/searches",
      input,
    );
    return parseSavedSearchEnvelope(data);
  },
  async getSearch(id: string) {
    const { data } = await api.get<{ savedSearch: SavedSearch }>(
      `/personalisation/searches/${id}`,
    );
    return parseSavedSearchEnvelope(data);
  },
  async updateSearch(id: string, input: SavedSearchUpdateInput) {
    const { data } = await api.patch<{ savedSearch: SavedSearch }>(
      `/personalisation/searches/${id}`,
      input,
    );
    return parseSavedSearchEnvelope(data);
  },
  async deleteSearch(id: string) {
    await api.delete(`/personalisation/searches/${id}`);
  },
};
