import type { UserRole } from '../../types';
import type { Escrow, EscrowRule, EscrowRuleType, EscrowStatus } from '../../types/escrow';
import { isRuleSatisfied } from '../../types/escrow';

export const ESCROW_STATUS: Record<EscrowStatus, { label: string; description: string; classes: string }> = {
  pending_payment: { label: 'Pending payment', description: 'Awaiting buyer payment.', classes: 'bg-amber-100 text-amber-800' },
  locked: { label: 'Locked', description: 'Payment confirmed and conditions are in progress.', classes: 'bg-blue-100 text-blue-800' },
  release_pending: { label: 'Release pending', description: 'Required conditions are complete; awaiting final admin release.', classes: 'bg-violet-100 text-violet-800' },
  released: { label: 'Released', description: 'Funds released and ownership completed.', classes: 'bg-emerald-100 text-emerald-800' },
  disputed: { label: 'Disputed', description: 'Release is paused while the dispute is resolved.', classes: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', description: 'Escrow cancelled.', classes: 'bg-slate-200 text-slate-700' },
  refund_pending: { label: 'Refund required', description: 'The property was sold and this secured payment now requires a refund.', classes: 'bg-orange-100 text-orange-800' },
  refund_processing: { label: 'Refund processing', description: 'The refund was submitted to Paystack and is awaiting confirmation.', classes: 'bg-blue-100 text-blue-800' },
  refunded: { label: 'Refunded', description: 'Payment refunded.', classes: 'bg-cyan-100 text-cyan-800' },
  refund_failed: { label: 'Refund failed', description: 'Refund processing failed and requires administrator review.', classes: 'bg-red-100 text-red-800' },
  release_processing: { label: 'Seller payout processing', description: 'Seller payout has started and is awaiting provider confirmation.', classes: 'bg-blue-100 text-blue-800' },
  cancellation_pending_refund: { label: 'Cancellation pending refund', description: 'Cancellation is awaiting confirmation of the buyer refund.', classes: 'bg-orange-100 text-orange-800' },
  cancelled_refunded: { label: 'Cancelled and refunded', description: 'The escrow was cancelled and the buyer refund was confirmed.', classes: 'bg-cyan-100 text-cyan-800' },
};

export const RULE_LABELS: Record<EscrowRuleType, string> = {
  buyer_confirmation_required: 'Buyer confirmation', seller_confirmation_required: 'Seller confirmation',
  admin_approval_required: 'Administrator approval', inspection_completed: 'Property inspection completed',
  document_verified: 'Documents verified', title_document_uploaded: 'Title document uploaded',
  physical_handover_completed: 'Physical handover completed', release_after_days: 'Release waiting period',
  custom_manual_condition: 'Custom manual condition',
};

export const RULE_TYPES = Object.entries(RULE_LABELS).map(([value, label]) => ({ value: value as EscrowRuleType, label }));
export const RULE_ACTOR_GUIDANCE: Record<EscrowRuleType, string> = {
  buyer_confirmation_required: 'Completed by the buyer.',
  seller_confirmation_required: 'Completed by the landlord.',
  admin_approval_required: 'Completed by a RealtiQ administrator.',
  inspection_completed: 'Confirmed by the buyer after inspection.',
  document_verified: 'Completed by a RealtiQ administrator.',
  title_document_uploaded: 'Completed by a RealtiQ administrator.',
  physical_handover_completed: 'Confirmed by the landlord.',
  release_after_days: 'Completed by a RealtiQ administrator after the waiting period.',
  custom_manual_condition: 'Completed by a RealtiQ administrator.',
};
const permissions: Record<UserRole, EscrowRuleType[]> = {
  buyer: ['buyer_confirmation_required', 'inspection_completed'],
  landlord: ['seller_confirmation_required', 'physical_handover_completed'],
  proxy_inspector: [],
  admin: ['admin_approval_required', 'document_verified', 'title_document_uploaded', 'custom_manual_condition', 'release_after_days'],
};
export const canSatisfyRule = (role: UserRole, escrow: Escrow, rule: EscrowRule) =>
  ['locked', 'release_pending'].includes(escrow.status) && !isRuleSatisfied(rule) && permissions[role].includes(rule.type) &&
  !(rule.type === 'release_after_days' && typeof rule.metadata?.eligibleAt === 'string' && new Date(rule.metadata.eligibleAt).getTime() > Date.now());
export const requiredProgress = (escrow: Escrow) => {
  const required = (escrow.rules ?? []).filter((rule) => rule.required);
  const complete = required.filter(isRuleSatisfied).length;
  return { complete, total: required.length, percent: required.length ? Math.round((complete / required.length) * 100) : 100, allComplete: complete === required.length };
};
export const formatEscrowMoney = (amount: number, currency = 'NGN') => new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
export const formatDateTime = (value?: string) => value ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
export const escrowActions = (role: UserRole, escrow: Escrow) => {
  const progress = requiredProgress(escrow);
  return {
    initializePayment: role === 'buyer' && escrow.status === 'pending_payment',
    dispute: (role === 'buyer' || role === 'landlord') && ['locked', 'release_pending'].includes(escrow.status),
    requestRelease: (role === 'landlord' || role === 'admin') && ['locked', 'release_pending'].includes(escrow.status) && progress.allComplete,
    approveRelease: role === 'admin' && escrow.status === 'release_pending' && progress.allComplete,
    cancel: (role === 'buyer' && escrow.status === 'pending_payment') || (role === 'admin' && escrow.status === 'locked'),
  };
};
