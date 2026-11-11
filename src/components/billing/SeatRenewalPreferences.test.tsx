import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SeatRenewalPreferences from './SeatRenewalPreferences';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { revenueFoundationService } from '../../services/revenueFoundationService';
import type { OrganizationSeatPlans, OrganizationSeats } from '../../services/organizationManagementService';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ activeProfile: { id: 'organization-profile' } }) }));
vi.mock('../../hooks/useBoundStepUp', () => ({ useBoundStepUp: vi.fn() }));
vi.mock('../../services/revenueFoundationService', () => ({ revenueFoundationService: { listRenewalPreferences: vi.fn(), listPaymentAuthorizations: vi.fn(), saveRenewalPreference: vi.fn(), disableRenewalPreference: vi.fn() } }));
vi.mock('../auth/StepUpDialog', () => ({ default: () => null }));

const begin = vi.fn();
const plans = {
  state: 'configured', plans: [{ key: 'additional-seat', label: 'Additional seat', terms: [{ period: 'monthly' }] }],
  renewalAvailability: {
    state: 'available', manual: { method: 'manual', available: true, automaticRenewal: false },
    methods: [{ method: 'transfer_invoice', automaticRenewal: false, requiresActiveAuthorization: false }],
    unavailableMethods: [{ method: 'saved_card', reasonCode: 'PAYMENT_AUTHORIZATION_REQUIRED' }],
  },
} as OrganizationSeatPlans;
const seats = { paidSeats: [{ membershipId: 'member-1', identityId: 'account-1', role: 'member', entitlement: { active: true } }] } as OrganizationSeats;

describe('seat renewal preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('activeProfileId', 'organization-profile');
    vi.mocked(useBoundStepUp).mockReturnValue({ begin, challenge: null, busy: false, error: null, cancel: vi.fn(), complete: vi.fn() } as unknown as ReturnType<typeof useBoundStepUp>);
    vi.mocked(revenueFoundationService.listRenewalPreferences).mockResolvedValue([{ id: 'preference-1', kind: 'seat', membershipId: 'member-1', version: 4, state: 'active', method: 'manual', suspensionCode: null }] as never);
    vi.mocked(revenueFoundationService.listPaymentAuthorizations).mockResolvedValue([]);
  });

  it('offers only available methods and binds the selected seat and current version', async () => {
    const user = userEvent.setup();
    render(<SeatRenewalPreferences plans={plans} seats={seats} canManage />);
    await screen.findByText(/Seat member-1/);
    const method = screen.getByLabelText('Renewal method');
    expect(method).toHaveTextContent('Manual');
    expect(method).toHaveTextContent('transfer invoice');
    expect(method).not.toHaveTextContent('saved card');
    await user.selectOptions(screen.getByLabelText('Active paid seat'), 'member-1');
    await user.selectOptions(screen.getByLabelText('Seat plan'), 'additional-seat');
    await user.selectOptions(method, 'transfer_invoice');
    await user.click(screen.getByRole('button', { name: 'Save seat preference with authenticator' }));
    expect(begin).toHaveBeenCalledWith(expect.objectContaining({ method: 'PUT', path: '/api/profiles/current/billing/renewal-preferences', body: { kind: 'seat', targetId: 'member-1', planKey: 'additional-seat', billingPeriod: 'monthly', method: 'transfer_invoice', autoRenew: false, expectedVersion: 4 } }));
  });

  it('does not offer a write while the preference version could not be loaded', async () => {
    vi.mocked(revenueFoundationService.listRenewalPreferences).mockRejectedValue(new Error('Read failed'));
    render(<SeatRenewalPreferences plans={plans} seats={seats} canManage />);
    await waitFor(() => expect(screen.getByText('Read failed')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Save seat preference with authenticator' })).toBeDisabled();
  });
});
