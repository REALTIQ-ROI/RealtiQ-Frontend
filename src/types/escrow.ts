import type { ApiPayment, MediaItem, Property, User } from './index';

export type EscrowStatus = 'pending_payment' | 'locked' | 'release_pending' | 'released' | 'disputed' | 'cancelled' | 'refunded';
export type EscrowRuleType =
  | 'buyer_confirmation_required' | 'seller_confirmation_required' | 'admin_approval_required'
  | 'inspection_completed' | 'document_verified' | 'title_document_uploaded'
  | 'physical_handover_completed' | 'release_after_days' | 'custom_manual_condition';

export type EscrowMetadata = Record<string, unknown>;
export type EscrowParty = Pick<User, '_id' | 'name' | 'email' | 'role'>;
export type EscrowProperty = Pick<Property, '_id' | 'title' | 'price' | 'location' | 'currency' | 'propertyType' | 'media' | 'status'> & { media: MediaItem[] };

export interface EscrowRule {
  _id: string;
  type: EscrowRuleType;
  description: string;
  required: boolean;
  satisfied?: boolean;
  isSatisfied?: boolean;
  satisfiedAt?: string;
  satisfiedBy?: EscrowParty | string | null;
  note?: string;
  metadata?: EscrowMetadata;
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

export interface Escrow {
  _id: string;
  property?: EscrowProperty | string;
  propertyId?: EscrowProperty | string;
  buyer?: EscrowParty | string;
  buyerId?: EscrowParty | string;
  seller?: EscrowParty | string;
  sellerId?: EscrowParty | string;
  payment?: ApiPayment | string | null;
  paymentId?: ApiPayment | string | null;
  amount: number;
  currency?: string;
  status: EscrowStatus;
  rules: EscrowRule[];
  logs: EscrowLog[];
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

export interface CreateEscrowRule {
  type: EscrowRuleType;
  description: string;
  required: boolean;
  metadata?: EscrowMetadata;
}

export interface CreateEscrowPayload { propertyId: string; amount: number; rules?: CreateEscrowRule[]; metadata?: EscrowMetadata }
export interface InitializeEscrowPaymentResponse { redirectUrl: string; reference: string; paymentId: string; escrowId: string }

export const populated = <T extends { _id: string }>(value?: T | string | null): T | null => value && typeof value !== 'string' ? value : null;
export const escrowProperty = (escrow: Escrow) => populated(escrow.property ?? escrow.propertyId);
export const escrowBuyer = (escrow: Escrow) => populated(escrow.buyer ?? escrow.buyerId);
export const escrowSeller = (escrow: Escrow) => populated(escrow.seller ?? escrow.sellerId);
export const escrowPayment = (escrow: Escrow) => populated(escrow.payment ?? escrow.paymentId);
export const isRuleSatisfied = (rule: EscrowRule) => Boolean(rule.satisfied ?? rule.isSatisfied);
