import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { virtualTourService } from '../../../services/virtualTourService';
import type { AdminVirtualTourListResponse } from '../../../types/virtualTour';
import AdminVirtualTours from './AdminVirtualTours';

vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../services/virtualTourService', () => ({
  virtualTourService: {
    listAdminVirtualTours: vi.fn(),
    getAdminVirtualTourProviderHealth: vi.fn(),
  },
}));

describe('staff virtual tour reads', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pages list results even when provider health is unavailable', async () => {
    vi.mocked(virtualTourService.listAdminVirtualTours).mockImplementation(async (params) => ({
      items: [], total: 25, page: params?.page ?? 1, limit: 20,
    } as AdminVirtualTourListResponse));
    vi.mocked(virtualTourService.getAdminVirtualTourProviderHealth).mockRejectedValue(new Error('Provider health unavailable'));

    render(<MemoryRouter initialEntries={['/dashboard/admin/virtual-tours?page=1']}><AdminVirtualTours /></MemoryRouter>);

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText(/Provider health unavailable:/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    await waitFor(() => expect(virtualTourService.listAdminVirtualTours).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })));
  });
});
