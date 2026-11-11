import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProviderSettlementEvents from './ProviderSettlementEvents';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { financeRevenueService } from '../../services/financeRevenueService';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ activeProfile: { id: 'finance-profile' } }) }));
vi.mock('../../hooks/useBoundStepUp', () => ({ useBoundStepUp: vi.fn() }));
vi.mock('../../services/financeRevenueService', () => ({ financeRevenueService: { getProviderSettlementEvents: vi.fn(), reconcileProviderSettlementEvent: vi.fn() } }));
vi.mock('../auth/StepUpDialog', () => ({ default: () => null }));

const begin = vi.fn();
const range = { from: '2026-11-01T00:00:00.000Z', to: '2026-11-09T00:00:00.000Z' };
const event = { id: 'event-1', provider: 'monnify', eventType: 'settlement.success', settlementReference: 'SETTLE-123', state: 'verified', reconcilable: true, reconciliationCode: 'PAYMENT_SETTLEMENT_BENEFICIARY_RECONCILIATION_REQUIRED', attempts: 1, receivedAt: '2026-11-01T08:00:00.000Z', verifiedAt: '2026-11-01T08:02:00.000Z', appliedAt: null, details: { currency: 'NGN', reconciliation: { checkedAt: '2026-11-01T08:02:00.000Z', providerTransactionCount: 2, matchedInternalPayments: 2, providerGrossMinor: 200000, providerSettlementMinor: 198000, providerChargesMinor: 2000, discrepancyCount: 0, discrepancies: [], beneficiarySettlement: 'unconfirmed' } } } as const;

describe('Finance provider settlement events', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.setItem('activeProfileId', 'finance-profile');
    vi.mocked(useBoundStepUp).mockReturnValue({ begin, challenge: null, busy: false, error: null, cancel: vi.fn(), complete: vi.fn() } as unknown as ReturnType<typeof useBoundStepUp>);
    vi.mocked(financeRevenueService.getProviderSettlementEvents).mockResolvedValue({ settlements: [event as never], nextCursor: 'next-event' });
  });

  it('shows merchant-only status, pages by cursor, and binds reconciliation to the selected event', async () => {
    const user = userEvent.setup();
    render(<ProviderSettlementEvents range={range} canManage />);
    expect(await screen.findByText(/SETTLE-123/)).toBeInTheDocument();
    expect(screen.getByText(/does not confirm settlement to split beneficiaries/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reconcile with authenticator' }));
    expect(begin).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/api/admin/revenue/provider-settlements/event-1/reconcile', body: {} }));
    await user.click(screen.getByRole('button', { name: 'Load more events' }));
    await waitFor(() => expect(financeRevenueService.getProviderSettlementEvents).toHaveBeenCalledWith({ ...range, limit: 50, after: 'next-event' }));
  });

  it('hides reconcile controls when the event is not reconcilable', async () => {
    vi.mocked(financeRevenueService.getProviderSettlementEvents).mockResolvedValue({ settlements: [{ ...event, reconcilable: false } as never], nextCursor: null });
    render(<ProviderSettlementEvents range={range} canManage />);
    expect(await screen.findByText(/no usable settlement reference/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reconcile with authenticator' })).not.toBeInTheDocument();
  });
});
