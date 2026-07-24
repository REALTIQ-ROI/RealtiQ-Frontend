import api from '../lib/axios';
import type {
  MediaItem,
  Property,
  PropertyApprovalStatus,
  PropertyCategory,
  PropertyCompletionStage,
  PropertyCoordinates,
  PropertyCurrency,
  PropertyFilters,
  PropertyPaymentType,
  PropertyStatus,
  PropertyType,
  TitleDocumentRecord,
  TitleDocumentPolicyMode,
  TitleDocumentType,
  TitleVerification,
} from '../types';
import { normalizePropertyPaymentTypes } from '../utils/propertyPaymentTypes';

export interface TitleDocumentUploadMetadata {
  assetId: string;
  title: string;
  documentType: TitleDocumentType;
  accessPolicy: {
    enabled: boolean;
    mode: TitleDocumentPolicyMode;
  };
}

export interface CreatePropertyPayload {
  title: string;
  price: number;
  paymentTypes: PropertyPaymentType[];
  location: string;
  propertyType: PropertyType | string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet: number;
  description: string;
  amenities?: string[];
  media: MediaItem[];
  category?: PropertyCategory;
  completionStage?: PropertyCompletionStage;
  currency?: PropertyCurrency;
  coordinates?: PropertyCoordinates | null;
  status?: PropertyStatus;
  titleDocuments?: TitleDocumentUploadMetadata[];
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
  url?: string;
}

export interface CreatePropertyResponse {
  property: Property;
  titleDocuments?: TitleDocumentRecord[];
  titleVerifications?: TitleVerification[];
  riskDetected?: boolean;
  message?: string;
}

export interface BuyPropertyResponse {
  redirectUrl: string;
  reference: string;
}

export type PropertyFiltersQuery = PropertyFilters;

export interface NearbyPropertySummary {
  _id?: string;
  publicReference?: string | null;
  title: string;
  coordinates?: PropertyCoordinates | null;
  paymentTypes?: PropertyPaymentType[];
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

export interface PropertyOwnerDetailResponse {
  property: Property;
  titleDocuments?: TitleDocumentRecord[];
  titleDocumentEditPolicy?: string;
}

export interface PropertyApprovalDetailResponse {
  property: Property;
  titleDocumentStatus?: string;
  canApproveWithoutTitleDocument?: boolean;
  titleDocuments?: TitleDocumentRecord[];
}

export interface PropertyApprovalInput {
  decision: 'approve' | 'reject';
  rejectionReason?: string;
}

const normalizeProperty = (property: Property): Property => ({
  ...property,
  paymentTypes: normalizePropertyPaymentTypes(property.paymentTypes, property.price),
});

const normalizePropertiesResponse = (response: PropertiesResponse): PropertiesResponse => ({
  ...response,
  properties: response.properties.map(normalizeProperty),
});

export const propertyService = {
  async getProperties(filters?: PropertyFiltersQuery): Promise<PropertiesResponse> {
    const { data } = await api.get<PropertiesResponse>('/properties', { params: filters });
    return normalizePropertiesResponse(data);
  },

  async listPublicProperties(filters?: PropertyFiltersQuery): Promise<PropertiesResponse> {
    return propertyService.getProperties(filters);
  },

  async getPropertyById(id: string): Promise<Property> {
    const { data } = await api.get<Property>(`/properties/${id}`);
    return normalizeProperty(data);
  },

  async getPublicProperty(publicReference: string): Promise<Property> {
    return propertyService.getPropertyById(publicReference);
  },

  async createProperty(payload: CreatePropertyPayload): Promise<Property> {
    const { data } = await api.post<Property | CreatePropertyResponse>('/properties', payload);
    return normalizeProperty('property' in data ? data.property : data);
  },

  async createPropertyWithResponse(payload: CreatePropertyPayload): Promise<CreatePropertyResponse> {
    const { data } = await api.post<Property | CreatePropertyResponse>('/properties', payload);
    return 'property' in data
      ? { ...data, property: normalizeProperty(data.property) }
      : { property: normalizeProperty(data) };
  },

  async getMyProperties(): Promise<PropertiesResponse> {
    const { data } = await api.get<PropertiesResponse | Property[]>('/properties/mine');
    return normalizePropertiesResponse(Array.isArray(data)
      ? { properties: data, total: data.length, page: 1, limit: data.length }
      : data);
  },

  async updateProperty(id: string, payload: UpdatePropertyPayload): Promise<Property> {
    const { data } = await api.patch<Property>(`/properties/${id}`, payload);
    return normalizeProperty(data);
  },

  async deleteProperty(id: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(`/properties/${id}`);
    return data;
  },

  async getPropertyOwnerDetail(id: string): Promise<PropertyOwnerDetailResponse> {
    const { data } = await api.get<PropertyOwnerDetailResponse>(`/properties/${id}/owner-detail`);
    return { ...data, property: normalizeProperty(data.property) };
  },

  async listPendingApprovalProperties(): Promise<PropertiesResponse> {
    const { data } = await api.get<PropertiesResponse | Property[]>('/properties/admin/pending-approval');
    return normalizePropertiesResponse(Array.isArray(data)
      ? { properties: data, total: data.length, page: 1, limit: data.length }
      : data);
  },

  async getPropertyApprovalDetail(id: string): Promise<PropertyApprovalDetailResponse> {
    const { data } = await api.get<PropertyApprovalDetailResponse>(`/properties/${id}/admin-review`);
    return { ...data, property: normalizeProperty(data.property) };
  },

  async updatePropertyApproval(
    id: string,
    input: PropertyApprovalInput,
  ): Promise<{ property: Property; approvalStatus?: PropertyApprovalStatus; message?: string }> {
    const { data } = await api.patch<{ property: Property; approvalStatus?: PropertyApprovalStatus; message?: string }>(
      `/properties/${id}/approval`,
      input,
    );
    return { ...data, property: normalizeProperty(data.property) };
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
    return data.map((property) => ({
      ...property,
      paymentTypes: normalizePropertyPaymentTypes(property.paymentTypes, 0),
    }));
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

    if ('media' in data && Array.isArray(data.media)) {
      return data;
    }

    if (typeof data.url === 'string') {
      const file = files[0];
      return {
        url: data.url,
        media: [
          {
            url: data.url,
            public_id: `upload-${Date.now()}`,
            type: file?.type.startsWith('video/') ? 'video' : 'image',
          },
        ],
      };
    }

    return { media: [] };
  },

  // Legacy shim kept so existing callers continue to compile while they are migrated.
  async addProperty(_ownerId: string, payload: CreatePropertyPayload): Promise<Property> {
    return propertyService.createProperty(payload);
  },
};
