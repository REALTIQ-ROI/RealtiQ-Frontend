export type VirtualTourProvider = 'realsee' | 'matterport';
export type VirtualTourStatus = 'not_configured' | 'processing' | 'ready' | 'failed' | 'disabled';

export interface VirtualTourCapabilities {
  panorama: boolean;
  model3D: boolean;
  floorPlan: boolean;
  measurements: boolean;
  roomLabels: boolean;
  guidedTour: boolean;
  tags: boolean;
}

export interface ProviderStatusSummary {
  configured: boolean;
  available: boolean;
  enabled: boolean;
  status: VirtualTourStatus;
}

export interface VirtualTourSummary {
  available: boolean;
  resolvedProvider: VirtualTourProvider | null;
  preferredProvider: VirtualTourProvider | null;
  fallbackUsed: boolean;
  providers: Record<VirtualTourProvider, ProviderStatusSummary>;
  capabilities: VirtualTourCapabilities;
}

export interface PublicProviderAvailability {
  enabled: boolean;
  defaultProvider: VirtualTourProvider;
  providers: Record<VirtualTourProvider, { enabled: boolean }>;
  publicConfiguration: {
    matterport: { sdkKey: string | null };
    realsee: { workDataDelivery: 'signed_url' };
  };
}

export interface NormalizedRoom { id: string; name: string; floor: string | number | null; providerReference: string }
export interface NormalizedFloor { id: string; name: string; level: string | number }

interface ViewerEnvelope extends VirtualTourSummary {
  status: 'ready' | 'unavailable' | 'temporarily_unavailable';
  error?: VirtualTourApiError;
}

export interface RealseeVirtualTourResponse extends ViewerEnvelope {
  available: true;
  resolvedProvider: 'realsee';
  provider: { name: 'realsee'; status: 'ready' | 'temporarily_unavailable' };
  metadata?: { provider: 'realsee'; id: string; title: string; status: VirtualTourStatus; capabilities: VirtualTourCapabilities };
  viewer: null | { provider: 'realsee'; configuration: { provider: 'realsee'; workId: string; workDataUrl: string | null; vrUrl?: string } };
}

export interface MatterportVirtualTourResponse extends ViewerEnvelope {
  available: true;
  resolvedProvider: 'matterport';
  provider: { name: 'matterport'; status: 'ready' | 'temporarily_unavailable' };
  metadata?: { provider: 'matterport'; id: string; title: string; status: VirtualTourStatus; capabilities: VirtualTourCapabilities };
  viewer: null | { provider: 'matterport'; configuration: { provider: 'matterport'; modelSid: string; showcaseUrl: string; sdkKey: string | null } };
}

export interface UnavailableVirtualTourResponse extends ViewerEnvelope {
  available: false;
  resolvedProvider: null;
  provider: null;
  viewer: null;
  status: 'unavailable';
}

export type PropertyVirtualTourResponse = RealseeVirtualTourResponse | MatterportVirtualTourResponse | UnavailableVirtualTourResponse;
interface ModeUnavailableResponse { available: false; provider: null }

export type FloorPlanResponse = ModeUnavailableResponse | {
  available: true;
  provider: VirtualTourProvider;
  mode: 'sdk';
  floors: NormalizedFloor[];
  rooms: NormalizedRoom[];
  viewerConfiguration?: { workDataUrl: string | null };
  viewerFloorPlan?: boolean;
  schematicFloorPlanAsset?: boolean;
  data: null | { floorPlanAssets: Array<{ floor: { label: string; sequence: number }; format: string; flags: string[]; url: string; width: number; height: number; resolution: number }> };
};

export type MeasurementsResponse = ModeUnavailableResponse | { available: true; provider: VirtualTourProvider; mode: 'sdk'; unit?: string; measurements?: Array<{ id: string; value: number }> };
export type RoomsResponse = ModeUnavailableResponse | { available: true; provider: VirtualTourProvider; mode: 'metadata' | 'sdk'; floors: NormalizedFloor[]; rooms: NormalizedRoom[] };

export interface RealseeConfiguration {
  enabled: boolean; status: VirtualTourStatus; workId: string; workUrl?: string | null; vrUrl?: string | null;
  capabilities: VirtualTourCapabilities; metadata: Record<string, unknown>; configuredAt?: string; readyAt?: string | null;
  failedAt?: string | null; failureReason?: string | null;
}
export interface MatterportConfiguration {
  enabled: boolean; status: VirtualTourStatus; modelSid: string; showcaseUrl?: string | null;
  capabilities: VirtualTourCapabilities; metadata: Record<string, unknown>; configuredAt?: string; readyAt?: string | null;
  failedAt?: string | null; failureReason?: string | null;
}
export type PropertyProviderConfigurationResponse =
  | { propertyId: string; provider: 'realsee'; tour: RealseeConfiguration }
  | { propertyId: string; provider: 'matterport'; tour: MatterportConfiguration };
export interface SafeRealseeConfiguration {
  enabled: boolean; status: VirtualTourStatus; workId: string | null; workUrl: string | null; vrUrl: string | null;
  capabilities: VirtualTourCapabilities; metadata: Record<string, unknown>; configuredAt: string | null; readyAt: string | null;
  failedAt: string | null; failureReason: string | null;
}
export interface SafeMatterportConfiguration {
  enabled: boolean; status: VirtualTourStatus; modelSid: string | null; showcaseUrl: string | null;
  capabilities: VirtualTourCapabilities; metadata: Record<string, unknown>; configuredAt: string | null; readyAt: string | null;
  failedAt: string | null; failureReason: string | null;
}

export interface AdminVirtualTourDetail {
  property: { id: string; publicReference: string; title: string };
  project: { id: string; name: string; slug: string } | null;
  owner: { id: string; name: string; email: string } | null;
  virtualTourProviderOverride: VirtualTourProvider | null;
  resolvedProvider: VirtualTourProvider | null;
  fallbackUsed: boolean;
  providers: { realsee: SafeRealseeConfiguration; matterport: SafeMatterportConfiguration };
}
export interface AdminVirtualTourListResponse { items: AdminVirtualTourDetail[]; total: number; page: number; limit: number }
export interface ProviderHealthResponse {
  realsee: { configured: boolean; reachable: boolean | null; mode: string };
  matterport: { configured: boolean; reachable: boolean | null; mode: string };
}
export interface VirtualTourApiError {
  message: string;
  code?: 'VIRTUAL_TOUR_NOT_AVAILABLE' | 'VIRTUAL_TOUR_PROVIDER_DISABLED' | 'VIRTUAL_TOUR_PROVIDER_UNAVAILABLE' | 'VIRTUAL_TOUR_CONFIGURATION_INVALID' | 'VIRTUAL_TOUR_RESOURCE_NOT_FOUND' | 'VIRTUAL_TOUR_NOT_READY' | 'VIRTUAL_TOUR_PERMISSION_DENIED';
  provider?: VirtualTourProvider;
}
