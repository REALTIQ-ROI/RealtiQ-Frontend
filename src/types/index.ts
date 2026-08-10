export type UserRole = 'buyer' | 'landlord' | 'proxy_inspector' | 'admin';
export type PropertyType = 'house' | 'apartment' | 'land' | 'commercial' | 'villa' | 'penthouse' | 'estate';
export type PropertyStatus = 'available' | 'sold';
export type PropertyPaymentType = 'outright' | 'installment' | 'escrow';
export type PropertyCategory = 'residential' | 'commercial' | 'mixed_use' | string;
export type PropertyCompletionStage = 'off_plan' | 'unfinished' | 'finished' | 'renovation' | string;
export type PropertyCurrency = 'NGN' | 'USD' | 'GBP' | string;
export type TourType = 'open_house' | 'virtual_paid' | 'staging_view';
export type TourMode = 'physical' | 'virtual';
export type TourStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type CartItemType =
  | 'title_document_view'
  | 'proxy_inspection_escrow'
  | 'property_market_analytics'
  | 'paid_virtual_tour';
export type CartStatus =
  | 'active'
  | 'checkout_pending'
  | 'checked_out'
  | 'abandoned';
export type CartCheckoutStatus =
  | 'pending'
  | 'payment_initialized'
  | 'paid'
  | 'allocation_processing'
  | 'completed'
  | 'partially_failed'
  | 'failed'
  | 'expired'
  | 'refunded'
  | 'partially_refunded';
export type AllocationStatus =
  | 'pending'
  | 'processing'
  | 'allocated'
  | 'failed'
  | 'refunded';
export type InstallmentStatus = 'pending' | 'active' | 'overdue' | 'defaulted' | 'completed' | 'cancelled';
export type PropertyApprovalStatus = 'pending_review' | 'approved' | 'rejected';

export interface MediaItem {
  url: string;
  public_id: string;
  publicId?: string;
  resourceType?: 'image' | 'video' | 'raw' | string;
  type: 'image' | 'video' | 'raw';
  _id?: string;
}

export interface PropertyCoordinates {
  lat: number;
  lng: number;
}

export interface PropertyOwner {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  selfieUrl?: string;
  landlordVerified?: boolean;
  ratingAverage?: number;
}

export type KycStatus = 'pending' | 'approved' | 'rejected' | string;

export interface UserKyc {
  _id?: string;
  fullLegalName?: string;
  nationalId?: string;
  address?: string;
  idDocumentUrl?: string;
  selfieUrl?: string;
  status: KycStatus;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface Property {
  _id: string;
  id?: string;
  publicReference?: string | null;
  title: string;
  price: number;
  location: string;
  propertyType: PropertyType | string;
  bedrooms: number;
  bathrooms: number;
  description: string;
  squareFeet: number;
  category?: PropertyCategory;
  completionStage?: PropertyCompletionStage;
  currency?: PropertyCurrency;
  paymentTypes: PropertyPaymentType[];
  coordinates?: PropertyCoordinates | null;
  media: MediaItem[];
  status: PropertyStatus;
  approvalStatus?: PropertyApprovalStatus;
  rejectionReason?: string;
  approvedAt?: string;
  rejectedAt?: string;
  featured?: boolean;
  amenities?: string[];
  views?: number;
  saves?: number;
  ownerId?: PropertyOwner | string;
  buyerId?: PropertyOwner | string;
  createdAt?: string;
  updatedAt?: string;
  titleVerification?: PropertyTitleVerificationSummary;
  titleDocumentStatus?: PropertyTitleVerificationStatus | 'not_uploaded' | 'not_submitted';
  titleVerificationLookupId?: string | null;
  titleDocumentReferences?: TitleDocumentReference[];
  owner?: PropertyOwner;
  previousPrice?: number;
  priceLastChangedAt?: string;
  priceChangePercentage?: number;
  priceChangeDirection?: 'increase' | 'decrease' | 'unchanged' | string;
  marketActivity?: {
    metric: 'market_interest' | 'views' | 'saves' | 'inquiries' | 'purchases' | string;
    level: 'low' | 'medium' | 'high' | 'very_high' | string;
    score: number;
    periodDays: number;
  };
}

export const propertyPublicReference = (property?: Pick<Property, 'publicReference' | '_id'> | null): string =>
  property?.publicReference || '';

export const propertyRouteReference = (property?: Pick<Property, 'publicReference' | '_id' | 'id'> | null): string =>
  property?.publicReference || property?._id || property?.id || '';

export const propertyDisplayReference = (property?: Pick<Property, 'publicReference'> | null): string =>
  property?.publicReference || 'Reference pending';

export const resolveOwnerId = (ownerId?: PropertyOwner | string): string => {
  if (!ownerId) return '';
  return typeof ownerId === 'string' ? ownerId : ownerId._id || ownerId.id || '';
};

export const resolvePropertyOwnerId = (property?: Pick<Property, 'owner' | 'ownerId'> | null): string =>
  resolveOwnerId(property?.owner) || resolveOwnerId(property?.ownerId);

export const resolveBuyerId = (buyerId?: PropertyOwner | string): string => {
  if (!buyerId) return '';
  return typeof buyerId === 'string' ? buyerId : buyerId._id || buyerId.id || '';
};

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  emailVerified?: boolean;
  landlordVerified?: boolean;
  trustBadge?: string;
  favourites?: string[];
  ratingAverage?: number;
  ratingCount?: number;
  kyc?: UserKyc | null;
  recentlyViewed?: string[];
  savedSearches?: string[];
  propertyCount?: number;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateUserPayload {
  name: string;
  phone?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalProperties: number;
  activeListings: number;
  soldProperties: number;
  totalInquiries: number;
  totalRevenue: number;
  totalProxyInspectors?: number;
  pendingProxyInspectorApprovals?: number;
  approvedProxyInspectors?: number;
  suspendedProxyInspectors?: number;
  totalProxyInspectionRequests?: number;
  activeProxyInspectionJobs?: number;
  completedProxyInspectionJobs?: number;
  disputedProxyInspectionJobs?: number;
  proxyInspectionGrossVolume?: number;
  proxyInspectionRevenue?: number;
  proxyInspectorPayoutTotal?: number;
}

export interface Payment {
  id: string;
  propertyId: string;
  buyerId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  createdAt: string;
}

export interface PaymentUser {
  _id: string;
  name: string;
  email: string;
}

export interface PaymentProperty {
  _id: string;
  publicReference?: string | null;
  title: string;
  price: number;
  location: string;
}

export interface PaystackData {
  status: string;
  gateway_response: string;
  channel: string;
  currency: string;
  fees: number;
}

export interface ApiPayment {
  _id: string;
  user: PaymentUser | null;
  property: PaymentProperty | null;
  guestIdentity?: object | null;
  purpose?: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'canceled';
  reference: string;
  createdAt: string;
  paystackData?: PaystackData;
  metadata?: {
    canceledBy?: string;
    canceledAt?: string;
    cancellationReason?: string;
    [key: string]: unknown;
  };
}

export interface VerifyPaymentResponse {
  verified: boolean;
  payment: {
    _id: string;
    user?: string;
    property?: string | null;
    status: 'pending' | 'paid' | 'failed' | 'canceled';
    reference: string;
    purpose?: string;
    fulfilledAt?: string;
    amount?: number;
    metadata?: {
      paymentPurpose?: string;
      requestedAccessMode?: PaidAccessMode;
      documentId?: string;
      propertyId?: string;
    };
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  role?: UserRole;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface PropertyFilters {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  bedrooms?: number;
  ownerId?: string;
  category?: PropertyCategory;
  completionStage?: PropertyCompletionStage;
  currency?: PropertyCurrency;
  featured?: boolean;
  status?: PropertyStatus;
  north?: number;
  south?: number;
  east?: number;
  west?: number;
  zoom?: number;
  verified?: boolean;
  activityMetric?: 'market_interest' | 'views' | 'saves' | 'inquiries' | 'purchases';
  activityLevel?: 'low' | 'medium' | 'high' | 'very_high';
  activityPeriod?: '7d' | '30d' | '90d';
  page?: number;
  limit?: number;
}

export interface Inquiry {
  id: string;
  propertyId: string;
  fullName: string;
  email: string;
  message: string;
  inquiryType: string;
  status: 'open' | 'closed';
  createdAt: string;
  userId?: string;
  ownerId?: string;
}

export interface CreateInquiryPayload {
  propertyId: string;
  fullName: string;
  email: string;
  message: string;
  inquiryType: string;
}

export interface InquiryProperty {
  _id: string;
  title: string;
  price: number;
  location: string;
}

export interface InquiryUser {
  _id: string;
  name: string;
  email: string;
}

export interface ApiInquiry {
  _id: string;
  property: InquiryProperty | string;
  userId?: string | null;
  user?: InquiryUser;
  ownerId: string;
  fullName: string;
  email: string;
  message: string;
  inquiryType: string;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt?: string;
}

export const resolveInquiryProperty = (property: ApiInquiry['property']): InquiryProperty | null =>
  typeof property === 'string' ? null : property;

export interface TourPropertySummary {
  _id: string;
  title?: string;
  location?: string;
  propertyType?: PropertyType | string;
  media?: MediaItem[];
}

export interface TourParticipant {
  _id: string;
  name: string;
  email?: string;
  role?: UserRole;
}

export interface Tour {
  _id: string;
  propertyId: string | TourPropertySummary;
  buyerId?: string | TourParticipant;
  ownerId?: string | TourParticipant;
  type: TourType;
  mode: TourMode;
  scheduledAt?: string;
  notes?: string;
  status: TourStatus;
  price?: number;
  requiresPayment?: boolean;
  reference?: string;
  redirectUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TourRequestPayload {
  propertyId: string;
  type: TourType;
  mode: TourMode;
  scheduledAt?: string;
  notes?: string;
  paymentOption?: 'cart';
  addToCart?: boolean;
}

export interface CartItemResponse {
  id: string;
  itemType: CartItemType;
  resourceId: string;
  resourceModel: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  description?: string;
  metadata?: Record<string, unknown>;
  addedAt?: string;
}

export interface CartResponse {
  cartId: string;
  currency: 'NGN';
  subtotal: number;
  itemCount: number;
  status: CartStatus;
  items: CartItemResponse[];
}

export type AddCartItemRequest =
  | { itemType: 'title_document_view'; resourceId: string }
  | { itemType: 'proxy_inspection_escrow'; resourceId: string }
  | { itemType: 'property_market_analytics'; accessType?: 'one_time' | 'daily' | 'monthly' }
  | { itemType: 'paid_virtual_tour'; resourceId: string };

export interface CartEligibilityParams {
  itemType: CartItemType;
  resourceId?: string;
  accessType?: 'one_time' | 'daily' | 'monthly';
}

export interface CartEligibilityResponse {
  eligible: boolean;
  amount?: number;
  description?: string;
  reason?: string;
}

export interface CartCheckoutInitializeResponse {
  redirectUrl: string;
  authorizationUrl: string;
  reference: string;
  checkoutId: string;
  totalAmount: number;
  currency: 'NGN';
  pending?: boolean;
}

export interface CartCheckoutItemDetail {
  id: string;
  type: CartItemType;
  resourceId: string;
  description?: string;
  amount: number;
  status: AllocationStatus;
  allocationId?: string;
  failureReason?: string;
}

export interface CartCheckoutDetail {
  checkoutId: string;
  paymentReference?: string;
  totalAmount: number;
  currency: 'NGN';
  status: CartCheckoutStatus;
  expiresAt?: string;
  items: CartCheckoutItemDetail[];
}

export interface CartCheckoutListQuery {
  page?: number;
  limit?: number;
  status?: CartCheckoutStatus;
  startDate?: string;
  endDate?: string;
}

export interface AdminCartCheckoutListQuery extends CartCheckoutListQuery {
  user?: string;
  paymentReference?: string;
}

export interface CartCheckoutListResponse {
  checkouts: CartCheckoutDetail[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminCartCheckoutDetail {
  checkout: CartCheckoutDetail;
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  payment?: ApiPayment;
  allocations?: unknown[];
  platformTransactions?: unknown[];
}

export type InstallmentFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';
export type InstallmentScheduleItemStatus =
  | 'pending'
  | 'due'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'waived'
  | 'cancelled';
export type InstallmentMilestoneType =
  | 'initial_deposit'
  | 'scheduled_payment'
  | 'inspection_completed'
  | 'document_verified'
  | 'construction_stage'
  | 'handover'
  | 'final_payment'
  | 'custom';
export type InstallmentConditionType =
  | 'buyer_confirmation'
  | 'seller_confirmation'
  | 'inspection_completed'
  | 'document_verified'
  | 'construction_stage'
  | 'handover'
  | 'admin_approval'
  | 'custom';

export interface InstallmentNotificationHistory {
  type: string;
  notificationKey?: string;
  status?: 'attempted' | 'sent' | 'failed' | string;
  attemptedAt?: string;
  sentAt?: string;
  failedAt?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

export interface InstallmentCondition {
  _id?: string;
  type: InstallmentConditionType;
  description?: string;
  required?: boolean;
  satisfied?: boolean;
  satisfiedBy?: string | TourParticipant;
  satisfiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TitleVerificationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'revoked'
  | 'superseded';

export type ExternalAnchorStatus =
  | 'not_configured'
  | 'not_requested'
  | 'pending'
  | 'anchoring'
  | 'anchored'
  | 'failed';

export type PropertyTitleVerificationStatus =
  | 'not_submitted'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'revoked';

export type TitleDocumentType =
  | 'survey_plan'
  | 'certificate_of_occupancy'
  | 'deed_of_assignment'
  | 'governors_consent'
  | 'allocation_letter'
  | 'land_purchase_agreement'
  | 'approved_building_plan'
  | 'gazette'
  | 'excision_document'
  | 'other';

export type TitleDocumentPolicyMode = 'private' | 'paid_view_once' | 'paid_view_multiple';
export type PaidAccessMode = 'view_once' | 'view_multiple';

export interface PublicTitleDocument {
  id: string;
  publicReference?: string;
  publicVerificationId?: string | null;
  documentType: TitleDocumentType;
  title: string;
  verificationStatus: TitleVerificationStatus;
  verified: boolean;
  accessMode: TitleDocumentPolicyMode;
  price: number | null;
}

export interface ManagedTitleDocument extends PublicTitleDocument {
  submissionVersion: number;
  previousDocument?: string | null;
  accessPolicy: {
    enabled: boolean;
    mode: TitleDocumentPolicyMode;
    price: number;
  };
  submittedAt?: string;
  rejectionReason?: string | null;
  publicVerificationId?: string | null;
}

export interface TitleDocumentAccessStatus {
  hasAccess: boolean;
  paymentRequired: boolean;
  price: number | null;
  mode?: PaidAccessMode;
  verificationStatus?: TitleVerificationStatus;
  viewed?: boolean;
  remainingViews?: number;
  viewCount?: number;
  message?: string;
}

export interface ViewerSession {
  sessionToken: string;
  contentUrl: string;
  expiresAt: string;
  watermark: {
    heading: string;
    viewer: string;
    access: string;
    property: string;
    timestamp: string;
  };
  controls: {
    download: false;
    print: false;
  };
}

export interface TitleDocumentAnalytics {
  successfulPayments: number;
  uniqueViewers: number;
  totalViews: number;
  consumedViewOnce: number;
  revenue: number;
}

export interface WalletSummary {
  totalCredits: number;
  totalDebits: number;
  netRevenue: number;
  availableRevenue: number;
  transactionCount: number;
  breakdown: {
    titleDocumentViews: number;
    tourPayments: number;
    proxyInspectionRevenue?: number;
    other: number;
    refunds: number;
  };
}

export type WalletTransactionType = 'title_document_view' | 'tour_payment' | 'platform_fee' | 'proxy_inspection_commission' | 'proxy_inspection_buyer_fee' | 'other';
export type WalletTransactionStatus = 'pending' | 'completed' | 'reversed' | 'refunded';

export interface WalletTransaction {
  _id: string;
  type: WalletTransactionType;
  direction: 'credit' | 'debit';
  amount: number;
  paymentReference?: string;
  user?: { _id: string; name: string; email: string } | null;
  guestIdentity?: unknown;
  property?: { _id: string; title: string; publicReference?: string } | null;
  provider?: { _id: string; name: string; email?: string } | null;
  inspectionRequest?: { _id: string; status?: string; agreedPrice?: number } | null;
  serviceEscrow?: {
    _id: string;
    status?: string;
    agreedPrice?: number;
    buyerFeePercentage?: number;
    buyerFeeAmount?: number;
    buyerTotalAmount?: number;
    inspectorCommissionPercentage?: number;
    inspectorCommissionAmount?: number;
    inspectorPayoutAmount?: number;
    totalPlatformRevenue?: number;
    grossAmount?: number;
    platformFeePercentage?: number;
    platformFeeAmount?: number;
    providerAmount?: number;
  } | null;
  document?: {
    _id: string;
    title: string;
    publicReference?: string;
    documentType: TitleDocumentType;
  } | null;
  description?: string;
  status: WalletTransactionStatus;
  createdAt: string;
}

export type TitleRiskSeverity = 'low' | 'medium' | 'high' | 'critical' | string;

export interface TitleRiskFlag {
  _id?: string;
  type: string;
  severity: TitleRiskSeverity;
  message: string;
  relatedProperty?: string | Property;
  relatedVerification?: string;
  detectedAt?: string;
  resolved?: boolean;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
}

export interface TitleVerificationPropertyRef {
  _id?: string;
  id?: string;
  title?: string;
  location?: string;
  status?: string;
}

export interface TitleVerification {
  verificationId: string;
  propertyId?: string | TitleVerificationPropertyRef;
  property?: string | TitleVerificationPropertyRef;
  owner?: string | User;
  document?: string;
  documentType?: TitleDocumentType;
  status: TitleVerificationStatus;
  badgeLabel?: string;
  hashAlgorithm?: string;
  submissionHash?: string | null;
  verifiedDocumentHash?: string | null;
  publicVerificationId?: string | null;
  publicVerificationUrl?: string | null;
  publishedAt?: string | null;
  registryRecordId?: string | null;
  externalAnchorStatus?: ExternalAnchorStatus;
  externalAnchor?: TitleExternalAnchor;
  ledgerTransactionId?: string | null;
  ledgerTransactionUrl?: string | null;
  ledgerNetwork?: string | null;
  fileSizeBytes?: number;
  mimeType?: string;
  originalFileName?: string;
  submittedBy?: string | User;
  submittedAt?: string;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  revocationReason?: string | null;
  revokedAt?: string | null;
  verificationVersion?: number;
  riskFlags?: TitleRiskFlag[];
  previousVerification?: string | null;
}

export interface TitleVerificationLog {
  _id: string;
  action: string;
  previousStatus?: string;
  newStatus?: string;
  note?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface PropertyTitleVerificationSummary {
  status: PropertyTitleVerificationStatus;
  badgeLabel?: string;
  verificationId?: string | null;
  registryRecordId?: string | null;
  publicVerificationId?: string | null;
  verifiedAt?: string | null;
  publishedAt?: string | null;
  externalAnchorStatus?: ExternalAnchorStatus;
  documentHash?: string | null;
  verifiedDocumentHash?: string | null;
}

export interface TitleDocumentRecord {
  _id?: string;
  publicReference?: string | null;
  property?: string;
  owner?: string;
  title?: string;
  documentType?: TitleDocumentType;
  category?: 'title_document' | 'property_document' | 'general' | string;
  resourceType?: 'image' | 'video' | 'raw' | string;
  mimeType?: string;
  originalFileName?: string;
  fileSizeBytes?: number;
  titleVerificationFrozen?: boolean;
  titleVerificationId?: string;
  accessStatusEndpoint?: string;
  viewerEndpoint?: string;
  contentHash?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TitleDocumentReference {
  publicReference?: string | null;
  documentType?: TitleDocumentType;
  verificationStatus?: PropertyTitleVerificationStatus | 'not_submitted';
  publicVerificationId?: string | null;
}

export interface TitleExternalAnchor {
  enabled?: boolean;
  status: ExternalAnchorStatus;
  provider?: string | null;
  network?: string | null;
  transactionId?: string | null;
  transactionUrl?: string | null;
  anchoredAt?: string | null;
  failureReason?: string | null;
}

export interface PublicRegistryRecord {
  publicVerificationId: string;
  publicVerificationUrl?: string;
  registry?: string;
  property?: { id?: string; publicReference?: string; title?: string; location?: string };
  documentType?: TitleDocumentType;
  documentHash?: string;
  hashAlgorithm?: string;
  legalReviewStatus?: string;
  registryStatus: 'active' | 'revoked' | 'superseded' | string;
  verificationVersion?: number;
  sequenceNumber?: number;
  previousRecordHash?: string | null;
  recordHash?: string;
  signature?: string;
  signatureAlgorithm?: string;
  signingKeyId?: string;
  signatureStatus?: 'signed' | 'not_configured' | string;
  approvedAt?: string;
  publishedAt?: string;
  revokedAt?: string | null;
  revocationReason?: string | null;
  supersededBy?: string | null;
  externalAnchor?: TitleExternalAnchor;
  disclaimer?: string;
}

export interface RegistryIntegrity {
  publicVerificationId: string;
  recordHashValid?: boolean;
  signatureValid?: boolean;
  previousRecordLinkValid?: boolean;
  registryStatus?: string;
  externalAnchorStatus?: ExternalAnchorStatus;
}

export interface RegistryDocumentMatchResult {
  matches: boolean;
  publicVerificationId?: string;
  hashAlgorithm?: string;
  uploadedDocumentHash?: string;
  registeredDocumentHash?: string;
  documentHash?: string;
  verificationStatus?: string;
  registryStatus?: string;
  ledgerTransactionId?: string | null;
  message?: string;
}

export interface RegistryPublicKey {
  keyId?: string;
  algorithm?: string;
  publicKey?: string;
  configured: boolean;
}

export interface RegistrySnapshot {
  snapshotDate: string;
  firstSequenceNumber?: number | null;
  lastSequenceNumber?: number | null;
  recordCount?: number;
  snapshotHash?: string;
  previousSnapshotHash?: string | null;
  signature?: string;
  signatureAlgorithm?: string;
  signingKeyId?: string;
  signatureStatus?: string;
  generatedAt?: string;
  externalAnchor?: TitleExternalAnchor & { failureReason?: string | null };
}

export interface RegistrySnapshotManifest {
  snapshotDate: string;
  snapshotHash?: string;
  records: Array<{
    publicVerificationId: string;
    sequenceNumber: number;
    recordHash: string;
  }>;
}

export interface InstallmentScheduleItem {
  _id?: string;
  sequence: number;
  title: string;
  description?: string;
  dueDate?: string;
  expectedAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  outstandingPenaltyAmount?: number;
  status?: InstallmentScheduleItemStatus;
  milestoneType?: InstallmentMilestoneType;
  conditions?: InstallmentCondition[];
  paymentIds?: Array<string | ApiPayment>;
  notificationHistory?: InstallmentNotificationHistory[];
  paidAt?: string;
  dueAt?: string;
  overdueAt?: string;
  completedAt?: string;
  waivedAt?: string;
  cancelledAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LegacyInstallmentSchedule {
  frequency?: InstallmentFrequency | string;
  notes?: string;
}

export interface InstallmentPaymentRecord {
  _id?: string;
  amount: number;
  status?: string;
  reference?: string;
  paidAt?: string;
  createdAt?: string;
  paymentPurpose?: string;
  purpose?: string;
  installment?: string;
  scheduleItem?: string;
}

export type InstallmentPenaltyStatus = 'outstanding' | 'partially_paid' | 'paid' | 'waived' | string;

export interface InstallmentPenaltyRecord {
  _id: string;
  installment: string | Installment;
  scheduleItem?: string;
  intervalNumber?: number;
  penaltyType?: 'percentage' | string;
  percentageValue?: number;
  calculatedAgainstAmount?: number;
  penaltyAmount?: number;
  outstandingAmount?: number;
  paidAmount?: number;
  status?: InstallmentPenaltyStatus;
  reason?: string;
  appliedAt?: string;
  paidAt?: string;
  waivedAt?: string;
  waivedBy?: string | TourParticipant;
  waiverReason?: string;
  paymentIds?: Array<string | ApiPayment>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Installment {
  _id: string;
  property?: Property | TourPropertySummary | string;
  propertyId?: string | Property | TourPropertySummary;
  user?: TourParticipant | string;
  buyer?: TourParticipant | string;
  buyerId?: string | TourParticipant;
  ownerId?: string | TourParticipant;
  totalAmount: number;
  remainingBalance: number;
  paidAmount?: number;
  principalAmount?: number;
  principalPaidAmount?: number;
  principalRemainingBalance?: number;
  totalPenaltyAmount?: number;
  paidPenaltyAmount?: number;
  outstandingPenaltyAmount?: number;
  totalOutstandingBalance?: number;
  frequency?: InstallmentFrequency | string;
  startDate?: string;
  endDate?: string;
  gracePeriodHours?: number;
  defaultAfterDays?: number;
  maximumMissedPayments?: number;
  paymentCount?: number;
  status: InstallmentStatus;
  schedule?: InstallmentScheduleItem[] | LegacyInstallmentSchedule;
  paymentHistory?: InstallmentPaymentRecord[];
  amountPaid?: number;
  totalInstallments?: number;
  installmentsPaid?: number;
  installmentsRemaining?: number;
  nextDueAmount?: number;
  nextDueDate?: string;
  nextPaymentAmount?: number;
  nextPaymentDueDate?: string;
  completedAt?: string;
  overdueAt?: string;
  defaultedAt?: string;
  cancelledAt?: string;
  lastPaymentAt?: string;
  notificationHistory?: InstallmentNotificationHistory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AutomaticInstallmentCreatePayload {
  propertyId: string;
  frequency: Exclude<InstallmentFrequency, 'custom'>;
  numberOfInstallments: number;
  initialDeposit?: number;
  startDate: string;
  gracePeriodHours?: number;
}

export interface CustomInstallmentCreatePayload {
  propertyId: string;
  totalAmount: number;
  gracePeriodHours?: number;
  schedule: Array<{
    sequence: number;
    title: string;
    milestoneType: InstallmentMilestoneType;
    expectedAmount: number;
    dueDate: string;
    conditions?: Array<{
      type: InstallmentConditionType;
      description?: string;
      required?: boolean;
    }>;
  }>;
}

export type InstallmentCreatePayload = AutomaticInstallmentCreatePayload | CustomInstallmentCreatePayload;

export interface InstallmentPaymentPayload {
  amount: number;
  scheduleItemId?: string;
}

export interface InstallmentPaymentResponse {
  installment: Installment;
  redirectUrl: string;
  reference: string;
  amount: number;
  paymentId?: string;
}

export interface InstallmentScheduleResponse {
  installmentId: string;
  nextPaymentDueDate?: string;
  schedule: InstallmentScheduleItem[];
}
