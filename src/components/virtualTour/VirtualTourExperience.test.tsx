import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { virtualTourService } from '../../services/virtualTourService';
import type { PropertyVirtualTourResponse, VirtualTourSummary } from '../../types/virtualTour';
import VirtualTourExperience from './VirtualTourExperience';

vi.mock('../../services/virtualTourService', () => ({ virtualTourService: {
  getPropertyVirtualTour: vi.fn(), getPropertyVirtualTourFloorPlan: vi.fn(), getPropertyVirtualTourMeasurements: vi.fn(), getPropertyVirtualTourRooms: vi.fn(),
} }));
vi.mock('./RealseeViewer', () => ({ default: () => <div data-testid="mock-realsee">Realsee</div> }));
vi.mock('./MatterportViewer', () => ({ default: () => <div data-testid="mock-matterport">Matterport</div> }));

const capabilities = { panorama: true, model3D: true, floorPlan: true, measurements: true, roomLabels: true, guidedTour: false, tags: false };
const summary: VirtualTourSummary = {
  available: true, resolvedProvider: 'matterport', preferredProvider: 'realsee', fallbackUsed: true, capabilities,
  providers: {
    realsee: { configured: false, available: false, enabled: false, status: 'not_configured' },
    matterport: { configured: true, available: true, enabled: true, status: 'ready' },
  },
};
const matterportResponse: PropertyVirtualTourResponse = {
  ...summary, status: 'ready', provider: { name: 'matterport', status: 'ready' }, available: true, resolvedProvider: 'matterport',
  viewer: { provider: 'matterport', configuration: { provider: 'matterport', modelSid: 'SxQL3iGyoDo', showcaseUrl: 'https://my.matterport.com/show/?m=SxQL3iGyoDo', sdkKey: 'public-key' } },
};

describe('VirtualTourExperience', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps photos first and makes no digital-twin request until activation', () => {
    render(<VirtualTourExperience propertyId="p1" summary={summary} onPhotosSelected={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Photos & Videos' })).toBeInTheDocument();
    expect(screen.getByText(/fallback active/i)).toBeInTheDocument();
    expect(virtualTourService.getPropertyVirtualTour).not.toHaveBeenCalled();
  });

  it('follows backend resolvedProvider and lazy loads Matterport only after activation', async () => {
    vi.mocked(virtualTourService.getPropertyVirtualTour).mockResolvedValue(matterportResponse);
    await userEvent.click(render(<VirtualTourExperience propertyId="p1" summary={summary} onPhotosSelected={vi.fn()} />).getByRole('button', { name: '3D Tour' }));
    expect(screen.getByRole('dialog', { name: 'Virtual Tour' })).toBeInTheDocument();
    expect(await screen.findByTestId('mock-matterport')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-realsee')).not.toBeInTheDocument();
  });

  it('closes the virtual-tour modal, restores page scrolling, and returns focus to its launcher', async () => {
    vi.mocked(virtualTourService.getPropertyVirtualTour).mockResolvedValue(matterportResponse);
    const user = userEvent.setup();
    render(<VirtualTourExperience propertyId="p1" summary={summary} onPhotosSelected={vi.fn()} />);
    const launcher = screen.getByRole('button', { name: '3D Tour' });

    await user.click(launcher);
    expect(await screen.findByRole('dialog', { name: 'Virtual Tour' })).toBeInTheDocument();
    expect(document.body).toHaveStyle({ overflow: 'hidden' });

    await user.click(screen.getByRole('button', { name: 'Close virtual tour' }));
    expect(screen.queryByRole('dialog', { name: 'Virtual Tour' })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(launcher).toHaveFocus();
  });

  it('keeps all capability-gated mode controls available inside the modal', async () => {
    vi.mocked(virtualTourService.getPropertyVirtualTour).mockResolvedValue(matterportResponse);
    vi.mocked(virtualTourService.getPropertyVirtualTourFloorPlan).mockResolvedValue({ available: true, provider: 'matterport', mode: 'sdk', viewerFloorPlan: true, schematicFloorPlanAsset: false, floors: [], rooms: [], data: { floorPlanAssets: [] } });
    const user = userEvent.setup();
    render(<VirtualTourExperience propertyId="p1" summary={summary} onPhotosSelected={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '3D Tour' }));
    const dialog = await screen.findByRole('dialog', { name: 'Virtual Tour' });
    expect(within(dialog).getByRole('button', { name: 'Dollhouse' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Measurements' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Floor Plan' }));
    await waitFor(() => expect(virtualTourService.getPropertyVirtualTourFloorPlan).toHaveBeenCalledWith('p1'));
    expect(screen.getByTestId('mock-matterport')).toBeInTheDocument();
  });

  it('requests floorplan only when its capability-gated tab opens and labels assets safely', async () => {
    vi.mocked(virtualTourService.getPropertyVirtualTour).mockResolvedValue(matterportResponse);
    vi.mocked(virtualTourService.getPropertyVirtualTourFloorPlan).mockResolvedValue({ available: true, provider: 'matterport', mode: 'sdk', viewerFloorPlan: true, schematicFloorPlanAsset: false, floors: [], rooms: [], data: { floorPlanAssets: [{ floor: { label: 'Floor 1', sequence: 0 }, format: 'jpg', flags: ['photogramy'], url: 'https://cdn.test/floor.jpg', width: 100, height: 100, resolution: 0.01 }] } });
    render(<VirtualTourExperience propertyId="p1" summary={summary} onPhotosSelected={vi.fn()} />);
    expect(virtualTourService.getPropertyVirtualTourFloorPlan).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Floor Plan' }));
    await waitFor(() => expect(virtualTourService.getPropertyVirtualTourFloorPlan).toHaveBeenCalledWith('p1'));
    expect(await screen.findByText('Interactive viewer floor plan')).toBeInTheDocument();
    expect(screen.getByText(/No purchased schematic floor plan/i)).toBeInTheDocument();
  });

  it('shows temporary provider failure as a retry state', async () => {
    vi.mocked(virtualTourService.getPropertyVirtualTour).mockResolvedValue({ ...matterportResponse, status: 'temporarily_unavailable', viewer: null, provider: { name: 'matterport', status: 'temporarily_unavailable' }, error: { message: 'Virtual tour provider is temporarily unavailable.', code: 'VIRTUAL_TOUR_PROVIDER_UNAVAILABLE', provider: 'matterport' } });
    render(<VirtualTourExperience propertyId="p1" summary={summary} onPhotosSelected={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '3D Tour' }));
    expect(await screen.findByText('Virtual tour provider is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
