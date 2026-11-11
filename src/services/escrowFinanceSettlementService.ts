import api from '../lib/axios';
import type { RevenueCurrency } from '../utils/moneyMinor';
import type { BeneficiaryActionEligibility } from './financeExecutionService';

export interface EscrowSettlementBeneficiary {
  id: string;
  role: string;
  amountMinor: number;
  currency: RevenueCurrency;
  state: string;
  transferReference: string | null;
  destinationMasked: string | null;
  destinationBankName: string | null;
  providerCode: string | null;
  lastCheckedAt: string | null;
  completedAt: string | null;
}

export interface EscrowSettlementResult {
  settlement: {
    id: string;
    state: string;
    currency: RevenueCurrency;
    version: number;
    beneficiaries: EscrowSettlementBeneficiary[];
    actionEligibility: BeneficiaryActionEligibility;
  } | null;
  complete?: boolean;
  reconciliationRequired?: boolean;
}

const path = (escrowId: string) => `/escrow/${encodeURIComponent(escrowId)}/settlement`;
const protectedRequest = (challengeId: string) => ({ headers: { 'X-Step-Up-Challenge': challengeId } });

export const escrowFinanceSettlementService = {
  async get(escrowId: string): Promise<EscrowSettlementResult> {
    const { data } = await api.get<EscrowSettlementResult>(path(escrowId));
    return data;
  },
  async reconcile(escrowId: string, challengeId: string): Promise<EscrowSettlementResult> {
    const { data } = await api.post<EscrowSettlementResult>(`${path(escrowId)}/reconcile`, {}, protectedRequest(challengeId));
    return data;
  },
  async authorizeTransfer(escrowId: string, beneficiaryId: string, body: { authorizationCode: string }, challengeId: string): Promise<EscrowSettlementResult> {
    const { data } = await api.post<EscrowSettlementResult>(`${path(escrowId)}/beneficiaries/${encodeURIComponent(beneficiaryId)}/authorize-transfer`, body, protectedRequest(challengeId));
    return data;
  },
};
