import api from '../lib/axios';

export type AnalyticsMetric =
  | 'searches'
  | 'views'
  | 'saves'
  | 'inquiries'
  | 'purchases'
  | 'transaction_value'
  | 'market_interest';

export type AnalyticsPeriod = 'hour' | 'day' | 'week' | 'month';

export interface AnalyticsAccessStatus {
  hasAccess: boolean;
  adminBypass?: boolean;
  product: 'property_market_analytics';
  access: null | {
    id?: string;
    _id?: string;
    accessType: 'one_time' | string;
    startsAt?: string;
    expiresAt?: string;
    status: 'active' | string;
  };
}

export interface InitializeAnalyticsPaymentResponse {
  accessId?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  authorizationUrl?: string;
  redirectUrl?: string;
  accessType?: 'one_time' | string;
  durationHours?: number;
  alreadyActive?: boolean;
  access?: AnalyticsAccessStatus['access'];
}

export interface AnalyticsBounds {
  north?: number;
  south?: number;
  east?: number;
  west?: number;
  zoom?: number;
}

export interface AnalyticsFilters extends AnalyticsBounds {
  metric?: AnalyticsMetric;
  startDate?: string;
  endDate?: string;
  period?: AnalyticsPeriod;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyStatus?: string;
  location?: string;
  limit?: number;
  currency?: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  eventCount: number;
  uniqueProperties: number;
  totalTransactionValue?: number;
}

export interface PropertyHeatmapResponse {
  metric: AnalyticsMetric;
  period?: { start: string; end: string };
  bounds?: Omit<Required<AnalyticsBounds>, 'zoom'>;
  zoom?: number;
  minimumAreaEvents?: number;
  weights?: Record<string, number>;
  totalEvents: number;
  points: HeatmapPoint[];
}

export interface PropertyMarketSummaryResponse {
  period?: { start: string; end: string };
  totalSearches: number;
  totalPropertyViews: number;
  totalSaves: number;
  totalInquiries: number;
  totalSuccessfulPurchases: number;
  totalTransactionValue: number;
  mostActiveAreas: Array<{
    cellId: string;
    lat: number;
    lng: number;
    score: number;
    eventCount: number;
    areaName?: string;
    name?: string;
    location?: string;
    place?: string;
    label?: string;
  }>;
  fastestGrowingAreas?: Array<Record<string, unknown>>;
  mostViewedPropertyTypes: Array<{ propertyType: string; views: number; purchases: number }>;
  mostPurchasedPropertyTypes: Array<{ propertyType: string; views: number; purchases: number }>;
  heatmap?: {
    endpoint: string;
    metrics: AnalyticsMetric[];
    minimumAreaEvents: number;
    weights: Record<string, number>;
  };
}

export interface PropertyPriceTrendsResponse {
  currency: string;
  filters?: Record<string, unknown>;
  totalPropertiesSampled: number;
  series: Array<{
    period: string;
    averageListedPrice: number;
    medianListedPrice: number;
    averagePriceChange: number;
    increases: number;
    decreases: number;
    totalPropertiesSampled: number;
  }>;
}

export const propertyAnalyticsService = {
  async getAccessStatus(): Promise<AnalyticsAccessStatus> {
    const { data } = await api.get<AnalyticsAccessStatus>('/analytics/access/status');
    return data;
  },

  async initializePayment(accessType = 'one_time'): Promise<InitializeAnalyticsPaymentResponse> {
    const { data } = await api.post<InitializeAnalyticsPaymentResponse>('/analytics/access/initialize-payment', { accessType });
    return data;
  },

  async getHeatmap(params?: AnalyticsFilters, signal?: AbortSignal): Promise<PropertyHeatmapResponse> {
    const { data } = await api.get<PropertyHeatmapResponse>('/analytics/property-heatmap', { params, signal });
    return data;
  },

  async getMarketSummary(params?: AnalyticsFilters, signal?: AbortSignal): Promise<PropertyMarketSummaryResponse> {
    const { data } = await api.get<PropertyMarketSummaryResponse>('/analytics/property-market-summary', { params, signal });
    return data;
  },

  async getPriceTrends(params?: AnalyticsFilters, signal?: AbortSignal): Promise<PropertyPriceTrendsResponse> {
    const { data } = await api.get<PropertyPriceTrendsResponse>('/analytics/property-price-trends', { params, signal });
    return data;
  },
};
