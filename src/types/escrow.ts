import type { ApiPayment, MediaItem, Property, User } from './index';

export type EscrowStatus =
  | 'pending_payment' | 'locked' | 'release_pending' | 'released' | 'disputed'
  | 'refund_pending' | 'refund_processing' | 'refund_failed' | 'refunded'
  | 'release_processing' | 'cancellation_pending_refund'
  | 'cancelled' | 'cancelled_refunded';
export type RefundStatus =
  | 'none' | 'pending' | 'processing' | 'needs_account_details'
  | 'completed' | 'failed';
export type SellerPayoutStatus = 'none' | 'processing' | 'completed' | 'failed' | 'reversed';
export type EscrowDisputeStatus =
  | 'open' | 'under_review' | 'awaiting_refund'
  | 'awaiting_seller_release' | 'resolved' | 'cancelled';
export type EscrowDisputeResolution =
  | 'reopened' | 'refund_buyer' | 'release_seller' | 'cancel_escrow';
export type EscrowDisputeAction =
  | 'reopen' | 'refund_buyer' | 'release_seller' | 'cancel_escrow';
export type EscrowRuleType =
  | 'buyer_confirmation_required' | 'seller_confirmation_required' | 'admin_approval_required'
  | 'inspection_completed' | 'document_verified' | 'title_document_uploaded'
  | 'physical_handover_completed' | 'release_after_days' | 'custom_manual_condition';

export type EscrowMetadata = Record<string, unknown>;
export type EscrowParty = Pick<User, '_id' | 'name' | 'email' | 'role'>;
export interface EscrowParticipantIdentity {
  profileId: string;
  name: string;
}
export interface EscrowParticipants {
  buyer: EscrowParticipantIdentity | null;
  seller: EscrowParticipantIdentity | null;
}
export type EscrowProperty = Pick<Property, '_id' | 'publicReference' | 'title' | 'price' | 'location' | 'currency' | 'propertyType' | 'media' | 'status'> & { media: MediaItem[] };

export interface EscrowRule {
  _id: string;
  /** Some escrow projections serialize rule identifiers as `id`. */
  id?: string;
  sequence?: number;
  type: EscrowRuleType;
  description: string;
  required: boolean;
  amount?: number;
  satisfied?: boolean;
  isSatisfied?: boolean;
  satisfiedAt?: string | null;
  satisfiedBy?: EscrowParty | string | null;
  note?: string;
  metadata?: EscrowMetadata;
}

export interface EscrowMilestoneSummary {
  configured: boolean;
  totalAllocated: number;
  satisfiedAmount: number;
  remainingAmount: number;
  milestoneCount: number;
  satisfiedMilestoneCount: number;
}

export interface EscrowLog {
  _id?: string;
  action: string;
  actor?: EscrowParty | string | null;
  actorId?: EscrowParty | string | null;
  fromStatus?: EscrowStatus;
  toStatus?: EscrowStatus;
  status?: EscrowStatus;
  note?: string;
  metadata?: EscrowMetadata;
  createdAt: string;
}

export interface RefundDetails {
  accountName?: string;
  verifiedAccountName?: string;
  accountNumber?: string;
  maskedAccountNumber?: string;
  bankName: string;
  bankCode: string;
  recipientCode?: string | null;
  submittedBy?: EscrowParty | string;
  submittedAt?: string;
}

export interface RefundConversation {
  _id: string;
  escrow: Escrow | string;
  buyer: EscrowParty | string;
  admin?: EscrowParty | string | null;
  status: 'open' | 'closed';
  closedAt?: string | null;
}

export interface RefundMessage {
  _id: string;
  sender: EscrowParty | string;
  message: string;
  createdAt: string;
}

export interface RefundChatResponse { conversation: RefundConversation | null; messages: RefundMessage[] }
export interface RefundDetailsPayload { accountNumber: string; bankName: string; bankCode: string }
export interface ProcessRefundResponse { escrow?: Escrow; message?: string }

export interface EscrowDispute {
  _id?: string;
  id?: string;
  escrow: Escrow | string;
  /** Legacy/raw dispute projections may include the actor reference. */
  raisedBy?: EscrowParty | string;
  /** Safe identity projection returned on escrow detail disputes. */
  openedBy?: EscrowParticipantIdentity | null;
  raisedAgainst?: EscrowParty | string;
  reason: string;
  description?: string;
  evidence: Record<string, unknown>[];
  status: EscrowDisputeStatus;
  preDisputeStatus: 'locked' | 'release_pending';
  resolution?: EscrowDisputeResolution;
  resolutionReason?: string;
  resolvedBy?: EscrowParty | string;
  openedAt: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableDisputeActions {
  reopen: boolean;
  refundBuyer: boolean;
  releaseSeller: boolean;
  cancelEscrow: boolean;
}

export interface CreateEscrowDisputePayload {
  reason: string;
  description?: string;
  evidence?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
}

export interface EscrowDisputeListQuery {
  page?: number;
  limit?: number;
  status?: EscrowDisputeStatus;
  escrow?: string;
  buyer?: string;
  seller?: string;
  property?: string;
  search?: string;
}

export interface EscrowDisputeListResponse {
  items: Array<SafeEscrowDispute & { escrow: Record<string, unknown> | null }>;
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface SafeEscrowDispute {
  id: string;
  reason: string;
  description: string | null;
  status: EscrowDisputeStatus;
  preDisputeStatus: string;
  resolution: string | null;
  openedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EscrowFinancialRecord {
  _id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  method?: string;
  transferReference?: string;
}

export interface AdminEscrowDisputeDetail {
  dispute: SafeEscrowDispute;
  escrow: Record<string, unknown> | null;
  milestones: {
    all: unknown[];
    satisfied: unknown[];
    outstanding: unknown[];
  };
  financialState: {
    paymentStatus?: string;
    refund?: EscrowFinancialRecord | null;
    sellerPayout?: EscrowFinancialRecord | null;
  };
  history: unknown[];
  logs: unknown[];
  availableActions: AvailableDisputeActions;
}

export interface ResolveEscrowDisputePayload {
  action: EscrowDisputeAction;
  reason: string;
}

export interface ResolveEscrowDisputeResponse {
  escrow?: Partial<Escrow> & Pick<Escrow, '_id' | 'status'>;
  dispute?: Partial<EscrowDispute> & Pick<EscrowDispute, '_id'>;
  refund?: EscrowFinancialRecord;
  payout?: EscrowFinancialRecord;
  pending?: boolean;
  reused?: boolean;
  reconciliationRequired?: boolean;
}

export interface RefundAccountDetailsResponse {
  accountName: string;
  maskedAccountNumber: string;
  bankName: string;
  submittedAt: string;
}

export interface PayoutAccount {
  configured: boolean;
  maskedAccountNumber?: string;
  bankName?: string;
  verifiedAccountName?: string;
  verifiedAt?: string;
}

export interface PayoutAccountPayload {
  accountNumber: string;
  bankCode: string;
  bankName: string;
}

export interface Escrow {
  _id: string;
  /** Some safe API projections expose `id` instead of Mongoose's `_id`. */
  id?: string;
  property?: EscrowProperty | string;
  propertyId?: EscrowProperty | string;
  buyer?: EscrowParty | string;
  buyerId?: EscrowParty | string;
  seller?: EscrowParty | string;
  sellerId?: EscrowParty | string;
  /** Added by GET /api/escrow/:id; list responses do not include this projection. */
  participants?: EscrowParticipants | null;
  payment?: ApiPayment | string | null;
  paymentId?: ApiPayment | string | null;
  amount: number;
  currency?: string;
  status: EscrowStatus;
  refundStatus?: RefundStatus;
  sellerPayoutStatus?: SellerPayoutStatus;
  refundDetails?: RefundDetails | null;
  refundReference?: string | null;
  refundProvider?: string | null;
  refundProviderResponse?: Record<string, unknown>;
  refundFailureReason?: string | null;
  refundRequestedAt?: string | null;
  refundProcessingAt?: string | null;
  refundedAt?: string | null;
  rules?: EscrowRule[];
  disputes?: EscrowDispute[];
  milestoneSummary?: EscrowMilestoneSummary;
  logs?: EscrowLog[];
  metadata?: EscrowMetadata;
  paymentReference?: string;
  createdAt: string;
  updatedAt?: string;
  lockedAt?: string;
  releaseRequestedAt?: string;
  releasedAt?: string;
  cancelledAt?: string;
  disputedAt?: string;
}

export interface EscrowMilestoneInput {
  type: EscrowRuleType;
  description: string;
  required?: boolean;
  amount?: number;
  metadata?: EscrowMetadata;
}

export interface CreateEscrowRule extends EscrowMilestoneInput {
  required: boolean;
}

export interface CreateEscrowPayload { propertyId: string; amount: number; rules?: CreateEscrowRule[]; metadata?: EscrowMetadata }
export interface InitializeEscrowPaymentResponse { redirectUrl?: string; reference: string; paymentId?: string; escrowId: string; pending?: boolean; status?: string; reconciliationRequired?: boolean }
export interface SatisfyEscrowRuleResponse {
  escrow: Pick<Escrow, '_id' | 'status' | 'amount'>;
  rule: EscrowRule;
  missingRules: Array<Pick<EscrowRule, '_id'> & Partial<EscrowRule>>;
  milestoneSummary: EscrowMilestoneSummary;
}

export type EscrowMilestone = EscrowRule;

export const populated = <T extends { _id: string }>(value?: T | string | null): T | null => value && typeof value !== 'string' ? value : null;
const populatedFrom = <T extends { _id: string }>(
  values: Array<T | string | null | undefined>,
  isPreferred?: (value: T) => boolean,
): T | null => {
  const references = values.map((value) => populated(value)).filter((value): value is T => value !== null);
  return references.find((value) => isPreferred?.(value)) ?? references[0] ?? null;
};

export const escrowProperty = (escrow: Escrow) => populatedFrom(
  [escrow.property, escrow.propertyId],
  (value) => Array.isArray(value.media) && value.media.some((media) =>
    Boolean(media?.url) && media.type !== 'video' && media.resourceType !== 'video' &&
    (media.type === 'image' || media.resourceType === 'image'),
  ),
);
export const escrowBuyer = (escrow: Escrow) => populatedFrom(
  [escrow.buyer, escrow.buyerId],
  (value) => typeof value.name === 'string' && Boolean(value.name.trim()),
);
export const escrowSeller = (escrow: Escrow) => populatedFrom(
  [escrow.seller, escrow.sellerId],
  (value) => typeof value.name === 'string' && Boolean(value.name.trim()),
);
export const escrowPayment = (escrow: Escrow) => populatedFrom([escrow.payment, escrow.paymentId]);
export const isRuleSatisfied = (rule: EscrowRule) => Boolean(rule.satisfied ?? rule.isSatisfied);
