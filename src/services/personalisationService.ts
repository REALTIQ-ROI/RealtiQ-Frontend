import api from '../lib/axios';
import type { FavouriteItem, Pagination, RecentlyViewedItem, SavedSearch, SavedSearchAlerts, SavedSearchFilters } from '../types';
export interface SavedSearchInput { name: string; filters: SavedSearchFilters; alerts: SavedSearchAlerts }
export const personalisationService = {
  async favourites(page = 1, limit = 20) { const { data } = await api.get<{ favourites: FavouriteItem[]; pagination: Pagination }>('/personalisation/favourites', { params: { page, limit } }); return data; },
  async setFavourite(propertyId: string, value: boolean) { const response = value ? await api.put(`/personalisation/favourites/${propertyId}`) : await api.delete(`/personalisation/favourites/${propertyId}`); return response.data as { propertyReference: string; isFavourite: boolean }; },
  async recent(page = 1, limit = 20) { const { data } = await api.get<{ recentlyViewed: RecentlyViewedItem[]; pagination: Pagination }>('/personalisation/recent', { params: { page, limit } }); return data; },
  async recordRecent(propertyId: string) { await api.post(`/personalisation/recent/${propertyId}`); },
  async removeRecent(propertyId: string) { const { data } = await api.delete<{ removed: boolean }>(`/personalisation/recent/${propertyId}`); return data; },
  async clearRecent() { const { data } = await api.delete<{ deletedCount: number }>('/personalisation/recent'); return data; },
  async searches(page = 1, limit = 20) { const { data } = await api.get<{ savedSearches: SavedSearch[]; pagination: Pagination }>('/personalisation/searches', { params: { page, limit } }); return data; },
  async createSearch(input: SavedSearchInput) { const { data } = await api.post<{ savedSearch: SavedSearch }>('/personalisation/searches', input); return data.savedSearch; },
  async getSearch(id: string) { const { data } = await api.get<{ savedSearch: SavedSearch }>(`/personalisation/searches/${id}`); return data.savedSearch; },
  async updateSearch(id: string, input: Partial<SavedSearchInput>) { const { data } = await api.patch<{ savedSearch: SavedSearch }>(`/personalisation/searches/${id}`, input); return data.savedSearch; },
  async deleteSearch(id: string) { await api.delete(`/personalisation/searches/${id}`); },
};
