import api from '../lib/axios';
import type { Property } from '../types';

const privateRead = { headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } };
const enc = (value: string) => encodeURIComponent(value);

export type CompareCategory = 'residential' | 'commercial';
export type CompareCriterion = 'lowest_asking_price' | 'lowest_price_per_sqm' | 'largest_floor_area' | 'most_recently_listed' | 'most_recently_reduced';
export const compareFxSourceLabel = (source: string | null | undefined): string =>
  source === 'buyer_override' ? 'Your rate' : source === 'official_nfem' ? 'CBN NFEM' : 'Converted display';

export interface CompareFx {
  state: string;
  selectedRateSource: 'official_nfem' | 'buyer_override' | null;
  displayCurrency: 'NGN' | 'USD' | null;
  supportedDisplayCurrencies: Array<'NGN' | 'USD'>;
  convertedPricesAvailable: boolean;
  rateNgnPerUsd?: number;
  effectiveAt?: string;
  recordedAt?: string;
  rateDate?: string;
  source?: string;
  provider?: string;
  series?: string;
  buyerRateNgnPerUsd?: number;
  message?: string;
}

export interface CompareItem {
  id: string;
  publicReference: string | null;
  title: string;
  property: Property;
  category: CompareCategory | null;
  canonicalCategory: string | null;
  propertyType: string | null;
  status: 'available' | 'under_offer' | 'sold' | 'withdrawn_or_removed';
  availability: string;
  availableForPurchase: boolean;
  price: { amount: number | null; currency: 'NGN' | 'USD' | null; displayAmount?: number; displayCurrency?: 'NGN' | 'USD'; conversionSource?: string; pricePerSqm: { amount?: number; currency?: string; areaUnit?: string; displayAmount?: number; displayCurrency?: 'NGN' | 'USD'; conversionSource?: string } | null; kind?: 'poa' | 'unpriced' };
  location: { state: string | null; lga: string | null; area: string | null; estateName: string | null; streetAddress: string | null; coordinates: { lng: number; lat: number } | null };
  effectiveFields: Record<string, unknown>;
  internalFloorAreaSqm: number | null;
  listedAt: string | null;
  priceLastChangedAt: string | null;
  freshness: Record<string, unknown>;
  titleVerification: { status: string; provenance: Record<string, unknown> | null };
  trust: { platformVerifiedListing: boolean; badge: string | null; tier: string | null };
  coordinates: { lng: number; lat: number } | null;
  project?: Record<string, unknown>;
  freshnessNotice: 'needs_confirmation' | 'reminder' | null;
  missingCriterionValue: string | null;
  duplicateGroup?: string;
  duplicateLabel?: 'Same property, multiple listings';
  actions?: { remove?: true };
  unavailableReason?: 'LISTING_NO_LONGER_PUBLIC';
}

export interface CompareSet {
  propertyIds: string[];
  category: CompareCategory | null;
  origin: null | { source: 'top_matches' | 'similar'; criterion: string };
  displayCurrency: 'NGN' | 'USD' | null;
  buyerFxOverrideNgnPerUsd: number | null;
  version: number;
  canOpen: boolean;
  maximumProperties: number;
  canUndo: boolean;
  undoOperation: unknown;
}

export interface Comparison {
  category: CompareCategory | null;
  items: CompareItem[];
  canOpen: boolean;
  objectiveMarkers: Record<string, unknown>;
  fx: CompareFx;
  changesSinceLastVisit: Array<Record<string, unknown>>;
  statusSummary: Record<string, number>;
}

export interface CompareStateResponse { set: CompareSet; comparison: Comparison | null }

export interface CompareSuggestionResponse {
  mode: 'top_matches' | 'similar';
  state?: 'available' | 'unavailable';
  category?: CompareCategory;
  criterion?: CompareCriterion;
  count?: number;
  requestedCount?: number;
  totalMatchingCount: number;
  candidates: CompareItem[];
  hasPreviewCandidate: boolean;
  hasNextCandidate: boolean;
  confirmationRequired: true;
  reasonCode?: string;
  anchor?: { id?: string; title?: string; pinnedAsReference: boolean };
  tolerances?: { sizePercent: number; askingPricePercent: number };
}

export interface ComparisonAlertSubscription {
  enabled: boolean;
  propertyIds: string[];
  triggers: { askingPriceChanged: boolean; availabilityChanged: boolean };
  version: number;
  lastEvaluatedAt: string | null;
  nextEvaluationAt: string | null;
  lastErrorCode: string | null;
  updatedAt: string | null;
}

export interface RecentSalesResponse {
  state: 'unconfigured' | 'unavailable' | 'below_threshold' | 'available';
  reasonCode?: string;
  count: number;
  window: '6m' | '1y' | '2y' | '3y';
  detailsRequired?: 'registered';
  comparables: Array<{ propertyId: string; publicReference: string | null; title: string; soldAtMonth: string; soldAt: string; askingPriceBeforeSale: { label: 'Last asking price before sale'; amount: number; currency: string; effectiveAt: string }; comparisonItem: CompareItem; availability: 'sold'; markerEligible: false }>;
  nextCursor: string | null;
}

export interface ComparisonInsights {
  propertyId: string;
  comparisonInsights: {
    coverage: string;
    firstTrackedEventAt: string | null;
    lastTrackedEventAt: string | null;
    events: { addedToComparisons: number; comparisonOpens: number; removedFromComparisons: number; comparisonContextEnquiries: number };
  };
  generatedAt: string;
}

export const compareService = {
  async getActive(): Promise<CompareStateResponse> {
    return (await api.get<CompareStateResponse>('/compare', privateRead)).data;
  },
  async view(params: { propertyIds: string[]; displayCurrency?: 'NGN' | 'USD' | null; buyerFxOverrideNgnPerUsd?: number | null }): Promise<Comparison> {
    const { data } = await api.get<{ comparison: Comparison }>('/compare/view', {
      params: {
        propertyIds: params.propertyIds.join(','),
        ...(params.displayCurrency ? { displayCurrency: params.displayCurrency } : {}),
        ...(typeof params.buyerFxOverrideNgnPerUsd === 'number' ? { buyerFxOverrideNgnPerUsd: params.buyerFxOverrideNgnPerUsd } : {}),
      },
      ...privateRead,
    });
    return data.comparison;
  },
  async set(body: { expectedVersion: number; propertyIds: string[]; operation: 'set' | 'replace'; confirmed: true; origin: 'manual' | 'top_matches' | 'similar'; criterion?: CompareCriterion; displayCurrency?: 'NGN' | 'USD' | null; buyerFxOverrideNgnPerUsd?: number | null; replaceCurrentSet?: boolean }): Promise<CompareStateResponse> {
    return (await api.put<CompareStateResponse>('/compare/set', body, privateRead)).data;
  },
  async clear(expectedVersion: number): Promise<CompareStateResponse> {
    return (await api.delete<CompareStateResponse>('/compare/set', { ...privateRead, data: { expectedVersion } })).data;
  },
  async undo(expectedVersion: number): Promise<CompareStateResponse> {
    return (await api.post<CompareStateResponse>('/compare/set/undo', { expectedVersion }, privateRead)).data;
  },
  async suggestions(body: Record<string, unknown>): Promise<CompareSuggestionResponse> {
    return (await api.post<CompareSuggestionResponse>('/compare/suggestions', body, privateRead)).data;
  },
  async recentSales(params: { anchorPropertyId: string; window?: '6m' | '1y' | '2y' | '3y'; limit?: number; after?: string | null }): Promise<RecentSalesResponse> {
    return (await api.get<RecentSalesResponse>('/compare/recent-sales', { params, ...privateRead })).data;
  },
  async getAlerts(): Promise<{ subscription: ComparisonAlertSubscription }> {
    return (await api.get<{ subscription: ComparisonAlertSubscription }>('/compare/alerts', privateRead)).data;
  },
  async updateAlerts(body: { expectedVersion: number; enabled: boolean; triggers?: { askingPriceChanged: boolean; availabilityChanged: boolean } }): Promise<{ subscription: ComparisonAlertSubscription }> {
    return (await api.put<{ subscription: ComparisonAlertSubscription }>('/compare/alerts', body, privateRead)).data;
  },
  async getSellerInsights(propertyId: string): Promise<ComparisonInsights> {
    return (await api.get<ComparisonInsights>(`/profiles/current/properties/${enc(propertyId)}/comparison-insights`, privateRead)).data;
  },
};
