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
  userService: { fetchOwnerById: vi.fn() },
}));

describe('OwnerDetails', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows merged contact, property, verification, and trust details', async () => {
    vi.mocked(userService.fetchOwnerById).mockResolvedValue({
      _id: 'owner-1',
      name: 'Ada Example',
      email: 'ada@example.test',
      phone: '+2348000000000',
      role: 'owner',
      accountStatus: 'active',
      emailVerified: true,
      propertyCount: 4,
      ownerVerified: true,
      trustBadge: 'gold',
    } as User);

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/owners/owner-1']}>
        <Routes>
          <Route path="/dashboard/admin/owners/:id" element={<LandlordDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('Ada Example')).not.toHaveLength(0);
    expect(screen.getAllByText('ada@example.test').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+2348000000000').length).toBeGreaterThan(0);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Verified Account')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('Email verification:')).toBeInTheDocument();
    expect(screen.getByText('Owner verification:')).toBeInTheDocument();
    expect(screen.getByText('Trust badge:')).toBeInTheDocument();
    expect(screen.getAllByLabelText('gold RealtIQ trust badge').length).toBeGreaterThan(0);
  });
});
