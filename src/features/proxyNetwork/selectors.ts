import type { UserRole } from '../../types';
import type { ProxyInspectionDetail } from '../../types/proxyNetwork';

export interface ProxyActions {
  message: boolean; proposePrice: boolean; confirmPrice: boolean; initializePayment: boolean;
  schedule: boolean; start: boolean; uploadEvidence: boolean; editReport: boolean; submitCompletion: boolean;
  confirmCompletion: boolean; dispute: boolean; review: boolean; releasePayment: boolean; resolveDispute: boolean;
}
const none = (): ProxyActions => ({
  message: false, proposePrice: false, confirmPrice: false, initializePayment: false, schedule: false,
  start: false, uploadEvidence: false, editReport: false, submitCompletion: false, confirmCompletion: false,
  dispute: false, review: false, releasePayment: false, resolveDispute: false,
});
const participantId = (value: ProxyInspectionDetail['request']['buyer'] | ProxyInspectionDetail['request']['inspector']) =>
  typeof value === 'string' ? value : value._id;

export const selectProxyActions = (
  detail: ProxyInspectionDetail,
  role: UserRole | undefined,
  userId: string | undefined,
  hasVerifiedPayoutAccount = false,
): ProxyActions => {
  const result = none();
  const { request, serviceEscrow: escrow, dispute } = detail;
  const buyer = role === 'buyer' && !!userId && participantId(request.buyer) === userId;
  const inspector = role === 'proxy_inspector' && !!userId && participantId(request.inspector) === userId;
  const admin = role === 'admin';
  const negotiating = ['requested', 'negotiating', 'awaiting_price_confirmation'].includes(request.status);
  const processing = ['release_processing', 'refund_processing'].includes(escrow?.status ?? '');
  const terminal = ['completed', 'refunded', 'cancelled'].includes(request.status);
  const activeDispute = !!dispute && dispute.status !== 'resolved' && dispute.status !== 'corrections_requested';

  result.message = (buyer || inspector || admin) && !terminal;
  result.proposePrice = (buyer || inspector) && negotiating && !request.priceLockedAt && !activeDispute;
  const partyConfirmed = buyer ? request.buyerPriceConfirmed : inspector ? request.inspectorPriceConfirmed : true;
  result.confirmPrice = (buyer || inspector) && negotiating && !!request.proposedPrice && !partyConfirmed && !request.priceLockedAt && !activeDispute;
  result.initializePayment = buyer && request.status === 'awaiting_payment' && !!request.priceLockedAt && !activeDispute;
  result.schedule = inspector && ['funded', 'scheduled'].includes(request.status) && !activeDispute;
  result.start = inspector && ['funded', 'scheduled'].includes(request.status) && !activeDispute;
  result.uploadEvidence = inspector && request.status === 'in_progress' && !activeDispute;
  result.editReport = result.uploadEvidence && !request.reportLockedAt;
  result.submitCompletion = result.editReport;
  result.confirmCompletion = buyer && request.status === 'awaiting_buyer_confirmation' && !activeDispute;
  result.dispute = buyer && ['awaiting_buyer_confirmation', 'release_pending'].includes(request.status) && !activeDispute && !processing;
  result.review = buyer && request.status === 'completed';
  result.releasePayment = admin && request.status === 'release_pending' && escrow?.status === 'release_pending' && !activeDispute && hasVerifiedPayoutAccount;
  result.resolveDispute = admin && request.status === 'disputed' && activeDispute && !processing;
  return result;
};

export const shouldPollProxyDetail = (detail?: ProxyInspectionDetail | null) =>
  detail?.serviceEscrow?.status === 'release_processing' ||
  detail?.serviceEscrow?.status === 'refund_processing';
