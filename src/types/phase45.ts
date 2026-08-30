export type PropertyCondition =
  "unknown" | "poor" | "fair" | "good" | "excellent" | "new";
export type PropertyFurnishing =
  "unknown" | "unfurnished" | "semi_furnished" | "furnished";
export type RoadAccess = "unknown" | "unpaved" | "paved" | "major_road";
export type TenureClassification =
  | "unknown"
  | "freehold"
  | "leasehold"
  | "certificate_of_occupancy"
  | "governors_consent"
  | "other";
export type GeocodePrecision =
  | "unknown"
  | "country"
  | "state"
  | "city"
  | "neighbourhood"
  | "street"
  | "parcel";
export type FactVerificationStatus =
  | "unverified"
  | "seller_asserted"
  | "admin_verified"
  | "inspector_verified"
  | "document_verified";
export type FactVerificationSource =
  "legacy" | "seller" | "admin" | "proxy_inspection" | "title_document";

export interface StructuredPropertyFacts {
  areas?: { buildingSquareMetres?: number; landSquareMetres?: number };
  yearBuilt?: number;
  renovationYear?: number;
  architecturalStyle?: string;
  neighbourhood?: string;
  propertySubtype?: string;
  floors?: number;
  condition?: PropertyCondition;
  furnishing?: PropertyFurnishing;
  parkingSpaces?: number;
  roadAccess?: RoadAccess;
  tenureClassification?: TenureClassification;
  geocodePrecision?: GeocodePrecision;
  utilities?: { power?: boolean; water?: boolean };
  construction?: {
    structure?: string;
    roof?: string;
    walls?: string;
    foundation?: string;
  };
  verification?: {
    status?: FactVerificationStatus;
    source?: FactVerificationSource;
  };
}

export type AvmPurpose =
  "buyer_research" | "seller_research" | "admin_review" | "system";
export interface AvmObservationSnapshot {
  observation?: string;
  effectiveAt?: string;
  recordedAt?: string;
  facts?: Record<string, unknown>;
  provenance?: Record<string, unknown>;
}
export interface AvmComparable extends AvmObservationSnapshot {
  publicReference?: string;
  sourceType: "verified_sale" | "approved_asking";
  rawPrice?: number;
  adjustedPrice?: number;
  distanceKm?: number;
  weight?: number;
  adjustments?: Array<{ code: string; percent: number; reason: string }>;
  reasonCodes?: string[];
}
export interface AvmValuation {
  publicReference: string;
  purpose: AvmPurpose;
  status: "completed" | "insufficient_data";
  asOf: string;
  algorithmVersion?: string;
  policyVersion?: string;
  targetFacts?: {
    publicReference?: string;
    propertyType?: string;
    listingType?: string;
    bedrooms?: number;
    bathrooms?: number;
    areaSquareMetres?: number;
    yearBuilt?: number;
    condition?: string;
    coordinates?: { lat: number; lng: number } | null;
    titleStatus?: string;
  };
  targetSnapshot?: AvmObservationSnapshot;
  estimate?: number;
  range?: { low?: number; high?: number };
  currency: string;
  confidence: "low" | "medium" | "high" | "insufficient";
  confidenceScore?: number;
  comparableCount?: number;
  sourceMix?: { verifiedSales?: number; approvedAsking?: number };
  comparables?: AvmComparable[];
  factors?: Array<{
    code: string;
    label: string;
    direction: "positive" | "negative" | "neutral";
    explanation?: string;
  }>;
  warnings?: string[];
  limitations?: string[];
  sourceDatasetVersions?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export type TrustBand =
  "insufficient" | "low" | "standard" | "strong" | "excellent";
export type TrustBadge = "none" | "bronze" | "silver" | "gold";
export interface TrustComponent {
  score?: number;
  count?: number;
  reasonCode?: string;
  available?: boolean;
}
export type TrustDecisionStatus =
  "active" | "under_review" | "superseded" | "expired";
export interface TrustDecision {
  publicReference: string;
  policyVersion: string;
  score: number;
  band: TrustBand;
  badge: TrustBadge;
  components: Record<string, TrustComponent>;
  positiveFactors?: Array<{
    code: string;
    label: string;
    direction: "positive" | "negative" | "neutral";
  }>;
  insufficientHistory?: boolean;
  evidenceFreshness?: string;
  calculatedAt?: string;
  status?: TrustDecisionStatus;
}
export type AppealStatus = "open" | "upheld" | "adjusted" | "dismissed";
export interface TrustAppeal {
  _id?: string;
  publicReference: string;
  user?: string | { _id: string; name: string; role: string };
  decision?: string;
  decisionVersion: string;
  reason: string;
  status: AppealStatus;
  resolution?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
}
export interface ResolveAppealInput {
  action: Exclude<AppealStatus, "open">;
  reason: string;
  reviewAt?: string;
  expiresAt?: string;
  badge?: TrustBadge;
  score?: number;
  band?: TrustBand;
}
export interface ResolveAppealResult {
  appeal: TrustAppeal;
  decision: TrustDecision;
}
