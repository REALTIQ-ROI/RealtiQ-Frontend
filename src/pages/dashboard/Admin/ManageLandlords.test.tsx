import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../../types';
import { userService } from '../../../services/userService';
import ManageLandlords from './ManageLandlords';

vi.mock('../../../components/layout/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../services/userService', () => ({
  userService: { fetchOwners: vi.fn() },
}));

describe('Manage Owners', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders owner records when optional display fields are missing', async () => {
    vi.mocked(userService.fetchOwners).mockResolvedValue([
      { _id: 'owner-1', name: undefined, email: undefined, role: 'owner' },
    ] as unknown as User[]);

    render(
      <MemoryRouter>
        <ManageLandlords />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: 'Unnamed owner' })).toBeInTheDocument();
    expect(screen.getByText('No email on file')).toBeInTheDocument();
  });

  it('shows property counts, owner verification, contact details, and trust badge', async () => {
    vi.mocked(userService.fetchOwners).mockResolvedValue([
      {
        _id: 'owner-2',
        name: 'Ada Example',
        email: 'ada@example.test',
        phone: '+2348000000000',
        role: 'owner',
        accountStatus: 'active',
        emailVerified: true,
        propertyCount: 6,
        ownerVerified: true,
        trustBadge: 'gold',
      },
    ]);

    render(
      <MemoryRouter>
        <ManageLandlords />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Ada Example')).toBeInTheDocument();
    expect(screen.getByText('ada@example.test')).toBeInTheDocument();
    expect(screen.getByText('+2348000000000')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('Email verified')).toBeInTheDocument();
    expect(screen.getAllByText('Owner verified').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('gold RealtIQ trust badge')).toBeInTheDocument();
    expect(screen.getAllByText('6')).toHaveLength(2);
  });
});
