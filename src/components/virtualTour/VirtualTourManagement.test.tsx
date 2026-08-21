import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { virtualTourService } from '../../services/virtualTourService';
import type { PublicProviderAvailability, VirtualTourSummary } from '../../types/virtualTour';
import VirtualTourManagement from './VirtualTourManagement';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../services/virtualTourService', () => ({ virtualTourService: {
  getVirtualTourProviders: vi.fn(),
  configurePropertyRealsee: vi.fn(),
  configurePropertyMatterport: vi.fn(),
  setPropertyVirtualTourProvider: vi.fn(),
} }));

const availability: PublicProviderAvailability = {
  enabled: true,
  defaultProvider: 'realsee',
  providers: { realsee: { enabled: true }, matterport: { enabled: true } },
  publicConfiguration: { matterport: { sdkKey: 'public-key' }, realsee: { workDataDelivery: 'signed_url' } },
};

const summary: VirtualTourSummary = {
  available: true,
  resolvedProvider: 'matterport',
  preferredProvider: 'realsee',
  fallbackUsed: true,
  capabilities: { panorama: true, model3D: true, floorPlan: true, measurements: true, roomLabels: true, guidedTour: false, tags: true },
  providers: {
    realsee: { configured: true, available: true, enabled: true, status: 'ready' },
    matterport: { configured: true, available: true, enabled: true, status: 'ready' },
  },
};

describe('VirtualTourManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(virtualTourService.getVirtualTourProviders).mockResolvedValue(availability);
    vi.mocked(virtualTourService.configurePropertyRealsee).mockResolvedValue({ propertyId: 'p1', provider: 'realsee', tour: {
      enabled: true, status: 'processing', workId: 'work_1', capabilities: summary.capabilities, metadata: {},
    } });
    vi.mocked(virtualTourService.configurePropertyMatterport).mockResolvedValue({ propertyId: 'p1', provider: 'matterport', tour: {
      enabled: true, status: 'ready', modelSid: 'SxQL3iGyoDo', capabilities: summary.capabilities, metadata: {},
    } });
    vi.mocked(virtualTourService.setPropertyVirtualTourProvider).mockResolvedValue({ propertyId: 'p1', virtualTourProviderOverride: null });
  });

  it('submits Work-ID-only Realsee configuration as the documented deferred payload', async () => {
    const onUpdated = vi.fn();
    render(<VirtualTourManagement propertyId="p1" summary={summary} onUpdated={onUpdated} />);
    await userEvent.type(screen.getByLabelText('Realsee Work ID'), 'work_1');
    await userEvent.click(screen.getByRole('button', { name: 'Save Realsee' }));
    await waitFor(() => expect(virtualTourService.configurePropertyRealsee).toHaveBeenCalledWith('p1', { workId: 'work_1' }));
    expect(onUpdated).toHaveBeenCalled();
  });

  it('validates provider identifiers and always surfaces backend errors', async () => {
    render(<VirtualTourManagement propertyId="p1" summary={summary} onUpdated={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save Realsee' }));
    expect(toast.error).toHaveBeenCalledWith('Realsee Work ID is required.');

    vi.mocked(virtualTourService.configurePropertyMatterport).mockRejectedValueOnce(new Error('You cannot manage virtual tours for this Property.'));
    await userEvent.type(screen.getByLabelText('Matterport model SID'), 'SxQL3iGyoDo');
    await userEvent.click(screen.getByRole('button', { name: 'Save Matterport' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('You cannot manage virtual tours for this Property.'));
  });

  it('disables through the same provider endpoint without clearing identifiers', async () => {
    render(<VirtualTourManagement propertyId="p1" summary={summary} onUpdated={vi.fn()} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Disable' })[1]);
    await waitFor(() => expect(virtualTourService.configurePropertyMatterport).toHaveBeenCalledWith('p1', { enabled: false }));
  });

  it('shows the actual Property override and sends null to inherit', async () => {
    render(<VirtualTourManagement propertyId="p1" summary={summary} providerOverride="matterport" onUpdated={vi.fn()} />);
    const select = await screen.findByLabelText('Property virtual tour provider preference');
    expect(select).toHaveValue('matterport');
    await userEvent.selectOptions(select, '');
    await userEvent.click(screen.getByRole('button', { name: 'Save preference' }));
    await waitFor(() => expect(virtualTourService.setPropertyVirtualTourProvider).toHaveBeenCalledWith('p1', { provider: null }));
  });
});
