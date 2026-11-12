import api from '../lib/axios';

export type ProtectedMediaResourceKind = 'property' | 'project' | 'unit_type';
export type ProtectedMediaAccessLevel = 'Free' | 'Paid' | 'On request' | 'Private';
export interface ProtectedMediaPrice { state: 'configured' | 'unavailable'; amountMinor?: number; currency?: string; errorCode?: string }
export interface ProtectedMediaReadinessItem { state: string; reasonCode?: string | null; usableToAttempt?: boolean; runtimeVerified?: boolean; reasonCodes?: string[] }
export interface ProtectedMediaReadiness {
  policy?: { state: string; reasonCode?: string | null };
  collection?: { state: string; reasonCode?: string | null; runtimeVerified?: boolean };
  privateStorage?: { state: string; reasonCode?: string | null };
  privateEnvelope?: { state: string; reasonCode?: string | null };
  videoRenderer?: { state: string; reasonCode?: string | null };
  supportedCurrencies?: string[];
  purchases?: { paidItem?: ProtectedMediaReadinessItem; buyerPass?: ProtectedMediaReadinessItem; sellerSponsored?: ProtectedMediaReadinessItem };
}
export interface ProtectedMediaAccessOptions {
  levels: Array<{ mediaKind: string; allowedLevels: ProtectedMediaAccessLevel[] }>;
  freeModels: string[];
  buyerPassDurationHours: number | null;
  grantDurationHours: number | null;
  prices: { paidItem: ProtectedMediaPrice; buyerPass: ProtectedMediaPrice; sellerSponsored: ProtectedMediaPrice };
  readiness?: ProtectedMediaReadiness;
}
export interface ProtectedMediaItem {
  id: string;
  versionId: string;
  resourceKind: ProtectedMediaResourceKind;
  resourceId: string;
  unitTypeId?: string | null;
  ownerProfileId?: string;
  mediaKind: string;
  title: string;
  capturedAt: string;
  source: string;
  mimeType: string;
  fileSizeBytes: number;
  accessLevel: ProtectedMediaAccessLevel;
  freeModels: string[];
  previewPath?: string | null;
  state: string;
  version: number;
  downloadsAllowed: boolean;
  chargeOnRequest: boolean;
  access: { state: 'free' | 'owner' | 'staff' | 'active' | 'verification_required' | 'request_available' | 'purchase_available' | 'locked' | string; mode?: string; contentPath?: string | null };
  createdAt: string;
  updatedAt: string;
}
export interface ProtectedMediaGrant {
  id: string;
  itemId?: string;
  documentId?: string;
  buyerProfileId?: string;
  state: string;
  version: number;
  downloadsAllowed: boolean;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
export interface ProtectedMediaOrder {
  id: string;
  kind: string;
  itemId?: string;
  paymentId?: string;
  paymentReference: string;
  amountMinor: number;
  currency: string;
  state: 'pending' | 'active' | 'held' | 'failed' | string;
  checkoutUrl?: string | null;
  expiresAt?: string | null;
  lastErrorCode?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ProtectedMediaPage<T> { items: T[]; nextCursor: string | null }

const noStore = { headers: { 'Cache-Control': 'no-store' } };
const challengeHeader = (challengeId: string) => ({ headers: { 'X-Step-Up-Challenge': challengeId } });
const PENDING_ORDER_ID_KEY = 'realtiq.pendingProtectedMediaOrderId';
const PENDING_ORDER_REFERENCE_KEY = 'realtiq.pendingProtectedMediaOrderReference';
const PENDING_ORDER_PROFILE_KEY = 'realtiq.pendingProtectedMediaOrderProfile';

export const protectedMediaService = {
  persistPendingOrder(id: string, paymentReference: string, profileId: string): void {
    sessionStorage.setItem(PENDING_ORDER_ID_KEY, id);
    sessionStorage.setItem(PENDING_ORDER_REFERENCE_KEY, paymentReference);
    sessionStorage.setItem(PENDING_ORDER_PROFILE_KEY, profileId);
  },
  getPendingOrder(): { id: string | null; paymentReference: string | null; profileId: string | null } {
    return { id: sessionStorage.getItem(PENDING_ORDER_ID_KEY), paymentReference: sessionStorage.getItem(PENDING_ORDER_REFERENCE_KEY), profileId: sessionStorage.getItem(PENDING_ORDER_PROFILE_KEY) };
  },
  clearPendingOrder(): void {
    sessionStorage.removeItem(PENDING_ORDER_ID_KEY);
    sessionStorage.removeItem(PENDING_ORDER_REFERENCE_KEY);
    sessionStorage.removeItem(PENDING_ORDER_PROFILE_KEY);
  },
  async getAccessOptions(): Promise<ProtectedMediaAccessOptions> {
    const { data } = await api.get<ProtectedMediaAccessOptions>('/media/access-options', noStore);
    return data;
  },
  async listItems(resourceKind: ProtectedMediaResourceKind, resourceId: string, params: { unitTypeId?: string; limit?: number; after?: string } = {}): Promise<ProtectedMediaPage<ProtectedMediaItem>> {
    const { data } = await api.get<{ items: ProtectedMediaItem[]; nextCursor: string | null }>(`/media/resources/${resourceKind}/${encodeURIComponent(resourceId)}/items`, { ...noStore, params });
    return { items: data.items, nextCursor: data.nextCursor ?? null };
  },
  async uploadItem(resourceKind: ProtectedMediaResourceKind, resourceId: string, body: FormData, challengeId: string): Promise<ProtectedMediaItem> {
    const { data } = await api.post<{ item: ProtectedMediaItem }>(`/media/resources/${resourceKind}/${encodeURIComponent(resourceId)}/items`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data.item;
  },
  async getContent(id: string, options: { download?: boolean } = {}): Promise<{ blob: Blob; contentType: string; viewId: string | null }> {
    const { data, headers } = await api.get<Blob>(`/media/items/${encodeURIComponent(id)}/content`, { ...noStore, responseType: 'blob', params: options.download ? { download: true } : undefined });
    const contentType = String(headers['content-type'] ?? data.type ?? 'application/octet-stream').split(';')[0].trim().toLowerCase();
    return { blob: data, contentType, viewId: typeof headers['x-media-view-id'] === 'string' ? headers['x-media-view-id'] : null };
  },
  async completeView(id: string, viewId: string, body: { durationSeconds: number }): Promise<{ viewId: string; state: 'recorded' | string }> {
    const { data } = await api.post<{ viewId: string; state: 'recorded' | string }>(`/media/items/${encodeURIComponent(id)}/views/${encodeURIComponent(viewId)}/complete`, body);
    return data;
  },
  async requestAccess(id: string): Promise<ProtectedMediaGrant> {
    const { data } = await api.post<{ request: ProtectedMediaGrant }>(`/media/items/${encodeURIComponent(id)}/access-requests`, {});
    return data.request;
  },
  async listAccessRequests(id: string, params: { limit?: number; after?: string } = {}): Promise<ProtectedMediaPage<ProtectedMediaGrant>> {
    const { data } = await api.get<{ requests: ProtectedMediaGrant[]; nextCursor: string | null }>(`/media/items/${encodeURIComponent(id)}/access-requests`, { ...noStore, params });
    return { items: data.requests, nextCursor: data.nextCursor ?? null };
  },
  async decideAccessRequest(id: string, grantId: string, body: { decision: 'approve' | 'decline' | 'revoke'; expectedVersion: number; downloadsAllowed?: boolean }, challengeId: string): Promise<ProtectedMediaGrant> {
    const { data } = await api.post<{ request: ProtectedMediaGrant }>(`/media/items/${encodeURIComponent(id)}/access-requests/${encodeURIComponent(grantId)}/decision`, body, challengeHeader(challengeId));
    return data.request;
  },
  async revoke(id: string, body: { expectedVersion: number }, challengeId: string): Promise<ProtectedMediaItem> {
    const { data } = await api.post<{ item: ProtectedMediaItem }>(`/media/items/${encodeURIComponent(id)}/revoke`, body, challengeHeader(challengeId));
    return data.item;
  },
  async purchase(id: string, body: { idempotencyKey: string }, challengeId: string): Promise<{ order: ProtectedMediaOrder; idempotent: boolean }> {
    const { data } = await api.post<{ order: ProtectedMediaOrder; idempotent: boolean }>(`/media/items/${encodeURIComponent(id)}/purchase`, body, challengeHeader(challengeId));
    return data;
  },
  async sponsor(id: string, body: { idempotencyKey: string }, challengeId: string): Promise<{ order: ProtectedMediaOrder; idempotent: boolean }> {
    const { data } = await api.post<{ order: ProtectedMediaOrder; idempotent: boolean }>(`/media/items/${encodeURIComponent(id)}/sponsor`, body, challengeHeader(challengeId));
    return data;
  },
  async purchaseBuyerPass(body: { idempotencyKey: string }, challengeId: string): Promise<{ order: ProtectedMediaOrder; idempotent: boolean }> {
    const { data } = await api.post<{ order: ProtectedMediaOrder; idempotent: boolean }>('/media/buyer-passes/purchase', body, challengeHeader(challengeId));
    return data;
  },
  async getOrder(id: string): Promise<{ order: ProtectedMediaOrder; paymentStatus: string }> {
    const { data } = await api.get<{ order: ProtectedMediaOrder; paymentStatus: string }>(`/media/orders/${encodeURIComponent(id)}`, noStore);
    return data;
  },
};
