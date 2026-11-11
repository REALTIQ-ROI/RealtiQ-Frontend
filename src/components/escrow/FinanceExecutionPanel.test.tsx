import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FinanceExecutionPanel from './FinanceExecutionPanel';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { financeExecutionService } from '../../services/financeExecutionService';
import { ApiRequestError } from '../../lib/axios';

const access = vi.hoisted(() => ({ current: { capabilities: ['finance.read', 'finance.manage'], staffDepartments: ['finance'], readOnly: false, isInternalAudit: false } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ activeProfile: { id: 'finance-profile' }, adminAccess: access.current }) }));
vi.mock('../../hooks/useBoundStepUp', () => ({ useBoundStepUp: vi.fn() }));
vi.mock('../../services/financeExecutionService', () => ({ financeExecutionService: { getEscrowRefund: vi.fn(), getProxySettlement: vi.fn(), getProxyRefund: vi.fn(), reconcileEscrowRefund: vi.fn(), authorizeEscrowRefund: vi.fn(), reconcileProxySettlement: vi.fn(), authorizeProxySettlement: vi.fn(), reconcileProxyRefund: vi.fn(), authorizeProxyRefund: vi.fn() } }));
vi.mock('../auth/StepUpDialog', () => ({ default: () => null }));

const begin = vi.fn();
const beneficiary = { id: 'beneficiary-1', role: 'buyer', amountMinor: 200000, currency: 'NGN', state: 'pending_authorization', transferReference: 'REF-1', destinationMasked: '****1234', destinationBankName: 'Example Bank', providerCode: null, lastCheckedAt: null, completedAt: null };

describe('Finance execution panels', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.setItem('activeProfileId', 'finance-profile');
    access.current = { capabilities: ['finance.read', 'finance.manage'], staffDepartments: ['finance'], readOnly: false, isInternalAudit: false };
    vi.mocked(useBoundStepUp).mockReturnValue({ begin, challenge: null, busy: false, error: null, cancel: vi.fn(), complete: vi.fn() } as unknown as ReturnType<typeof useBoundStepUp>);
  });

  it('uses escrow refund beneficiary eligibility and the exact protected transfer path', async () => {
    vi.mocked(financeExecutionService.getEscrowRefund).mockResolvedValue({ id: 'execution-1', state: 'processing', version: 2, currency: 'NGN', buyerReturnMinor: 200000, sellerRecoveryMinor: 0, faultParty: 'seller', beneficiaries: [beneficiary], actionEligibility: { reconcile: true, authorizeTransferBeneficiaryIds: ['beneficiary-1'] } } as never);
    const user = userEvent.setup();
    render(<FinanceExecutionPanel kind="escrow_refund" resourceId="escrow-1" />);
    expect(await screen.findByText(/Example Bank · \*\*\*\*1234/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Transfer awaiting authorization'), 'beneficiary-1');
    await user.type(screen.getByLabelText('Provider authorization code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Authorize transfer with authenticator' }));
    expect(begin).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/api/admin/escrows/escrow-1/refund-execution/beneficiaries/beneficiary-1/authorize-transfer', body: { authorizationCode: '123456' } }));
  });

  it('uses the single-transfer proxy refund route with no beneficiary selector', async () => {
    vi.mocked(financeExecutionService.getProxyRefund).mockResolvedValue({ id: 'refund-1', state: 'pending_authorization', version: 3, currency: 'NGN', amountMinor: 25000, destinationMasked: '****4444', destinationBankName: 'Example Bank', actionEligibility: { reconcile: true, authorizeTransfer: true } } as never);
    const user = userEvent.setup();
    render(<FinanceExecutionPanel kind="proxy_refund" resourceId="request-1" />);
    expect(await screen.findByText(/Example Bank · \*\*\*\*4444/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Transfer awaiting authorization')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Provider authorization code'), '5678');
    await user.click(screen.getByRole('button', { name: 'Authorize transfer with authenticator' }));
    expect(begin).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/api/admin/proxy-inspections/request-1/refund-execution/authorize-transfer', body: { authorizationCode: '5678' } }));
  });

  it('keeps controls hidden without Finance management authority', async () => {
    access.current = { capabilities: ['finance.read'], staffDepartments: ['finance'], readOnly: false, isInternalAudit: false };
    vi.mocked(financeExecutionService.getProxySettlement).mockResolvedValue({ id: 'settlement-1', state: 'processing', version: 1, currency: 'NGN', inspectorPayoutMinor: 10000, realtiqFeeMinor: 1000, beneficiaries: [beneficiary], actionEligibility: { reconcile: true, authorizeTransferBeneficiaryIds: ['beneficiary-1'] } } as never);
    render(<FinanceExecutionPanel kind="proxy_settlement" resourceId="request-1" />);
    expect(await screen.findByText(/Inspection Partner payout/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reconcile with authenticator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Authorize transfer with authenticator' })).not.toBeInTheDocument();
  });

  it('does not offer a second transfer while the original refund outcome is unknown', async () => {
    vi.mocked(financeExecutionService.getProxyRefund).mockResolvedValue({ id: 'refund-1', state: 'outcome_unknown', version: 4, currency: 'NGN', amountMinor: 25000, destinationMasked: '****4444', destinationBankName: 'Example Bank', transferReference: 'REF-1', providerCode: null, attemptCount: 1, cancelAfterRefund: false, actionEligibility: { reconcile: true, authorizeTransfer: false } } as never);
    render(<FinanceExecutionPanel kind="proxy_refund" resourceId="request-1" />);
    expect(await screen.findByText(/outcome unknown/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reconcile with authenticator' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Authorize transfer with authenticator' })).not.toBeInTheDocument();
    expect(screen.getByText(/Completion not confirmed/)).toBeInTheDocument();
  });

  it('treats a missing execution as absent rather than a completed refund', async () => {
    vi.mocked(financeExecutionService.getEscrowRefund).mockRejectedValue(new ApiRequestError('Not found', { status: 404, code: 'RESOURCE_NOT_FOUND' }));
    render(<FinanceExecutionPanel kind="escrow_refund" resourceId="escrow-1" />);
    expect(await screen.findByText(/No execution record was found/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reconcile with authenticator' })).not.toBeInTheDocument();
  });
});
