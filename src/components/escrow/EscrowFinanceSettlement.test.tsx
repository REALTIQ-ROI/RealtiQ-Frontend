import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EscrowFinanceSettlement from './EscrowFinanceSettlement';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { escrowFinanceSettlementService } from '../../services/escrowFinanceSettlementService';

const access = vi.hoisted(() => ({
  current: { capabilities: ['finance.read', 'finance.manage'], staffDepartments: ['finance'], readOnly: false, isInternalAudit: false },
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ activeProfile: { id: 'finance-profile' }, adminAccess: access.current }) }));
vi.mock('../../hooks/useBoundStepUp', () => ({ useBoundStepUp: vi.fn() }));
vi.mock('../../services/escrowFinanceSettlementService', () => ({ escrowFinanceSettlementService: { get: vi.fn(), reconcile: vi.fn(), authorizeTransfer: vi.fn() } }));
vi.mock('../auth/StepUpDialog', () => ({ default: () => null }));

const begin = vi.fn();
const settlement = {
  settlement: {
    id: 'settlement-1', state: 'pending_authorization', currency: 'NGN' as const, version: 2,
    actionEligibility: { reconcile: true, authorizeTransferBeneficiaryIds: ['beneficiary-1'] },
    beneficiaries: [{ id: 'beneficiary-1', role: 'seller', amountMinor: 250000, currency: 'NGN' as const,
      state: 'pending_authorization', transferReference: null, destinationMasked: '****1234',
      destinationBankName: 'Example Bank', providerCode: null, lastCheckedAt: null, completedAt: null }],
  }, complete: false, reconciliationRequired: true,
};

describe('Finance escrow settlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('activeProfileId', 'finance-profile');
    access.current = { capabilities: ['finance.read', 'finance.manage'], staffDepartments: ['finance'], readOnly: false, isInternalAudit: false };
    vi.mocked(escrowFinanceSettlementService.get).mockResolvedValue(settlement);
    vi.mocked(useBoundStepUp).mockReturnValue({ begin, challenge: null, busy: false, error: null, cancel: vi.fn(), complete: vi.fn() } as unknown as ReturnType<typeof useBoundStepUp>);
  });

  it('shows only the masked destination and binds authorization to the selected beneficiary and exact code', async () => {
    const user = userEvent.setup();
    render(<EscrowFinanceSettlement escrowId="escrow-1" />);
    expect(await screen.findByText(/Example Bank · \*\*\*\*1234/)).toBeInTheDocument();
    expect(screen.getByText(/Reconciliation required/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Transfer awaiting authorization'), 'beneficiary-1');
    await user.type(screen.getByLabelText('Provider authorization code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Authorize transfer with authenticator' }));
    expect(begin).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST', path: '/api/escrow/escrow-1/settlement/beneficiaries/beneficiary-1/authorize-transfer',
      body: { authorizationCode: '123456' },
    }));
  });

  it('does not expose settlement mutations without Finance management capability', async () => {
    access.current = { capabilities: ['finance.read'], staffDepartments: ['finance'], readOnly: false, isInternalAudit: false };
    render(<EscrowFinanceSettlement escrowId="escrow-1" />);
    await waitFor(() => expect(escrowFinanceSettlementService.get).toHaveBeenCalledWith('escrow-1'));
    expect(await screen.findByText(/Example Bank · \*\*\*\*1234/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reconcile with authenticator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Authorize transfer with authenticator' })).not.toBeInTheDocument();
  });
});
