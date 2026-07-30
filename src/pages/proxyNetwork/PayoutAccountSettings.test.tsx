import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProxyResource } from '../../features/proxyNetwork/useProxyResource';
import { proxyNetworkService } from '../../services/proxyNetworkService';
import PayoutAccountSettings from './PayoutAccountSettings';

vi.mock('../../components/layout/ProxyInspectorLayout', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

vi.mock('../../features/proxyNetwork/useProxyResource', () => ({
  useProxyResource: vi.fn(),
}));

vi.mock('../../services/proxyNetworkService', () => ({
  proxyNetworkService: {
    getPayoutAccount: vi.fn(),
    verifyPayoutAccount: vi.fn(),
    savePayoutAccount: vi.fn(),
  },
}));

describe('PayoutAccountSettings', () => {
  const reload = vi.fn().mockResolvedValue(null);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProxyResource).mockReturnValue({
      data: null,
      loading: false,
      refreshing: false,
      error: null,
      status: undefined,
      reload,
    });
  });

  it('uses a bank dropdown and requires account verification before save', async () => {
    vi.mocked(proxyNetworkService.verifyPayoutAccount).mockResolvedValue({
      bankName: 'Guaranty Trust Bank',
      verifiedAccountName: 'ADA AGENT',
    });
    vi.mocked(proxyNetworkService.savePayoutAccount).mockResolvedValue({
      maskedAccountNumber: '******6789',
      bankName: 'Guaranty Trust Bank',
      verifiedAccountName: 'ADA AGENT',
      verifiedAt: '2026-08-02T12:00:00.000Z',
    });

    render(<PayoutAccountSettings />);

    expect(screen.queryByLabelText(/bank code/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save payout account' })).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText('Bank'), '058');
    await userEvent.type(screen.getByLabelText('Account number'), '0123456789');
    await userEvent.click(screen.getByRole('button', { name: 'Verify account' }));

    expect(proxyNetworkService.verifyPayoutAccount).toHaveBeenCalledWith('0123456789', '058');
    expect(await screen.findByText('ADA AGENT')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save payout account' }));

    expect(proxyNetworkService.savePayoutAccount).toHaveBeenCalledWith('0123456789', '058');
    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(screen.getByLabelText('Account number')).toHaveValue('');
  });

  it('clears verified account details when the user changes the account number', async () => {
    vi.mocked(proxyNetworkService.verifyPayoutAccount).mockResolvedValue({
      bankName: 'Guaranty Trust Bank',
      verifiedAccountName: 'ADA AGENT',
    });

    render(<PayoutAccountSettings />);

    await userEvent.selectOptions(screen.getByLabelText('Bank'), '058');
    await userEvent.type(screen.getByLabelText('Account number'), '0123456789');
    await userEvent.click(screen.getByRole('button', { name: 'Verify account' }));
    expect(await screen.findByText('ADA AGENT')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Account number'), '{backspace}0');

    expect(screen.queryByText('ADA AGENT')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save payout account' })).toBeDisabled();
  });
});
