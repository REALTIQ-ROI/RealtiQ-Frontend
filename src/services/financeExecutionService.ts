import api from '../lib/axios';
import type { RevenueCurrency } from '../utils/moneyMinor';

export interface TransferBeneficiary {
  id: string;
  role: string;
  amountMinor: number;
  currency: RevenueCurrency;
  state: 'ready' | 'initiating' | 'pending_authorization' | 'processing' | 'completed' | 'failed' | 'outcome_unknown' | 'reversed';
  transferReference: string | null;
  destinationMasked: string | null;
  destinationBankName: string | null;
  providerCode: string | null;
  lastCheckedAt: string | null;
  completedAt: string | null;
}

export interface BeneficiaryActionEligibility {
  reconcile: boolean;
  authorizeTransferBeneficiaryIds: string[];
}

interface ExecutionBase {
  id: string;
  paymentId: string;
  state: string;
  currency: RevenueCurrency;
  beneficiaries: TransferBeneficiary[];
  actionEligibility: BeneficiaryActionEligibility;
  version: number;
  lastFailureCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EscrowRefundExecution extends ExecutionBase {
  escrowId: string;
  disputeId: string;
  faultParty: 'buyer' | 'seller' | 'mutual' | 'no_fault';
  finalEscrowStatus: 'refunded' | 'cancelled_refunded';
  collectedMinor: number;
  buyerReturnMinor: number;
  realtiqRecoveryMinor: number;
  sellerRecoveryMinor: number;
  controlsPolicyRevision: number;
  completedAt: string | null;
}

export interface ProxySettlementExecution extends ExecutionBase {
  serviceEscrowId: string;
  requestId: string;
  collectedMinor: number;
  inspectorPayoutMinor: number;
  realtiqFeeMinor: number;
  controlsPolicyRevision: number;
  releasedAt: string | null;
}

export interface ProxyRefundExecution {
  id: string;
  serviceEscrowId: string;
  requestId: string;
  paymentId: string;
  payerProfileId: string;
  amountMinor: number;
  currency: RevenueCurrency;
  state: 'ready' | 'initiating' | 'pending_authorization' | 'processing' | 'outcome_unknown' | 'reconciliation_required' | 'completed' | 'failed';
  transferReference: string | null;
  destinationMasked: string | null;
  destinationBankName: string | null;
  controlsPolicyRevision: number;
  providerTransactionReference: string | null;
  providerCode: string | null;
  attemptCount: number;
  lastCheckedAt: string | null;
  completedAt: string | null;
  cancelAfterRefund: boolean;
  version: number;
  actionEligibility: { reconcile: boolean; authorizeTransfer: boolean };
  events: Array<{ action: string; code: string | null; actorId: string; at: string }>;
  createdAt: string;
  updatedAt: string;
}

const escrowRefund = (id: string) => `/admin/escrows/${encodeURIComponent(id)}/refund-execution`;
const proxySettlement = (id: string) => `/admin/proxy-inspections/${encodeURIComponent(id)}/settlement`;
const proxyRefund = (id: string) => `/admin/proxy-inspections/${encodeURIComponent(id)}/refund-execution`;
const protectedRequest = (challengeId: string) => ({ headers: { 'X-Step-Up-Challenge': challengeId } });

export const financeExecutionService = {
  async getEscrowRefund(id: string): Promise<EscrowRefundExecution> {
    const { data } = await api.get<{ execution: EscrowRefundExecution }>(escrowRefund(id));
    return data.execution;
  },
  async reconcileEscrowRefund(id: string, challengeId: string): Promise<{ execution: EscrowRefundExecution; pending: boolean; complete?: boolean; reconciliationRequired?: boolean }> {
    const { data } = await api.post<Awaited<ReturnType<typeof financeExecutionService.reconcileEscrowRefund>>>(`${escrowRefund(id)}/reconcile`, {}, protectedRequest(challengeId));
    return data;
  },
  async authorizeEscrowRefund(id: string, beneficiaryId: string, body: { authorizationCode: string }, challengeId: string): Promise<{ execution: EscrowRefundExecution; complete: boolean }> {
    const { data } = await api.post<Awaited<ReturnType<typeof financeExecutionService.authorizeEscrowRefund>>>(`${escrowRefund(id)}/beneficiaries/${encodeURIComponent(beneficiaryId)}/authorize-transfer`, body, protectedRequest(challengeId));
    return data;
  },
  async getProxySettlement(id: string): Promise<ProxySettlementExecution> {
    const { data } = await api.get<{ settlement: ProxySettlementExecution }>(proxySettlement(id));
    return data.settlement;
  },
  async reconcileProxySettlement(id: string, challengeId: string): Promise<{ settlement: ProxySettlementExecution; complete: boolean; reconciliationRequired?: boolean }> {
    const { data } = await api.post<Awaited<ReturnType<typeof financeExecutionService.reconcileProxySettlement>>>(`${proxySettlement(id)}/reconcile`, {}, protectedRequest(challengeId));
    return data;
  },
  async authorizeProxySettlement(id: string, beneficiaryId: string, body: { authorizationCode: string }, challengeId: string): Promise<{ settlement: ProxySettlementExecution; complete: boolean }> {
    const { data } = await api.post<Awaited<ReturnType<typeof financeExecutionService.authorizeProxySettlement>>>(`${proxySettlement(id)}/beneficiaries/${encodeURIComponent(beneficiaryId)}/authorize-transfer`, body, protectedRequest(challengeId));
    return data;
  },
  async getProxyRefund(id: string): Promise<ProxyRefundExecution> {
    const { data } = await api.get<{ refundExecution: ProxyRefundExecution }>(proxyRefund(id));
    return data.refundExecution;
  },
  async reconcileProxyRefund(id: string, challengeId: string): Promise<{ refundExecution: ProxyRefundExecution; pending: boolean; reconciliationRequired?: boolean }> {
    const { data } = await api.post<Awaited<ReturnType<typeof financeExecutionService.reconcileProxyRefund>>>(`${proxyRefund(id)}/reconcile`, {}, protectedRequest(challengeId));
    return data;
  },
  async authorizeProxyRefund(id: string, body: { authorizationCode: string }, challengeId: string): Promise<{ refundExecution: ProxyRefundExecution; pending: boolean; reconciliationRequired?: boolean }> {
    const { data } = await api.post<Awaited<ReturnType<typeof financeExecutionService.authorizeProxyRefund>>>(`${proxyRefund(id)}/authorize-transfer`, body, protectedRequest(challengeId));
    return data;
  },
};
