export type EntityRef<T> = string | T;
export type ProfessionalType = 'real_estate_agent' | 'property_inspector' | 'civil_engineer' | 'structural_engineer' | 'architect' | 'surveyor' | 'lawyer' | 'valuer' | 'building_professional' | 'other';
export type VerificationStatus = 'registration_pending' | 'kyc_pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
export type AvailabilityStatus = 'available' | 'busy' | 'unavailable';
export type RequestedService = 'physical_inspection' | 'recorded_video_walkthrough' | 'photos' | 'condition_report' | 'neighbourhood_review' | 'location_confirmation' | 'document_observation' | 'custom';
export type ProxyInspectionStatus = 'requested' | 'negotiating' | 'awaiting_price_confirmation' | 'awaiting_payment' | 'funded' | 'scheduled' | 'in_progress' | 'completion_submitted' | 'awaiting_buyer_confirmation' | 'release_pending' | 'completed' | 'disputed' | 'cancelled' | 'refund_pending' | 'refunded';
export type ServiceEscrowStatus = 'awaiting_payment' | 'funded' | 'service_in_progress' | 'completion_submitted' | 'release_pending' | 'release_processing' | 'released' | 'disputed' | 'cancelled' | 'refund_pending' | 'refund_processing' | 'refunded' | 'refund_failed';
export type EvidenceType = 'video' | 'image' | 'document' | 'other';
export type EvidenceCategory = 'walkthrough_video' | 'inspection_photo' | 'supporting_document' | 'other';
export type ReportCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'not_inspected' | 'not_applicable';
export type ReportRecommendation = 'recommended' | 'recommended_with_concerns' | 'further_professional_review_required' | 'not_recommended' | 'neutral';
export type DisputeResolution = 'resume_service' | 'refund_buyer' | 'release_inspector' | 'cancel_and_refund';
export type MessageKind = 'user' | 'system' | 'administrative';

export interface PublicInspectorProfile {
  _id: string;
  user: EntityRef<{ _id: string; name: string }>;
  professionalType: ProfessionalType;
  professionalTitle?: string; bio?: string; yearsOfExperience?: number; specialties?: string[];
  profilePhoto?: { url?: string; public_id?: string };
  location?: { country?: string; state?: string; city?: string; coordinates?: { lat?: number; lng?: number } };
  serviceAreas?: string[]; availabilityStatus: AvailabilityStatus;
  verificationStatus?: VerificationStatus; isSearchable?: boolean;
  ratingAverage: number; ratingCount: number; completedJobs: number; responseRate?: number;
  approvedAt?: string; createdAt: string;
}
export interface ProxyInspectionRequest {
  _id: string;
  property: EntityRef<{ _id: string; title: string; publicReference?: string; location?: unknown; media?: unknown[]; status?: string; approvalStatus?: string }>;
  buyer: EntityRef<{ _id: string; name: string; email?: string; role: 'buyer' }>;
  inspector: EntityRef<{ _id: string; name: string; email?: string; role: 'proxy_inspector' }>;
  inspectorProfile: EntityRef<PublicInspectorProfile>;
  conversation?: string; requestedServices: RequestedService[]; customRequirements?: string;
  preferredDate?: string; scheduledAt?: string; status: ProxyInspectionStatus;
  proposedPrice?: number; proposedBy?: string; buyerPriceConfirmed: boolean; inspectorPriceConfirmed: boolean;
  agreedPrice?: number; priceLockedAt?: string; startedAt?: string; completionSubmittedAt?: string;
  buyerConfirmedAt?: string; completedAt?: string; cancelledAt?: string; reportLockedAt?: string;
  createdAt: string; updatedAt: string;
}
export interface ServiceEscrow {
  _id: string; serviceType: 'proxy_inspection'; serviceReference: string; payer: string; provider: string;
  grossAmount: number; platformFeePercentage: number; platformFeeAmount: number; providerAmount: number;
  payment?: unknown; paymentReference?: string; transferReference?: string; refundReference?: string;
  status: ServiceEscrowStatus; fundedAt?: string; releaseRequestedAt?: string; releasedAt?: string; refundedAt?: string;
}
export interface ProxyEvidence {
  _id: string; inspectionRequest: string; uploadedBy: string; type: EvidenceType; category: EvidenceCategory;
  accessUrl: string; mimeType?: string; fileSize?: number; duration?: number; caption?: string; uploadedAt?: string;
}
export interface ReportSection { key: string; title: string; condition: ReportCondition; comments?: string }
export interface ProxyInspectionReport {
  _id: string; inspectionRequest: string; inspector: string; property: string; inspectionDate?: string;
  sections: ReportSection[]; visibleDefects?: string[]; positiveObservations?: string[];
  neighbourhoodComments?: string; roadAccessComments?: string; utilityComments?: string;
  locationConfirmed?: boolean; recommendation?: ReportRecommendation; summary?: string;
  declarationAccepted: boolean; declarationText?: string; signedByName?: string; signedAt?: string; submittedAt?: string;
}
export interface ProxyInspectionDispute {
  _id: string; inspectionRequest: string; serviceEscrow: string; raisedBy: string; reason: string; description?: string;
  status: 'open' | 'under_review' | 'corrections_requested' | 'refund_processing' | 'release_processing' | 'resolved';
  resolution?: DisputeResolution; resolutionNotes?: string; resolvedBy?: string; resolvedAt?: string; createdAt: string;
}
export interface ProxyAuditEntry { _id: string; action: string; oldStatus?: string; newStatus?: string; createdAt: string; actor?: EntityRef<{ _id: string; name: string }> }
export interface ProxyMessage {
  _id: string; sender?: EntityRef<{ _id: string; name: string; role: string }>; text: string;
  kind: MessageKind; read?: boolean; createdAt: string;
}
export interface ProxyConversation { _id: string; type: 'proxy_inspection'; property?: string; inspectionRequest?: string; participants?: Array<{ _id: string; name: string; role: string }> }
export interface ProxyConversationResponse { conversation: ProxyConversation; messages: ProxyMessage[] }
export interface ProxyInspectionDetail {
  request: ProxyInspectionRequest; serviceEscrow: ServiceEscrow | null; report: ProxyInspectionReport | null;
  evidence: ProxyEvidence[]; dispute: ProxyInspectionDispute | null; auditHistory?: ProxyAuditEntry[]; conversation?: ProxyConversationResponse;
  payoutAccount?: PayoutAccount | null;
}
export interface PayoutAccount { _id?: string; user?: string; maskedAccountNumber: string; bankName: string; verifiedAccountName: string; verifiedAt: string }
export interface ProxyInspectorReview { _id: string; inspectionRequest: string; buyer: string; inspector: string; rating: number; professionalism?: number; accuracy?: number; communication?: number; timeliness?: number; comment?: string; createdAt: string }
export interface ProxyKycDocument { label?: string; mimeType?: string; accessUrl?: string; verificationStatus?: 'unverified' | 'verified' | 'rejected' }
export interface AdminInspectorProfile extends Omit<PublicInspectorProfile, 'user'> {
  user: EntityRef<{ _id: string; name: string; email?: string; phone?: string; role?: 'proxy_inspector'; kyc?: { fullLegalName?: string; address?: string; nationalId?: string; status?: string; submittedAt?: string; idDocumentUrl?: string; selfieUrl?: string; professionalDocuments?: ProxyKycDocument[] } }>;
  rejectionReason?: string; suspensionReason?: string; suspendedAt?: string;
}
export interface AdminInspectorDetail { profile: AdminInspectorProfile; jobCount: number; disputeCount: number; payoutAccount: PayoutAccount | null; payoutSummary: unknown[]; reviews: ProxyInspectorReview[] }
export type InspectorListResponse = { inspectors: PublicInspectorProfile[]; total: number; page: number; limit: number };
export type RequestListResponse = { requests: ProxyInspectionRequest[]; total: number; page: number; limit: number };
export type AdminInspectorListResponse = { inspectors: AdminInspectorProfile[]; total: number; page: number; limit: number };
export interface ProxyApiErrorDetails { missing?: string[]; [key: string]: unknown }
export interface ProxyPaymentVerificationResponse { verified: boolean; payment: { _id: string; user?: string; property?: string; amount?: number; purpose?: string; serviceEscrow?: string; proxyInspectionRequest?: string; status: string; reference: string; fulfilledAt?: string } }
export interface ProxyRegistrationResponse { message: string; user: { _id: string; role: 'proxy_inspector'; emailVerified: boolean }; profile: { _id: string; verificationStatus: VerificationStatus; isSearchable: boolean }; nextStep: string }
export interface KycSubmissionResponse { status: string; verificationStatus: VerificationStatus; submittedAt: string }
export interface PaymentInitializationResponse { redirectUrl?: string; reference: string; pending?: boolean; message?: string }
export interface PublicInspectorFilters { state?: string; city?: string; serviceArea?: string; professionalType?: ProfessionalType; specialty?: string; minimumRating?: number; availability?: AvailabilityStatus; search?: string; latitude?: number; longitude?: number; radius?: number; page?: number; limit?: number }
export interface InspectionListFilters { status?: ProxyInspectionStatus; property?: string; inspector?: string; buyer?: string; from?: string; to?: string; page?: number; limit?: number }
export interface AdminInspectorFilters {
  verificationStatus?: VerificationStatus;
  professionalType?: ProfessionalType;
  location?: string;
  state?: string;
  city?: string;
  serviceArea?: string;
  specialty?: string;
  minimumRating?: number;
  availability?: AvailabilityStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
