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
  userService: { fetchLandlords: vi.fn() },
}));

describe('ManageLandlords', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders landlord records when optional display fields are missing', async () => {
    vi.mocked(userService.fetchLandlords).mockResolvedValue([
      { _id: 'landlord-1', name: undefined, email: undefined, role: 'landlord' },
    ] as unknown as User[]);

    render(
      <MemoryRouter>
        <ManageLandlords />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: 'Unnamed landlord' })).toBeInTheDocument();
    expect(screen.getByText('No email on file')).toBeInTheDocument();
  });

  it('shows landlord-specific counts, verified status, contact details, and trust badge', async () => {
    vi.mocked(userService.fetchLandlords).mockResolvedValue([
      {
        _id: 'landlord-2',
        name: 'Ada Landlord',
        email: 'ada@example.test',
        phone: '+2348000000000',
        role: 'landlord',
        propertyCount: 6,
        landlordVerified: true,
        trustBadge: 'gold',
      },
    ]);

    render(
      <MemoryRouter>
        <ManageLandlords />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Ada Landlord')).toBeInTheDocument();
    expect(screen.getByText('ada@example.test')).toBeInTheDocument();
    expect(screen.getByText('+2348000000000')).toBeInTheDocument();
    expect(screen.getByText('Verified', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByLabelText('gold RealtIQ trust badge')).toBeInTheDocument();
    expect(screen.getAllByText('6')).toHaveLength(2);
  });
});
