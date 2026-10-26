import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProperties } from '../../../contexts/PropertiesContext';
import { adminService } from '../../../services/adminService';
import type { Property } from '../../../types';
import AdminDashboard from './AdminDashboard';

vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../../contexts/PropertiesContext', () => ({ useProperties: vi.fn() }));
vi.mock('../../../services/adminService', () => ({ adminService: { fetchAdminStats: vi.fn() } }));

describe('AdminDashboard', () => {
  const featuredProperty = {
    _id: 'property-1',
    title: 'Sample featured property',
    location: 'Ikoyi',
    price: 1000000,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1000,
    status: 'available',
    featured: true,
    media: [],
  } as unknown as Property;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProperties).mockReturnValue({ properties: [featuredProperty] } as unknown as ReturnType<typeof useProperties>);
    vi.mocked(adminService.fetchAdminStats).mockResolvedValue({
      totalUsers: 14,
      totalProperties: 8,
      activeListings: 3,
      soldProperties: 2,
      totalInquiries: 5,
      totalRevenue: 1000,
    });
  });

  it('links authoritative aggregate cards to their existing admin workspaces', async () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('14')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Open Total Users' })).toHaveAttribute('href', '/dashboard/admin/manage-users');
    expect(screen.getByRole('link', { name: 'Open Total Properties' })).toHaveAttribute('href', '/dashboard/admin/manage-properties');
    expect(screen.getByRole('link', { name: 'Open Total Revenue' })).toHaveAttribute('href', '/dashboard/admin/wallet');
    expect(screen.getByRole('link', { name: 'Open Total Inquiries' })).toHaveAttribute('href', '/dashboard/admin/manage-inquiries');
  });

  it('does not present an unsupported date filter as though the stats endpoint applied it', async () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

    await waitFor(() => expect(adminService.fetchAdminStats).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: /last 30 days/i })).not.toBeInTheDocument();
  });

  it('opens a featured result in its authorized admin detail route', async () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Open property Sample featured property' })).toHaveAttribute(
      'href',
      '/dashboard/admin/property-details/property-1',
    );
  });
});
