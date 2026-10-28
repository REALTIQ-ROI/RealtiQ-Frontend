import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { propertyService } from '../../../services/propertyService';
import { virtualTourService } from '../../../services/virtualTourService';
import type { AdminVirtualTourDetail } from '../../../types/virtualTour';
import AdminVirtualTourDetailPage from './AdminVirtualTourDetail';

vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../services/propertyService', () => ({ propertyService: { getPropertyApprovalDetail: vi.fn() } }));
vi.mock('../../../services/virtualTourService', () => ({ virtualTourService: { getAdminVirtualTour: vi.fn() } }));

const detail = (overrides: Partial<AdminVirtualTourDetail> = {}): AdminVirtualTourDetail => ({
  property: { id: 'property-1', publicReference: 'RTQ-PROP-1', title: 'Sample property' },
  project: null,
  owner: null,
  virtualTourProviderOverride: null,
  resolvedProvider: null,
  fallbackUsed: false,
  providers: {
    realsee: { enabled: false, status: 'not_configured', workId: null, workUrl: null, vrUrl: null, capabilities: {}, metadata: {}, configuredAt: null, readyAt: null, failedAt: null, failureReason: null },
    matterport: { enabled: false, status: 'not_configured', modelSid: null, showcaseUrl: null, capabilities: {}, metadata: {}, configuredAt: null, readyAt: null, failedAt: null, failureReason: null },
  },
  ...overrides,
});

const renderPage = () => render(
  <MemoryRouter initialEntries={['/dashboard/admin/virtual-tours/RTQ-PROP-1']}>
    <Routes><Route path="/dashboard/admin/virtual-tours/:propertyId" element={<AdminVirtualTourDetailPage />} /></Routes>
  </MemoryRouter>,
);

describe('admin virtual tour owner display', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the project owner when the top-level owner is omitted', async () => {
    vi.mocked(virtualTourService.getAdminVirtualTour).mockResolvedValue(detail({
      project: { id: 'project-1', name: 'Sample project', slug: 'sample-project', owner: { id: 'owner-1', name: 'Project Owner' } },
    }));

    renderPage();

    expect(await screen.findByText('Project Owner')).toBeInTheDocument();
    expect(propertyService.getPropertyApprovalDetail).not.toHaveBeenCalled();
  });

  it('loads the property owner for a standalone listing when the virtual-tour projection omits it', async () => {
    vi.mocked(virtualTourService.getAdminVirtualTour).mockResolvedValue(detail());
    vi.mocked(propertyService.getPropertyApprovalDetail).mockResolvedValue({
      property: { owner: { id: 'owner-2', name: 'Standalone Owner' } },
    } as never);

    renderPage();

    expect(await screen.findByText('Standalone Owner')).toBeInTheDocument();
    expect(propertyService.getPropertyApprovalDetail).toHaveBeenCalledWith('property-1');
  });

  it('uses the property owner when the property belongs to a project', async () => {
    vi.mocked(virtualTourService.getAdminVirtualTour).mockResolvedValue(detail({
      property: {
        id: 'property-1',
        publicReference: 'RTQ-PROP-1',
        title: 'Sample property',
        owner: { id: 'owner-3', name: 'Unit Owner' },
      },
      project: { id: 'project-1', name: 'Sample project', slug: 'sample-project' },
    }));

    renderPage();

    expect(await screen.findByText('Unit Owner')).toBeInTheDocument();
    expect(propertyService.getPropertyApprovalDetail).not.toHaveBeenCalled();
  });
});
