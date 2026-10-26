import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { virtualTourService } from '../../services/virtualTourService';
import type { PublicProviderAvailability } from '../../types/virtualTour';
import AdminVirtualTourSettings from './AdminVirtualTourSettings';

const { mockBegin } = vi.hoisted(() => ({ mockBegin: vi.fn() }));
vi.mock('../../hooks/useBoundStepUp', () => ({ useBoundStepUp: () => ({
  begin: mockBegin,
  complete: vi.fn(),
  cancel: vi.fn(),
  busy: false,
  challenge: null,
  error: null,
  getError: () => null,
}) }));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../services/virtualTourService', () => ({ virtualTourService: {
  getVirtualTourProviders: vi.fn(),
  updateAdminVirtualTourSettings: vi.fn(),
} }));

const settings: PublicProviderAvailability = {
  enabled: true,
  defaultProvider: 'realsee',
  providers: { realsee: { enabled: true }, matterport: { enabled: true } },
  publicConfiguration: { matterport: { sdkKey: 'public-key' }, realsee: { workDataDelivery: 'signed_url' } },
};

describe('AdminVirtualTourSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(virtualTourService.getVirtualTourProviders).mockResolvedValue(settings);
    vi.mocked(virtualTourService.updateAdminVirtualTourSettings).mockResolvedValue({
      enabled: true,
      defaultProvider: 'matterport',
      providers: settings.providers,
      version: 5,
    });
  });

  it('disables save when the selected global default provider is disabled', async () => {
    render(<AdminVirtualTourSettings />);
    const defaultSelect = await screen.findByLabelText('Default provider');
    await userEvent.selectOptions(defaultSelect, 'matterport');
    await userEvent.click(screen.getByLabelText('matterport enabled'));
    expect(screen.getByRole('button', { name: 'Save virtual-tour settings' })).toBeDisabled();
    expect(screen.getByText(/Enable the selected default provider/i)).toBeInTheDocument();
  });

  it('starts a JSON-bound TOTP update using the documented route and request body', async () => {
    render(<AdminVirtualTourSettings />);
    await screen.findByLabelText('Default provider');
    await userEvent.click(screen.getByRole('button', { name: 'Save virtual-tour settings' }));
    await waitFor(() => expect(mockBegin).toHaveBeenCalledWith(expect.objectContaining({
      method: 'PATCH',
      path: '/api/admin/settings/virtual-tours',
      body: { enabled: true, defaultProvider: 'realsee', providers: settings.providers },
      execute: expect.any(Function),
    })));
    const request = mockBegin.mock.calls[0][0];
    await request.execute('challenge-id', request.body);
    expect(virtualTourService.updateAdminVirtualTourSettings).toHaveBeenCalledWith(request.body, 'challenge-id');
  });
});
