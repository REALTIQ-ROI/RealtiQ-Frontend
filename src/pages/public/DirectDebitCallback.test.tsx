import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DirectDebitCallback from './DirectDebitCallback';
import { revenueFoundationService } from '../../services/revenueFoundationService';
import { DIRECT_DEBIT_CALLBACK_PATH } from '../../utils/directDebit';

const mocks = vi.hoisted(() => ({ useAuth: vi.fn(), listPaymentAuthorizations: vi.fn() }));

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => mocks.useAuth() }));
vi.mock('../../services/revenueFoundationService', () => ({ revenueFoundationService: { listPaymentAuthorizations: mocks.listPaymentAuthorizations } }));

const authorization = (state: string, reusable: boolean) => ({
  id: `authorization-${state}`,
  provider: 'paystack' as const,
  method: 'direct_debit' as const,
  providerReference: 'paystack-ref-1',
  reusable,
  state,
  consentAt: '2026-11-25T00:00:00.000Z',
  lastUsedAt: null,
  createdAt: '2026-11-25T00:00:00.000Z',
});

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="current-location">{location.pathname}{location.search}</output>;
};

const LoginProbe = () => {
  const location = useLocation();
  return <output>login state {JSON.stringify(location.state)}</output>;
};

const renderCallback = (entry: string) => render(
  <MemoryRouter initialEntries={[entry]}>
    <LocationProbe />
    <Routes>
      <Route path={DIRECT_DEBIT_CALLBACK_PATH} element={<DirectDebitCallback />} />
      <Route path="/login" element={<LoginProbe />} />
    </Routes>
  </MemoryRouter>,
);

describe('Paystack Direct Debit callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'session-token');
    localStorage.setItem('activeProfileId', 'profile-1');
    mocks.useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeProfile: { id: 'profile-1', kind: 'developer' },
      profileError: null,
      refreshProfiles: vi.fn(),
      token: 'session-token',
    });
    mocks.listPaymentAuthorizations.mockResolvedValue([]);
  });

  it('matches a returned reference to backend status and only shows success when reusable is true', async () => {
    mocks.listPaymentAuthorizations.mockResolvedValue([authorization('active', true)]);
    renderCallback(`${DIRECT_DEBIT_CALLBACK_PATH}?reference=paystack-ref-1&trxref=other-ref`);

    expect(await screen.findByRole('heading', { name: 'Mandate active and ready for renewal settings' })).toBeInTheDocument();
    expect(revenueFoundationService.listPaymentAuthorizations).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('current-location')).toHaveTextContent(DIRECT_DEBIT_CALLBACK_PATH));
    expect(screen.getByTestId('current-location')).not.toHaveTextContent('reference=');
    expect(screen.getByTestId('current-location')).not.toHaveTextContent('trxref=');
  });

  it('keeps pending activation pending and does not infer approval from the provider return', async () => {
    mocks.listPaymentAuthorizations.mockResolvedValue([authorization('pending_activation', false)]);
    renderCallback(`${DIRECT_DEBIT_CALLBACK_PATH}?trxref=paystack-ref-1`);

    expect(await screen.findByRole('heading', { name: 'The bank or Paystack is activating your mandate' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mandate active and ready for renewal settings' })).not.toBeInTheDocument();
  });

  it('keeps signed-out returns private and carries the reference through sign-in in router state', async () => {
    mocks.useAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, activeProfile: null, profileError: null, refreshProfiles: vi.fn(), token: null });
    renderCallback(`${DIRECT_DEBIT_CALLBACK_PATH}?reference=paystack-ref-1&trxref=other-ref`);

    expect(await screen.findByText(/Sign in to check your mandate/i)).toBeInTheDocument();
    expect(revenueFoundationService.listPaymentAuthorizations).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('link', { name: 'Sign in and return here' }));
    expect(await screen.findByText(/login state/)).toHaveTextContent('redirectTo');
    expect(screen.getByText(/login state/)).toHaveTextContent('directDebitProviderReferences');
    expect(screen.getByText(/login state/)).toHaveTextContent('paystack-ref-1');
  });

  it('shows a neutral state and manual refresh when no provider reference matches', async () => {
    renderCallback(DIRECT_DEBIT_CALLBACK_PATH);

    expect(await screen.findByRole('heading', { name: 'Checking mandate status' })).toBeInTheDocument();
    expect(revenueFoundationService.listPaymentAuthorizations).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Check status' }));
    await waitFor(() => expect(revenueFoundationService.listPaymentAuthorizations).toHaveBeenCalledTimes(2));
  });
});
