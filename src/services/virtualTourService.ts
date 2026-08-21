import api from '../lib/axios';
import type {
  AdminVirtualTourDetail,
  AdminVirtualTourListResponse,
  FloorPlanResponse,
  MeasurementsResponse,
  PropertyProviderConfigurationResponse,
  PropertyVirtualTourResponse,
  ProviderHealthResponse,
  PublicProviderAvailability,
  RoomsResponse,
  VirtualTourProvider,
  VirtualTourStatus,
} from '../types/virtualTour';

const encode = (value: string) => encodeURIComponent(value);
const compact = <T extends object>(value?: T) => Object.fromEntries(
  Object.entries(value ?? {}).filter(([, item]) => item !== '' && item !== undefined && item !== null),
);

const viewerCache = new Map<string, Promise<PropertyVirtualTourResponse>>();

export interface AdminVirtualTourListParams {
  provider?: VirtualTourProvider;
  status?: VirtualTourStatus;
  project?: string;
  property?: string;
  owner?: string;
  page?: number;
  limit?: number;
}

export const virtualTourService = {
  async getVirtualTourProviders(): Promise<PublicProviderAvailability> {
    const { data } = await api.get<PublicProviderAvailability>('/virtual-tours/providers');
    return data;
  },

  getPropertyVirtualTour(propertyIdOrReference: string, force = false): Promise<PropertyVirtualTourResponse> {
    const key = encode(propertyIdOrReference);
    if (force) viewerCache.delete(key);
    const cached = viewerCache.get(key);
    if (cached) return cached;
    const request = api.get<PropertyVirtualTourResponse>(`/properties/${key}/virtual-tour`)
      .then(({ data }) => data)
      .catch((error: unknown) => {
        viewerCache.delete(key);
        throw error;
      });
    viewerCache.set(key, request);
    return request;
  },

  async getPropertyVirtualTourFloorPlan(propertyIdOrReference: string): Promise<FloorPlanResponse> {
    const { data } = await api.get<FloorPlanResponse>(`/properties/${encode(propertyIdOrReference)}/virtual-tour/floorplan`);
    return data;
  },

  async getPropertyVirtualTourMeasurements(propertyIdOrReference: string): Promise<MeasurementsResponse> {
    const { data } = await api.get<MeasurementsResponse>(`/properties/${encode(propertyIdOrReference)}/virtual-tour/measurements`);
    return data;
  },

  async getPropertyVirtualTourRooms(propertyIdOrReference: string): Promise<RoomsResponse> {
    const { data } = await api.get<RoomsResponse>(`/properties/${encode(propertyIdOrReference)}/virtual-tour/rooms`);
    return data;
  },

  async configurePropertyRealsee(propertyIdOrReference: string, body: { workId: string; workUrl?: string; vrUrl?: string } | { enabled: false }): Promise<PropertyProviderConfigurationResponse> {
    const { data } = await api.patch<PropertyProviderConfigurationResponse>(`/properties/${encode(propertyIdOrReference)}/virtual-tour/realsee`, body);
    viewerCache.delete(encode(propertyIdOrReference));
    return data;
  },

  async configurePropertyMatterport(propertyIdOrReference: string, body: { modelSid: string; showcaseUrl?: string } | { enabled: false }): Promise<PropertyProviderConfigurationResponse> {
    const { data } = await api.patch<PropertyProviderConfigurationResponse>(`/properties/${encode(propertyIdOrReference)}/virtual-tour/matterport`, body);
    viewerCache.delete(encode(propertyIdOrReference));
    return data;
  },

  async setPropertyVirtualTourProvider(propertyIdOrReference: string, body: { provider: VirtualTourProvider | null }): Promise<{ propertyId: string; virtualTourProviderOverride: VirtualTourProvider | null }> {
    const { data } = await api.patch<{ propertyId: string; virtualTourProviderOverride: VirtualTourProvider | null }>(`/properties/${encode(propertyIdOrReference)}/virtual-tour/provider`, body);
    viewerCache.delete(encode(propertyIdOrReference));
    return data;
  },

  async setProjectVirtualTourProvider(projectId: string, body: { provider: VirtualTourProvider | null }): Promise<{ projectId: string; virtualTourProviderOverride: VirtualTourProvider | null }> {
    const { data } = await api.patch<{ projectId: string; virtualTourProviderOverride: VirtualTourProvider | null }>(`/projects/${encode(projectId)}/virtual-tour/provider`, body);
    viewerCache.clear();
    return data;
  },

  async updateAdminVirtualTourSettings(body: Partial<{ enabled: boolean; defaultProvider: VirtualTourProvider; providers: Partial<Record<VirtualTourProvider, { enabled: boolean }>> }>): Promise<Pick<PublicProviderAvailability, 'enabled' | 'defaultProvider' | 'providers'>> {
    const { data } = await api.patch<Pick<PublicProviderAvailability, 'enabled' | 'defaultProvider' | 'providers'>>('/admin/settings/virtual-tours', body);
    viewerCache.clear();
    return data;
  },

  async listAdminVirtualTours(params?: AdminVirtualTourListParams): Promise<AdminVirtualTourListResponse> {
    const { data } = await api.get<AdminVirtualTourListResponse>('/admin/virtual-tours', { params: compact(params) });
    return data;
  },

  async getAdminVirtualTour(propertyIdOrReference: string): Promise<AdminVirtualTourDetail> {
    const { data } = await api.get<AdminVirtualTourDetail>(`/admin/virtual-tours/${encode(propertyIdOrReference)}`);
    return data;
  },

  async getAdminVirtualTourProviderHealth(): Promise<ProviderHealthResponse> {
    const { data } = await api.get<ProviderHealthResponse>('/admin/virtual-tours/providers/health');
    return data;
  },
};
