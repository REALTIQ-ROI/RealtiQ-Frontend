import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { virtualTourService } from './virtualTourService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));

describe('virtualTourService contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the public routes and caches the resolved viewer per Property', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { available: false, resolvedProvider: null } });
    await virtualTourService.getVirtualTourProviders();
    await virtualTourService.getPropertyVirtualTour('RTQ-PROP-1', true);
    await virtualTourService.getPropertyVirtualTour('RTQ-PROP-1');
    await virtualTourService.getPropertyVirtualTourFloorPlan('RTQ-PROP-1');
    await virtualTourService.getPropertyVirtualTourMeasurements('RTQ-PROP-1');
    await virtualTourService.getPropertyVirtualTourRooms('RTQ-PROP-1');
    expect(api.get).toHaveBeenCalledWith('/virtual-tours/providers');
    expect(api.get).toHaveBeenCalledTimes(5);
    expect(api.get).toHaveBeenCalledWith('/properties/RTQ-PROP-1/virtual-tour');
    expect(api.get).toHaveBeenCalledWith('/properties/RTQ-PROP-1/virtual-tour/floorplan');
    expect(api.get).toHaveBeenCalledWith('/properties/RTQ-PROP-1/virtual-tour/measurements');
    expect(api.get).toHaveBeenCalledWith('/properties/RTQ-PROP-1/virtual-tour/rooms');
  });

  it('sends only provider configuration and override payloads to exact protected routes', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    await virtualTourService.configurePropertyRealsee('p/1', { workId: 'work_1', workUrl: 'https://work.test/data.json' });
    await virtualTourService.configurePropertyMatterport('p/1', { enabled: false });
    await virtualTourService.setPropertyVirtualTourProvider('p/1', { provider: null });
    await virtualTourService.setProjectVirtualTourProvider('project-1', { provider: 'matterport' });
    await virtualTourService.setProjectVirtualTourProvider('project-1', { provider: null });
    expect(api.patch).toHaveBeenNthCalledWith(1, '/properties/p%2F1/virtual-tour/realsee', { workId: 'work_1', workUrl: 'https://work.test/data.json' });
    expect(api.patch).toHaveBeenNthCalledWith(2, '/properties/p%2F1/virtual-tour/matterport', { enabled: false });
    expect(api.patch).toHaveBeenNthCalledWith(3, '/properties/p%2F1/virtual-tour/provider', { provider: null });
    expect(api.patch).toHaveBeenNthCalledWith(4, '/projects/project-1/virtual-tour/provider', { provider: 'matterport' });
    expect(api.patch).toHaveBeenNthCalledWith(5, '/projects/project-1/virtual-tour/provider', { provider: null });
  });

  it('uses exact admin settings, list, detail, and health routes', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    vi.mocked(api.get).mockResolvedValue({ data: {} });
    await virtualTourService.updateAdminVirtualTourSettings({ defaultProvider: 'realsee' });
    await virtualTourService.listAdminVirtualTours({ provider: 'matterport', status: 'ready', page: 2, limit: 20 });
    await virtualTourService.getAdminVirtualTour('RTQ-PROP-9');
    await virtualTourService.getAdminVirtualTourProviderHealth();
    expect(api.patch).toHaveBeenCalledWith('/admin/settings/virtual-tours', { defaultProvider: 'realsee' });
    expect(api.get).toHaveBeenCalledWith('/admin/virtual-tours', { params: { provider: 'matterport', status: 'ready', page: 2, limit: 20 } });
    expect(api.get).toHaveBeenCalledWith('/admin/virtual-tours/RTQ-PROP-9');
    expect(api.get).toHaveBeenCalledWith('/admin/virtual-tours/providers/health');
  });
});
