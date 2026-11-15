import api from '../lib/axios';

const privateRead = { headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } };
const enc = (value: string) => encodeURIComponent(value);

export interface Group07Page<T> { items: T[]; nextCursor: string | null }
export interface Group07Trust {
  state: 'new' | 'established' | 'unavailable';
  tier: string | null;
  score: number | null;
  components?: Record<string, { score: number | null; available?: boolean; count?: number | null }>;
  sourceCounts?: Record<string, number | null>;
  rating?: { average: number | null; qualifyingReviewCount: number } | null;
  policyRevisions?: Record<string, number>;
  unavailableCode?: string;
  unavailableSignals?: string[];
  evidenceFingerprint?: string;
  adjustment?: { state: 'staff_adjusted'; decidedAt: string; reviewAt: string };
}
export interface Group07PublicReview {
  id: string; rating?: number; comment?: string; createdAt: string;
  reply?: { text: string; createdAt: string } | null; version?: number;
}
export interface Group07PartnerService {
  id: string; profileId: string; kind: string; serviceKey: string; label: string;
  observational: boolean; currency: string; rateMinor: number; turnaroundHours: number;
  paymentTerm: string; state: string; version: number; bookable: boolean;
  unavailableCode?: string | null; credentialKinds?: string[]; credentialExpiresAt?: string | null;
  specialties?: string[]; serviceAreaStateIds?: string[]; serviceAreaCityIds?: string[];
  serviceAreas?: Array<{ stateId: string; name: string }>;
  serviceAreaCities?: Array<{ cityId: string; stateId: string; name: string }>;
  approvedAt?: string; updatedAt?: string;
}
export interface Group07PublicProfile {
  profileId: string; kind: string; structure: string; roleLabel: string; name: string;
  memberSince?: string; profileImageUrl?: string | null; verified: boolean;
  verifiedAt?: string | null; trust?: Group07Trust | null;
  rating?: { average: number | null; qualifyingReviewCount: number } | null;
  counts?: { followers: number; following: number };
  body?: Record<string, unknown> | null;
}
export interface Group07PartnerProfile {
  profile: Group07PublicProfile; about: string; availability: { status: string; nextAvailableAt?: string | null };
  services: Group07PartnerService[];
  credentials: Array<{ kind: string; label: string; issuerName?: string | null; verifiedAt?: string | null; expiresAt?: string | null; status: 'current' | 'expired' }>;
  indemnityInsurance?: { held: boolean; status?: string; issuerName?: string | null; verifiedAt?: string | null; expiresAt?: string | null };
  specialties: string[]; independentThirdParty: boolean;
}
export interface Group07Question {
  id: string; projectId: string; question: string; answer: { text: string; answeredAt: string } | null;
  createdAt: string; state?: 'pending' | 'approved' | 'rejected'; version: number;
  answerState?: 'none' | 'pending' | 'approved' | 'rejected'; pendingAnswer?: string;
}
export interface Group07ProjectReview {
  id: string; projectId?: string; propertyId?: string; sourceKind?: string; state?: 'pending' | 'approved' | 'rejected';
  badge?: 'verified_buyer' | 'verified_enquirer';
  version: number; ratings: Record<string, number>; comment: string; createdAt: string;
  reply?: { text: string; createdAt: string } | null; replyState?: string;
  postHandoverRatings?: { buildQuality: number; finishing: number; promiseMatch: number } | null;
}
export interface Group07PartnerJob {
  id: string; clientProfileId: string; partnerProfileId: string | null; offeringId: string | null;
  kind: string; serviceKey: string; assignmentMethod: string; propertyId: string | null;
  state: 'awaiting_assignment' | 'offered' | 'declined' | 'accepted' | 'in_progress' | 'report_submitted' | 'report_accepted' | 'report_rejected' | 'report_review_required' | 'completed' | 'cancelled';
  version: number; currency: string; rateMinor: number; paymentTerm: string; dueNowMinor: number;
  balanceMinor: number; paymentState: string; activeDisputeId: string | null;
  appointment: { slotId: string; startsAt: string; endsAt: string; calendarVersion: number } | null;
  videoSession?: { tourId: string; detailPath: string } | null;
  reportAcceptanceDueAt?: string | null; reportAutoAcceptedAt?: string | null;
  reportAcceptanceBlockedCode?: string | null; conflictDeclaration?: string | null;
  report: { state: string; version: number; documentId: string; signedAt: string; submittedAt: string; decidedAt?: string; decisionReason?: string; decisionSource?: string } | null;
  createdAt?: string; updatedAt: string;
  payment?: { id: string; reference: string; state: string; amountMinor: number; currency: string; checkoutUrl: string | null; reconciliationRequired: boolean };
}
export interface Group07PartnerCalendar {
  id: string; version: number; slots: Array<{ slotId: string; startsAt: string; endsAt: string; assignedToIdentityId?: string }>; updatedAt: string;
}
export interface Group07ProfileTrustAppeal {
  id: string; profileId: string; evidenceFingerprint: string; scoringPolicyRevision: number; tierPolicyRevision: number;
  initialScore: number; initialTier: string; reason: string; state: string; version: number;
  adjustedScore: number | null; adjustedTier: string | null; decidedAt: string | null; expiresAt: string | null;
  outcomeDocument: { id: string; state: string; contentPath: string | null; issuanceErrorCode?: string } | null;
  createdAt: string; updatedAt: string; decisionReason?: string;
}
export interface Group07PrivatePost {
  id: string; authorProfileId: string; caption: string; contentKind: 'general' | 'client_story';
  clientStoryConsentDocumentId?: string | null; hashtags: string[]; topic?: string; mediaIds: string[];
  coverMediaId?: string | null; tagKind?: 'property' | 'unit' | 'project' | null; tagId?: string | null;
  serviceKey?: string | null; commentsEnabled: boolean; state: string; version: number;
  scheduledAt?: string | null; publishedAt?: string | null; publicationErrorCode?: string | null;
  reviewReason?: string | null; createdAt: string; updatedAt: string;
}
export interface Group07PublicPost {
  id: string; author: { profileId?: string; name: string; roleLabel?: string; verified?: boolean; trustTier?: string | null };
  caption: string; contentKind: string; hashtags: string[]; topic?: string; media: Array<{ id: string; kind: string; mimeType: string; url: string; coverUrl?: string | null; durationSeconds?: number; captionText?: string; cover?: unknown }>;
  tag?: { kind: string; id: string; title?: string; route?: string } | null; commentsEnabled: boolean; publishedAt: string;
  sponsored?: boolean; sponsorship?: { label: 'Sponsored'; clickPath: string };
}
export interface Group07ShareKit {
  id: string; targetKind: string; targetId: string; state: string; openPath: string | null; shareUrl: string | null;
  card: { title: string; description: string; imageUrl: string | null } | null; qrValue: string | null;
  whatsAppUrl: string | null; printable: { title: string; description: string; imageUrl: string | null; qrValue: string } | null;
  websiteEmbed: { href: string; title: string; description: string; imageUrl: string | null } | null;
  openedCount: number; lastOpenedAt: string | null; createdAt: string;
}
export interface Group07LeadBroadcast {
  id: string; sellerProfileId: string; propertyId: string; title: string; message: string; state: string;
  version: number; scanned: number; delivered: number; skipped: number; lastErrorCode: string | null;
  createdAt: string; updatedAt: string;
}
export interface Group07PromotionProduct {
  productId: string; kind: string; slot: string; mode: 'fixed_package' | 'bidding'; currency: string;
  priceMinor: number | null; durationDays: number | null; minimumBidMinor: number | null; billingEvent: string;
}
export interface Group07AudienceOptions {
  area: { level: 'area'; suggestionsPath: string; requiredParentLevel: 'lga'; valueField: 'id' };
  priceBands: string[]; buyerTypes: string[]; residences: string[]; buyerCountry: { format: string };
}
export interface Group07PromotionCampaign {
  id: string; profileId: string; targetKind: string; targetId: string; audience?: Record<string, unknown> | null;
  transferSourceCampaignId?: string | null; fundingOriginCampaignId?: string | null; productId: string;
  mode: string; slot: string; billingEvent: string; currency: string; bidMinor: number | null;
  netMinor: number; vatMinor: number; grossMinor: number; state: string; pauseCode: string | null;
  startsAt: string | null; expiresAt: string | null; endedAt: string | null; remainingMinor: number;
  spentMinor: number; refundPendingMinor: number; impressions: number; clicks: number; saves: number;
  enquiries: number; viewings: number; costPerEnquiryMinor: number | null; version: number;
  createdAt: string; updatedAt: string; payment?: { id: string; reference: string; state: string; checkoutUrl: string | null; reconciliationRequired: boolean };
}

export const group07Service = {
  publicProfile: async (id: string) => (await api.get<Group07PublicProfile>(`/public/profiles/${enc(id)}`)).data,
  publicFollowers: async (id: string, after?: string | null, limit = 25) => (await api.get<{ followers: Array<{ profileId: string; name: string; roleLabel: string; profileImageUrl?: string | null }>; nextCursor: string | null }>(`/public/profiles/${enc(id)}/followers`, { params: { limit, ...(after ? { after } : {}) } })).data,
  publicReviews: async (id: string, after?: string | null, limit = 25) => (await api.get<{ reviews: Group07PublicReview[]; nextCursor: string | null; average: number | null; qualifyingReviewCount: number }>(`/public/profiles/${enc(id)}/reviews`, { params: { limit, ...(after ? { after } : {}) } })).data,
  replyPublicReview: async (profileId: string, reviewId: string, body: { text: string; expectedVersion: number }) => (await api.post<Group07PublicReview>(`/public/profiles/${enc(profileId)}/reviews/${enc(reviewId)}/reply`, body)).data,
  partnerDirectory: async (params: Record<string, string | number | boolean | undefined>) => (await api.get<{ state: 'ready' | 'unavailable'; code?: string; partners: Array<{ profileId: string; name: string; kind: string; roleLabel: string; structure: string; verified: boolean; profileImageUrl?: string; trust: Group07Trust | null; rating: { average: number | null; qualifyingReviewCount: number } | null; service: Group07PartnerService; serviceAreas: Array<{ stateId: string; name: string }>; serviceAreaCities: Array<{ cityId: string; stateId: string; name: string }>; availability: unknown }>; nextCursor: string | null }>('/partners/directory', { params })).data,
  partnerCities: async (stateId: string, after?: string | null) => (await api.get<{ stateId: string; revision: number; cities: Array<{ cityId: string; stateId: string; name: string }>; nextCursor: string | null }>('/partners/cities', { params: { stateId, limit: 100, ...(after ? { after } : {}) } })).data,
  publicPartner: async (id: string) => (await api.get<{ profile: Group07PublicProfile; about: string; availability: { status: string; nextAvailableAt?: string | null }; services: Group07PartnerService[]; credentials: Group07PartnerProfile['credentials']; indemnityInsurance?: Group07PartnerProfile['indemnityInsurance']; specialties: string[]; independentThirdParty: boolean }>(`/partners/profiles/${enc(id)}`)).data,
  followProfile: async (id: string) => (await api.post<{ following: true; changed: boolean; profile: Group07PublicProfile }>(`/personalisation/following/${enc(id)}`, {})).data,
  unfollowProfile: async (id: string) => (await api.delete<{ following: false; changed: boolean }>(`/personalisation/following/${enc(id)}`)).data,
  followingFeed: async (after?: string | null) => (await api.get<{ items: Array<Record<string, unknown>>; nextCursor: string | null }>('/personalisation/following/feed', { params: { limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  followingProjects: async (after?: string | null, limit = 25) => (await api.get<{ projects: Array<{ project: { id: string; name: string; slug: string; status: string; publishedAt: string }; followedAt: string }>; nextCursor: string | null }>('/personalisation/following/projects', { params: { limit, ...(after ? { after } : {}) }, ...privateRead })).data,
  followProject: async (id: string) => (await api.post<{ following: true; changed: boolean; project: { id: string; name: string; slug: string; status: string; publishedAt: string } }>(`/personalisation/following/projects/${enc(id)}`, {}, privateRead)).data,
  unfollowProject: async (id: string) => (await api.delete<{ following: false; changed: boolean }>(`/personalisation/following/projects/${enc(id)}`, privateRead)).data,
  questions: async (project: string, after?: string | null) => (await api.get<{ questions: Group07Question[]; nextCursor: string | null }>(`/projects/${enc(project)}/questions`, { params: { limit: 25, ...(after ? { after } : {}) } })).data,
  askQuestion: async (project: string, question: string) => (await api.post<{ question: Group07Question }>(`/projects/${enc(project)}/questions`, { question }, privateRead)).data.question,
  manageQuestions: async (project: string, after?: string | null) => (await api.get<{ questions: Group07Question[]; nextCursor: string | null }>(`/projects/${enc(project)}/questions/manage`, { params: { limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  answerQuestion: async (project: string, id: string, body: { answer: string; expectedVersion: number }) => (await api.patch<{ question: Group07Question }>(`/projects/${enc(project)}/questions/${enc(id)}/answer`, body, privateRead)).data.question,
  adminProjectQuestions: async (after?: string | null) => (await api.get<{ questions: Group07Question[]; nextCursor: string | null }>('/admin/project-questions', { params: { limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  moderateProjectQuestion: async (id: string, body: { target: 'question' | 'answer'; decision: 'approve' | 'reject'; expectedVersion: number; reason: string }, challengeId: string) => (await api.patch<{ question: Group07Question }>(`/admin/project-questions/${enc(id)}/moderation`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data.question,
  projectReviews: async (project: string, after?: string | null) => (await api.get<{ reviews: Array<Group07ProjectReview & { badge: 'verified_buyer' | 'verified_enquirer' }>; nextCursor: string | null; summary: { qualifyingReviewCount: number; categoryAverages: Record<string, number | null>; postHandoverReviewCount?: number; postHandoverCategoryAverages?: Record<string, number | null> | null } }>(`/projects/${enc(project)}/reviews`, { params: { limit: 25, ...(after ? { after } : {}) } })).data,
  adminProjectReviews: async (after?: string | null) => (await api.get<{ reviews: Group07ProjectReview[]; nextCursor: string | null }>('/admin/project-reviews', { params: { limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  moderateProjectReview: async (id: string, body: { target: 'review' | 'reply'; decision: 'approve' | 'reject'; expectedVersion: number; reason: string }, challengeId: string) => (await api.patch<{ review: Group07ProjectReview }>(`/admin/project-reviews/${enc(id)}/moderation`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data.review,
  myProjectReview: async (project: string) => (await api.get<{ review: Group07ProjectReview | null }>(`/projects/${enc(project)}/reviews/mine`, privateRead)).data.review,
  createProjectReview: async (project: string, body: { propertyId: string; sourceKind: 'purchase' | 'viewing' | 'checkout'; sourceId: string; ratings: { communication: number; documentation: number; paymentHandling: number }; comment: string; postHandoverRatings?: { buildQuality: number; finishing: number; promiseMatch: number } }) => (await api.post<{ review: Group07ProjectReview }>(`/projects/${enc(project)}/reviews`, body, privateRead)).data.review,
  replyProjectReview: async (project: string, reviewId: string, body: { text: string; expectedVersion: number }) => (await api.patch<{ review: Group07ProjectReview }>(`/projects/${enc(project)}/reviews/${enc(reviewId)}/reply`, body, privateRead)).data.review,
  addPostHandoverProjectReview: async (project: string, reviewId: string, body: { expectedVersion: number; postHandoverRatings: { buildQuality: number; finishing: number; promiseMatch: number } }) => (await api.patch<{ review: Group07ProjectReview }>(`/projects/${enc(project)}/reviews/${enc(reviewId)}/post-handover`, body, privateRead)).data.review,
  trustProfile: async () => (await api.get<{ profileId: string; trust: Group07Trust }>('/trust/v1/profile/me', privateRead)).data,
  trustRelationship: async (profileId: string) => (await api.get<{ profileId: string; trust: Group07Trust }>(`/trust/v1/profile/${enc(profileId)}/relationship`, privateRead)).data,
  createTrustReview: async (profileId: string, body: { sourceKind: 'escrow' | 'partner_job'; sourceId: string; rating: number }) => (await api.post<{ review: { id: string; buyerProfileId: string; reviewerProfileId: string; sourceKind: string; sourceId: string; rating: number; createdAt: string }; changed: boolean }>(`/trust/v1/profile/${enc(profileId)}/relationship/reviews`, body, privateRead)).data,
  trustAppeals: async (after?: string | null) => (await api.get<{ appeals: Group07ProfileTrustAppeal[]; nextCursor: string | null }>('/trust/v1/profile/appeals', { params: { limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  createTrustAppeal: async (body: { expectedEvidenceFingerprint: string; reason: string }) => (await api.post<{ appeal: Group07ProfileTrustAppeal }>('/trust/v1/profile/appeals', body, privateRead)).data.appeal,
  partnerCurrent: async () => (await api.get<{ profileId: string; kind: string; verification: unknown; termsPolicy: unknown; availability: { status: string; nextAvailableAt?: string | null; version?: number }; attention: { newOffers: number; activeJobs: number; reportsForCorrection: number; payoutsAwaiting: number }; about: { text: string; version: number } | string; services: Group07PartnerService[]; catalogue: Array<{ serviceKey: string; label: string; specialties: string[]; paymentTerms: string[] }> }>('/partners/current', privateRead)).data,
  updatePartnerAbout: async (body: { about: string; expectedVersion: number }) => (await api.put<{ text: string; version: number }>('/partners/current/about', body, privateRead)).data,
  updatePartnerService: async (key: string, body: { currency: 'NGN' | 'USD'; rateMinor: number; turnaroundHours: number; paymentTerm: string; expectedVersion: number }, challengeId: string) => (await api.put<Group07PartnerService>(`/partners/current/services/${enc(key)}`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data,
  updatePartnerAvailability: async (body: { status: 'available' | 'busy' | 'unavailable'; nextAvailableAt?: string | null; matchingPoint?: [number, number] | null; expectedVersion: number }) => (await api.put<{ status: string; nextAvailableAt?: string | null; version: number }>('/partners/current/availability', body, privateRead)).data,
  partnerCalendar: async () => (await api.get<{ calendar: Group07PartnerCalendar | null }>('/partners/current/calendar', privateRead)).data.calendar,
  updatePartnerCalendar: async (body: { expectedVersion: number; slots: Array<{ slotId?: string; startsAt: string; endsAt: string; assignedToIdentityId?: string | null }> }) => (await api.put<{ calendar: Group07PartnerCalendar }>('/partners/current/calendar', body, privateRead)).data.calendar,
  partnerJobs: async (params: { state?: string; after?: string | null; limit?: number } = {}) => (await api.get<{ jobs: Group07PartnerJob[]; nextCursor: string | null }>('/partners/jobs', { params: { limit: 25, ...params }, ...privateRead })).data,
  partnerJob: async (id: string) => (await api.get<Group07PartnerJob>(`/partners/jobs/${enc(id)}`, privateRead)).data,
  createPartnerJob: async (body: { kind: string; serviceKey: string; assignmentMethod: 'buyer_choice' | 'automatic' | 'staff'; offeringId?: string; propertyId?: string; clientStateId: string; clientPoint?: [number, number]; operationKey: string }) => (await api.post<Group07PartnerJob>('/partners/jobs', body, privateRead)).data,
  changePartnerJobState: async (id: string, body: Record<string, unknown>, challengeId: string) => (await api.post<Group07PartnerJob>(`/partners/jobs/${enc(id)}/state`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data,
  schedulePartnerJob: async (id: string, body: { expectedVersion: number; expectedCalendarVersion: number; slotId: string }, challengeId: string) => (await api.post<{ job: Group07PartnerJob }>(`/partners/jobs/${enc(id)}/appointment`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data.job,
  submitPartnerJobReport: async (id: string, body: { documentId: string; expectedVersion: number; summary: string; typedName: string }, challengeId: string) => (await api.post<Group07PartnerJob>(`/partners/jobs/${enc(id)}/report`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data,
  decidePartnerJobReport: async (id: string, body: { decision: 'accepted' | 'rejected'; expectedVersion: number; expectedReportVersion: number; reason?: string }, challengeId: string) => (await api.post<Group07PartnerJob>(`/partners/jobs/${enc(id)}/report/decision`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data,
  initializePartnerJobPayment: async (id: string, body: { expectedVersion: number; operationKey: string }, challengeId: string) => (await api.post<{ payment: Group07PartnerJob['payment']; job: Group07PartnerJob }>(`/partners/jobs/${enc(id)}/initialize-payment`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data,
  partnerJobPayment: async (id: string) => (await api.get<{ job: Group07PartnerJob; payments: Array<Record<string, unknown>> }>(`/partners/jobs/${enc(id)}/payment`, privateRead)).data,
  partnerJobDisputes: async (id: string) => (await api.get<{ disputes: Array<Record<string, unknown>>; activeDisputeId: string | null }>(`/partners/jobs/${enc(id)}/disputes`, privateRead)).data,
  createPartnerJobDispute: async (id: string, body: { reason: string; expectedVersion: number; operationKey: string }, challengeId: string) => (await api.post<{ dispute: Record<string, unknown> }>(`/partners/jobs/${enc(id)}/disputes`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data.dispute,
  videoSession: async (tourId: string) => (await api.get<{ tourId: string; version: number; state: string; provider: string; joinAvailable: boolean; joinPath: string | null; lastErrorCode: string | null; readiness?: Record<string, unknown> }>(`/tour/${enc(tourId)}/video-session`, privateRead)).data,
  joinVideoSession: async (tourId: string) => (await api.get<{ joinUrl: string }>(`/tour/${enc(tourId)}/video-session/join`, privateRead)).data.joinUrl,
  reconcileVideoSession: async (tourId: string, body: { meetingId: string; expectedVersion: number }, challengeId: string) => (await api.post<Record<string, unknown>>(`/tour/${enc(tourId)}/video-session/reconcile`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data,
  partnerEarnings: async (after?: string | null) => (await api.get<{ earnings: Array<{ jobId: string; serviceKey: string; jobState: string; currency: string; grossMinor: number; platformFeeMinor: number; netMinor: number; amountPaidMinor: number; paymentState: string; settlementState: string; settledAt: string | null; updatedAt: string }>; nextCursor: string | null }>('/partners/current/earnings', { params: { limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  partnerCertificates: async (after?: string | null) => (await api.get<{ certificates: Array<Record<string, unknown>>; nextCursor: string | null }>('/partners/current/withholding-certificates', { params: { limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  partnerCertificate: async (id: string) => (await api.get<{ certificate: Record<string, unknown> }>(`/partners/current/withholding-certificates/${enc(id)}`, privateRead)).data.certificate,
  createPost: async (body: Partial<Group07PrivatePost>) => (await api.post<{ post: Group07PrivatePost }>('/posts', body, privateRead)).data.post,
  myPosts: async (after?: string | null) => (await api.get<{ posts: Group07PrivatePost[]; nextCursor: string | null }>('/posts/mine', { params: { limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  updatePost: async (id: string, body: Partial<Group07PrivatePost> & { expectedVersion: number }) => (await api.patch<{ post: Group07PrivatePost }>(`/posts/${enc(id)}`, body, privateRead)).data.post,
  submitPost: async (id: string, expectedVersion: number) => (await api.post<{ post: Group07PrivatePost }>(`/posts/${enc(id)}/submit`, { expectedVersion }, privateRead)).data.post,
  uploadPostMedia: async (form: FormData) => (await api.post<{ asset: { id: string; kind: string; mimeType: string; state: string; durationSeconds?: number; width?: number; height?: number; size: number } }>('/posts/media', form, { headers: { 'Cache-Control': 'no-store' } })).data.asset,
  postMedia: async (id: string) => (await api.get<{ asset: { id: string; kind: string; mimeType: string; state: string; size: number; width?: number; height?: number; durationSeconds?: number; captionText?: string; lastFailureCode?: string | null; createdAt: string; updatedAt: string } }>(`/posts/media/${enc(id)}`, privateRead)).data.asset,
  postMediaContent: async (id: string) => (await api.get<Blob>(`/posts/media/${enc(id)}/content`, { ...privateRead, responseType: 'blob' })).data,
  postFeed: async (after?: string | null) => (await api.get<{ posts: Group07PublicPost[]; nextCursor: string | null }>('/posts', { params: { limit: 25, ...(after ? { after } : {}) } })).data,
  profilePosts: async (profileId: string, after?: string | null) => (await api.get<{ posts: Group07PublicPost[]; nextCursor: string | null }>(`/posts/profiles/${enc(profileId)}`, { params: { limit: 25, ...(after ? { after } : {}) } })).data,
  explorePosts: async (after?: string | null) => (await api.get<{ state: 'ranked' | 'newest_fallback'; posts: Group07PublicPost[]; nextCursor: string | null; candidateWindowTruncated: boolean; notice?: string }>('/posts/explore', { params: { limit: 20, ...(after ? { after } : {}) } })).data,
  sponsoredPosts: async (slot: 'explore' | 'following', limit = 10) => (await api.get<{ state: string; posts: Group07PublicPost[]; sponsoredLimit?: number; reasonCode?: string }>('/posts/sponsored', { params: { slot, limit } })).data,
  engagement: async (id: string) => (await api.get<{ postId: string; liked: boolean; saved: boolean; shared: boolean }>(`/posts/${enc(id)}/engagement`, privateRead)).data,
  setEngagement: async (id: string, kind: 'like' | 'save' | 'share', active: boolean) => {
    const path = `/posts/${enc(id)}/engagement/${kind}`;
    const { data } = active
      ? await api.put<{ postId: string; kind: string; active: boolean }>(path, {}, privateRead)
      : await api.delete<{ postId: string; kind: string; active: boolean }>(path, privateRead);
    return data;
  },
  postComments: async (id: string, after?: string | null) => (await api.get<{ comments: Array<{ id: string; postId: string; text: string; author: { profileId?: string; name?: string; roleLabel?: string } | null; createdAt: string; updatedAt: string }>; nextCursor: string | null }>(`/posts/${enc(id)}/comments`, { params: { limit: 25, ...(after ? { after } : {}) } })).data,
  createComment: async (id: string, text: string) => (await api.post<{ comment: { id: string; postId: string; state: string; version: number; text: string; createdAt: string } }>(`/posts/${enc(id)}/comments`, { text }, privateRead)).data.comment,
  createContentReport: async (body: { subjectKind: 'account' | 'listing' | 'post' | 'comment' | 'review' | 'message'; subjectId: string; reason: string; details?: string; operationKey: string }) => (await api.post('/posts/reports', body, privateRead)).data,
  myReports: async (after?: string | null) => (await api.get<{ reports: Array<Record<string, unknown>>; nextCursor: string | null }>('/posts/reports/mine', { params: { limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  socialModerationQueue: async (kind: 'posts' | 'comments' | 'reports', after?: string | null) => (await api.get<Record<string, unknown>>(`/admin/social/${kind}`, { params: { limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  adminSocialPostMedia: async (postId: string, assetId: string) => (await api.get<Blob>(`/admin/social/posts/${enc(postId)}/media/${enc(assetId)}/content`, { ...privateRead, responseType: 'blob' })).data,
  decideSocialItem: async (kind: 'posts' | 'comments' | 'reports', id: string, body: Record<string, unknown>, challengeId: string) => (await api.post<Record<string, unknown>>(`/admin/social/${kind}/${enc(id)}/decision`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data,
  clientStoryConsentForm: async () => (await api.get<{ documentType: 'client_story_consent'; title: string; body: string; requiresWetInk: boolean; textSource: string; policyRevision: number; signingRequirement: unknown }>('/posts/client-story-consent-form')).data,
  featuredPosts: async (slot: 'homepage' | 'category' | 'newsletter' | 'explore') => (await api.get<{ state: 'configured' | 'unconfigured'; posts: Group07PublicPost[]; policyRevision?: number }>('/posts/featured', { params: { slot } })).data,
  promotionCatalogue: async (targetKind: 'post' | 'partner_service' | 'directory_spotlight', targetId: string) => (await api.get<{ state: string; products: Group07PromotionProduct[]; audienceOptions: Group07AudienceOptions; policyRevision?: number; paymentState?: string; reasonCode?: string }>('/posts/promotions/catalogue', { params: { targetKind, targetId } })).data,
  createPromotion: async (body: Record<string, unknown>, challengeId: string) => (await api.post<{ campaign: Group07PromotionCampaign; idempotent: boolean }>('/posts/promotions', body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data,
  myPromotions: async (after?: string | null) => (await api.get<{ campaigns: Group07PromotionCampaign[]; nextCursor: string | null }>('/posts/promotions/mine', { params: { limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  promotionDetail: async (id: string) => (await api.get<{ campaign: Group07PromotionCampaign; refund: unknown; transfer: unknown; organicComparison: { state: string; period: { from: string; to: string } | null; impressions: { sponsored: number; organic: number | null }; definition?: string } }>(`/posts/promotions/${enc(id)}`, privateRead)).data,
  endPromotion: async (id: string, body: Record<string, unknown>, challengeId: string) => (await api.post<Record<string, unknown>>(`/posts/promotions/${enc(id)}/end`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data,
  shareKits: async (after?: string | null) => (await api.get<{ kits: Group07ShareKit[]; nextCursor: string | null }>('/posts/share-kits', { params: { limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  createShareKit: async (body: { targetKind: 'post' | 'property' | 'project'; targetId: string; operationKey: string }) => (await api.post<{ kit: Group07ShareKit }>('/posts/share-kits', body, privateRead)).data.kit,
  revokeShareKit: async (id: string) => (await api.post<{ kit: Group07ShareKit }>(`/posts/share-kits/${enc(id)}/revoke`, {}, privateRead)).data.kit,
  leadBroadcasts: async (after?: string | null) => (await api.get<{ broadcasts: Group07LeadBroadcast[]; nextCursor: string | null }>('/posts/lead-broadcasts', { params: { limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  leadBroadcast: async (id: string) => (await api.get<{ broadcast: Group07LeadBroadcast }>(`/posts/lead-broadcasts/${enc(id)}`, privateRead)).data.broadcast,
  createLeadBroadcast: async (body: { propertyId: string; title: string; message: string; operationKey: string }) => (await api.post<{ broadcast: Group07LeadBroadcast }>('/posts/lead-broadcasts', body, privateRead)).data.broadcast,
  cancelLeadBroadcast: async (id: string, expectedVersion: number) => (await api.post<{ broadcast: Group07LeadBroadcast }>(`/posts/lead-broadcasts/${enc(id)}/cancel`, { expectedVersion }, privateRead)).data.broadcast,
  retryLeadBroadcast: async (id: string, expectedVersion: number) => (await api.post<{ broadcast: Group07LeadBroadcast }>(`/posts/lead-broadcasts/${enc(id)}/retry`, { expectedVersion }, privateRead)).data.broadcast,
  adminPartnerJobs: async (state: string, after?: string | null) => (await api.get<{ jobs: Group07PartnerJob[]; nextCursor: string | null }>('/admin/partner-jobs', { params: { state, limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  adminPartnerServices: async (after?: string | null) => (await api.get<{ services: Group07PartnerService[]; nextCursor: string | null }>('/admin/partner-services', { params: { limit: 100, ...(after ? { after } : {}) }, ...privateRead })).data,
  reviewPartnerService: async (id: string, body: { decision: 'approved' | 'rejected'; expectedVersion: number; reason: string }, challengeId: string) => (await api.post<Group07PartnerService>(`/admin/partner-services/${enc(id)}/review`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data,
  adminPartnerJob: async (id: string) => (await api.get<Group07PartnerJob>(`/admin/partner-jobs/${enc(id)}`, privateRead)).data,
  assignAdminPartnerJob: async (id: string, body: { offeringId: string; expectedVersion: number }, challengeId: string) => (await api.post<Group07PartnerJob>(`/admin/partner-jobs/${enc(id)}/assign`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data,
  reviewAdminPartnerJobReport: async (id: string, body: Record<string, unknown>, challengeId: string) => (await api.post<Group07PartnerJob>(`/admin/partner-jobs/${enc(id)}/report/review`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data,
  adminPartnerDisputes: async (state = 'open', after?: string | null) => (await api.get<{ disputes: Array<Record<string, unknown>>; nextCursor: string | null }>('/admin/partner-job-disputes', { params: { state, limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  decideAdminPartnerDispute: async (id: string, body: Record<string, unknown>, challengeId: string) => (await api.post<{ dispute: Record<string, unknown> }>(`/admin/partner-job-disputes/${enc(id)}/decision`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data.dispute,
  partnerSettlement: async (id: string) => (await api.get<{ settlement: Record<string, unknown> | null }>(`/admin/partner-jobs/${enc(id)}/settlement`, privateRead)).data.settlement,
  releasePartnerSettlement: async (id: string, expectedVersion: number, challengeId: string) => (await api.post<{ settlement: Record<string, unknown> }>(`/admin/partner-jobs/${enc(id)}/settlement/release`, { expectedVersion }, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data.settlement,
  reconcilePartnerSettlement: async (id: string, expectedVersion: number, challengeId: string) => (await api.post<{ settlement: Record<string, unknown> }>(`/admin/partner-jobs/${enc(id)}/settlement/reconcile`, { expectedVersion }, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data.settlement,
  authorizePartnerBeneficiary: async (id: string, beneficiaryId: string, body: { expectedVersion: number; authorizationCode: string }, challengeId: string) => (await api.post<{ settlement: Record<string, unknown> }>(`/admin/partner-jobs/${enc(id)}/settlement/beneficiaries/${enc(beneficiaryId)}/authorize`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data.settlement,
  partnerRefundExecution: async (disputeId: string) => (await api.get<{ refund: Record<string, unknown> | null }>(`/admin/partner-job-disputes/${enc(disputeId)}/refund-execution`, privateRead)).data.refund,
  preparePartnerRefund: async (disputeId: string, body: { expectedVersion: number; expectedJobVersion: number }, challengeId: string) => (await api.post<{ refund: Record<string, unknown> }>(`/admin/partner-job-disputes/${enc(disputeId)}/refund-execution/prepare`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data.refund,
  initiatePartnerRefund: async (disputeId: string, body: { expectedVersion: number }, challengeId: string) => (await api.post<{ refund: Record<string, unknown> }>(`/admin/partner-job-disputes/${enc(disputeId)}/refund-execution/initiate`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data.refund,
  authorizePartnerRefund: async (disputeId: string, body: { expectedVersion: number; authorizationCode: string }, challengeId: string) => (await api.post<{ refund: Record<string, unknown> }>(`/admin/partner-job-disputes/${enc(disputeId)}/refund-execution/authorize`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data.refund,
  reconcilePartnerRefund: async (disputeId: string, body: { expectedVersion: number }, challengeId: string) => (await api.post<{ refund: Record<string, unknown> }>(`/admin/partner-job-disputes/${enc(disputeId)}/refund-execution/reconcile`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data.refund,
  adminProfileAppeals: async (state = 'open', after?: string | null) => (await api.get<{ appeals: Group07ProfileTrustAppeal[]; nextCursor: string | null }>('/trust/v1/admin/profile-appeals', { params: { state, limit: 25, ...(after ? { after } : {}) }, ...privateRead })).data,
  decideProfileAppeal: async (id: string, body: Record<string, unknown>, challengeId: string) => (await api.patch<{ appeal: Group07ProfileTrustAppeal }>(`/trust/v1/admin/profile-appeals/${enc(id)}`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data.appeal,
  profileDisputeImpact: async (kind: 'escrow' | 'partner_job', id: string) => (await api.get<{ impact: Record<string, unknown> }>(`/trust/v1/admin/disputes/${kind}/${enc(id)}/impact`, privateRead)).data.impact,
  updateProfileDisputeImpact: async (kind: 'escrow' | 'partner_job', id: string, body: Record<string, unknown>, challengeId: string) => (await api.patch<{ impact: Record<string, unknown> }>(`/trust/v1/admin/disputes/${kind}/${enc(id)}/impact`, body, { headers: { 'X-Step-Up-Challenge': challengeId, 'Cache-Control': 'no-store' } })).data.impact,
};
