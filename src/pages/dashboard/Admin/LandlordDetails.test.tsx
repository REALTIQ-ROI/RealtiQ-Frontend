import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../../types';
import { userService } from '../../../services/userService';
import LandlordDetails from './LandlordDetails';

vi.mock('../../../components/layout/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../services/userService', () => ({
  userService: { fetchLandlordById: vi.fn() },
}));

describe('LandlordDetails', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows merged contact, property, verification, and trust details', async () => {
    vi.mocked(userService.fetchLandlordById).mockResolvedValue({
      _id: 'landlord-1',
      name: 'Ada Landlord',
      email: 'ada@example.test',
      phone: '+2348000000000',
      role: 'landlord',
      propertyCount: 4,
      landlordVerified: true,
      trustBadge: 'gold',
    } as User);

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/landlord-details/landlord-1']}>
        <Routes>
          <Route path="/dashboard/admin/landlord-details/:id" element={<LandlordDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('Ada Landlord')).not.toHaveLength(0);
    expect(screen.getAllByText('ada@example.test').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+2348000000000').length).toBeGreaterThan(0);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Verified Account')).toBeInTheDocument();
    expect(screen.getAllByLabelText('gold RealtIQ trust badge').length).toBeGreaterThan(0);
  });
});
