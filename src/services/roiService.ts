import api from '../lib/axios';
import type { ROICalculationInput, ROICalculationResult } from '../utils/roiCalculator';

export interface ROIAssumptions {
  inflationRate: number;
  rentalYieldPercent: number;
  appreciationRate: number;
  operatingExpensePercent: number;
  closingCostPercent: number;
  downPaymentPercent: number;
  holdingPeriodYears: number;
  currency: string;
}

export interface MarketBenchmarkQuery {
  location?: string;
  propertyType?: string;
  completionStage?: string;
  category?: string;
  currency?: string;
}

export interface MarketBenchmark {
  location: string;
  propertyType?: string;
  averagePrice: number;
  averageRent?: number;
  rentalYieldPercent?: number;
  appreciationRate?: number;
  currency: string;
}

export interface ROIScenarioPayload extends ROICalculationInput {
  propertyId?: string;
  propertyTitle?: string;
  location?: string;
  propertyType?: string;
  completionStage?: string;
  category?: string;
  benchmark?: MarketBenchmark | null;
  result?: ROICalculationResult;
}

export interface ROIScenario extends ROIScenarioPayload {
  _id: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

const unwrap = <T,>(payload: T | { data?: T }): T => {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return payload.data;
  }
  return payload as T;
};

export const roiService = {
  async getAssumptions(): Promise<ROIAssumptions> {
    const { data } = await api.get<ROIAssumptions | { data: ROIAssumptions }>('/roi/assumptions');
    return unwrap(data);
  },

  async calculate(payload: ROIScenarioPayload): Promise<ROICalculationResult> {
    const { data } = await api.post<ROICalculationResult | { data: ROICalculationResult }>('/roi/calculate', payload);
    return unwrap(data);
  },

  async savePropertyScenario(propertyId: string, payload: ROIScenarioPayload): Promise<ROIScenario> {
    const { data } = await api.post<ROIScenario | { data: ROIScenario }>(`/properties/${propertyId}/roi/scenarios`, payload);
    return unwrap(data);
  },

  async getMyScenarios(): Promise<ROIScenario[]> {
    const { data } = await api.get<ROIScenario[] | { data: ROIScenario[] }>('/users/me/roi/scenarios');
    return unwrap(data);
  },

  async getPropertyScenarios(propertyId: string): Promise<ROIScenario[]> {
    const { data } = await api.get<ROIScenario[] | { data: ROIScenario[] }>(`/properties/${propertyId}/roi/scenarios`);
    return unwrap(data);
  },

  async getMarketBenchmark(params: MarketBenchmarkQuery): Promise<MarketBenchmark> {
    const { data } = await api.get<MarketBenchmark | { data: MarketBenchmark }>('/properties/market-benchmark', { params });
    return unwrap(data);
  },
};
