import api from '../lib/axios';
import type {
  MediaItem,
  Property,
  PropertyCategory,
  PropertyCompletionStage,
  PropertyCoordinates,
  PropertyCurrency,
  PropertyFilters,
  PropertyStatus,
  PropertyType,
} from '../types';

export interface CreatePropertyPayload {
  title: string;
  price: number;
  location: string;
  propertyType: PropertyType | string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  description: string;
  amenities?: string[];
  media: MediaItem[];
  category?: PropertyCategory;
  completionStage?: PropertyCompletionStage;
  currency?: PropertyCurrency;
  coordinates?: PropertyCoordinates | null;
  status?: PropertyStatus;
}

export interface UpdatePropertyPayload extends Partial<CreatePropertyPayload> {
  status?: PropertyStatus;
  featured?: boolean;
}

export interface PropertiesResponse {
  properties: Property[];
  total: number;
  page: number;
  limit: number;
}

export interface MediaUploadResponse {
  media: MediaItem[];
}

export interface BuyPropertyResponse {
  redirectUrl: string;
  reference: string;
}

export type PropertyFiltersQuery = PropertyFilters;

export interface NearbyPropertySummary {
  _id: string;
  title: string;
  coordinates?: PropertyCoordinates | null;
}

export interface PropertySaveResponse {
  message?: string;
  saves?: number;
  saved?: boolean;
}

export interface PropertyViewResponse {
  message?: string;
  views?: number;
}

export const propertyService = {
  async getProperties(filters?: PropertyFiltersQuery): Promise<PropertiesResponse> {
    const { data } = await api.get<PropertiesResponse>('/properties', { params: filters });
    return data;
  },

  async getPropertyById(id: string): Promise<Property> {
    const { data } = await api.get<Property>(`/properties/${id}`);
    return data;
  },

  async createProperty(payload: CreatePropertyPayload): Promise<Property> {
    const { data } = await api.post<Property>('/properties', payload);
    return data;
  },

  async updateProperty(id: string, payload: UpdatePropertyPayload): Promise<Property> {
    const { data } = await api.patch<Property>(`/properties/${id}`, payload);
    return data;
  },

  async deleteProperty(id: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(`/properties/${id}`);
    return data;
  },

  async buyProperty(id: string): Promise<BuyPropertyResponse> {
    const { data } = await api.post<BuyPropertyResponse>(`/properties/${id}/buy`);
    return data;
  },

  async toggleFeatured(id: string, featured: boolean): Promise<{ _id: string; featured: boolean }> {
    const { data } = await api.patch<{ _id: string; featured: boolean }>(`/properties/${id}/featured`, {
      featured,
    });
    return data;
  },

  async incrementView(id: string): Promise<PropertyViewResponse> {
    const { data } = await api.post<PropertyViewResponse>(`/properties/${id}/view`);
    return data;
  },

  async saveProperty(id: string): Promise<PropertySaveResponse> {
    const { data } = await api.post<PropertySaveResponse>(`/properties/${id}/save`);
    return data;
  },

  async getNearbyProperties(
    params: Required<Pick<PropertyCoordinates, 'lat' | 'lng'>> & { radius: number },
  ): Promise<NearbyPropertySummary[]> {
    const { data } = await api.get<NearbyPropertySummary[]>('/properties/map/nearby', { params });
    return data;
  },

  async uploadMedia(files: File[], onProgress?: (percent: number) => void): Promise<MediaUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const { data } = await api.post<MediaUploadResponse>('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });
    return data;
  },

  // Legacy shim kept so existing callers continue to compile while they are migrated.
  async addProperty(_ownerId: string, payload: CreatePropertyPayload): Promise<Property> {
    return propertyService.createProperty(payload);
  },
};
