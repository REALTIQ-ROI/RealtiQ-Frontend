export type RoiPurpose = 'buyer_research' | 'seller_research' | 'admin_review' | 'system';
export type RoiStatus = 'completed' | 'rental_yield_only' | 'insufficient_data';

export interface CreateRoiEstimateInput {
  propertyReference: string;
  asOf?: string;
  projectionPeriodYears: number;
  purpose?: RoiPurpose;
  overrides?: { annualRent?: number; operatingExpenses?: number; vacancyRate?: number; appreciationRate?: number };
}

export interface RoiResults {
  grossRentalYield: number;
  vacancyAllowance: number;
  netOperatingIncome: number;
  netRentalYield: number;
  projectedNetRentalIncome?: number;
  projectedResaleProceeds?: number;
  sellingExpenses?: number;
  projectedTotalROI?: number;
  nominalAnnualisedROI?: number;
  realAnnualisedROI?: number;
}

export interface RoiEvidenceItem {
  publicReference?: string;
  subjectType?: string;
  subjectReference?: string;
  metric: string;
  value: number;
  unit?: string;
  currency?: string;
  sourceType: string;
  provider: string;
  series?: string;
  effectiveAt: string;
  recordedAt: string;
  fetchedAt?: string;
  datasetVersion: string;
  confidence: number;
  licence?: string;
  fallback?: boolean;
}

export interface RoiEstimate {
  publicReference: string;
  propertyReference: string;
  purpose: RoiPurpose;
  status: RoiStatus;
  asOf: string;
  projectionPeriodYears: number;
  currency: string;
  results: RoiResults | null;
  scenarios: Array<{ name: string; results: RoiResults }>;
  assumptions: RoiEvidenceItem[];
  sources: RoiEvidenceItem[];
  sourceMix: Record<string, number>;
  factors: Array<{ code: string; direction: string; explanation: string }>;
  warnings: string[];
  limitations: string[];
  algorithmVersion: string;
  policyVersion: string;
  datasetVersions: Record<string, string>;
  propertySnapshot: { effectiveAt: string; recordedAt: string; facts?: Record<string, unknown>; price: number; currency: string };
  createdAt: string;
  updatedAt: string;
}

export interface RoiEstimateResponse { roi: RoiEstimate }
export interface RoiHistoryResponse {
  estimates: RoiEstimate[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface RoiHistoryQuery { page?: number; limit?: number; asOf?: string }
