import api from '../lib/axios';
import type { MediaItem } from '../types';

export interface ROIAssumptions {
  _id?: string;
  inflation: number;
  mmf: number;
  mpr: number;
  usdNgn: number;
  usInflation: number;
  usTreasury: number;
  defaultAlpha: number;
  defaultBeta: number;
  effectiveDate?: string;
}

export interface ROICalculationInputs {
  cost: number;
  startDate: string;
  endDate: string;
  inflation: number;
  mmf: number;
  mpr: number;
  usdNgn: number;
  entryUsdNgn: number;
  usInflation: number;
  usTreasury: number;
  alpha: number;
  beta: number;
  targetUsd: number;
}

export interface ROICalculationResults {
  baseHurdle: number;
  mprAdjustment: number;
  annualTargetROI: number;
  monthsDiff: number;
  yearsDiff: number;
  finalSellingPrice: number;
  finalProfit: number;
  entryUsdValue: number;
  finalTargetUsd: number;
  requiredNairaForUsdTarget: number;
}

export interface ROICalculationResponse {
  results: ROICalculationResults;
}

export interface SavePropertyScenarioPayload {
  source: 'property_detail' | 'roi_calculator' | string;
  inputs: Partial<ROICalculationInputs>;
}

export interface ScenarioProperty {
  _id: string;
  title: string;
  price?: number;
  location?: string;
  media?: MediaItem[];
  propertyType?: string;
}

export interface ROIScenario {
  _id: string;
  property?: ScenarioProperty | string;
  propertyId?: ScenarioProperty | string;
  source?: string;
  inputs: Partial<ROICalculationInputs>;
  results?: ROICalculationResults;
  result?: ROICalculationResults;
  createdAt?: string;
  updatedAt?: string;
}

export interface MarketBenchmarkProperty {
  _id: string;
  title: string;
  price: number;
  location?: string;
  propertyType?: string;
  media?: MediaItem[];
}

export interface MarketBenchmark {
  count: number;
  min: number;
  avg: number;
  max: number;
  properties?: MarketBenchmarkProperty[];
}

export interface MarketBenchmarkQuery {
  location?: string;
  propertyType?: string;
}

const defaultAssumptions: ROIAssumptions = {
  inflation: 0,
  mmf: 0,
  mpr: 0,
  usdNgn: 1,
  usInflation: 0,
  usTreasury: 0,
  defaultAlpha: 15,
  defaultBeta: 0.25,
};

const unwrapAssumptions = (payload: ROIAssumptions | { assumptions: ROIAssumptions }): ROIAssumptions =>
  'assumptions' in payload ? payload.assumptions : payload;

const unwrapResults = (payload: ROICalculationResults | ROICalculationResponse): ROICalculationResults =>
  'results' in payload ? payload.results : payload;

const unwrapArray = <T,>(payload: T[] | { scenarios?: T[]; data?: T[] }): T[] => {
  if (Array.isArray(payload)) return payload;
  return payload.scenarios ?? payload.data ?? [];
};

const unwrapBenchmark = (payload: MarketBenchmark | { benchmark?: MarketBenchmark; data?: MarketBenchmark }): MarketBenchmark => {
  if ('benchmark' in payload && payload.benchmark) return payload.benchmark;
  if ('data' in payload && payload.data) return payload.data;
  return payload as MarketBenchmark;
};

export const roiService = {
  async getAssumptions(): Promise<ROIAssumptions> {
    const { data } = await api.get<ROIAssumptions | { assumptions: ROIAssumptions }>('/roi/assumptions');
    return { ...defaultAssumptions, ...unwrapAssumptions(data) };
  },

  async calculate(inputs: ROICalculationInputs): Promise<ROICalculationResults> {
    const { data } = await api.post<ROICalculationResults | ROICalculationResponse>('/roi/calculate', { inputs });
    return unwrapResults(data);
  },

  async savePropertyScenario(propertyId: string, payload: SavePropertyScenarioPayload): Promise<ROIScenario> {
    const { data } = await api.post<ROIScenario | { scenario: ROIScenario }>(
      `/properties/${propertyId}/roi/scenarios`,
      payload,
    );
    return 'scenario' in data ? data.scenario : data;
  },

  async getPropertyScenarios(propertyId: string): Promise<ROIScenario[]> {
    const { data } = await api.get<ROIScenario[] | { scenarios?: ROIScenario[]; data?: ROIScenario[] }>(
      `/properties/${propertyId}/roi/scenarios`,
    );
    return unwrapArray(data);
  },

  async getMyScenarios(): Promise<ROIScenario[]> {
    const { data } = await api.get<ROIScenario[] | { scenarios?: ROIScenario[]; data?: ROIScenario[] }>(
      '/users/me/roi/scenarios',
    );
    return unwrapArray(data);
  },

  async createAssumptions(payload: ROIAssumptions): Promise<ROIAssumptions> {
    const { data } = await api.post<ROIAssumptions | { assumptions: ROIAssumptions }>(
      '/admin/roi/assumptions',
      payload,
    );
    return unwrapAssumptions(data);
  },

  async getMarketBenchmark(params?: MarketBenchmarkQuery): Promise<MarketBenchmark> {
    const { data } = await api.get<MarketBenchmark | { benchmark: MarketBenchmark; data?: MarketBenchmark }>(
      '/properties/market-benchmark',
      { params },
    );
    return unwrapBenchmark(data);
  },
};
