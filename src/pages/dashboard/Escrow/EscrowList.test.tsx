import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../../lib/axios';
import { escrowService } from '../../../services/escrowService';
import { propertyService } from '../../../services/propertyService';
import EscrowList from './EscrowList';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'admin-1', role: 'admin' }, activeProfile: { id: 'staff-profile-1' } }),
}));
vi.mock('../../../components/escrow/EscrowRoleLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../services/escrowService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../services/escrowService')>();
  return { ...original, escrowService: { ...original.escrowService, list: vi.fn(), get: vi.fn() } };
});
vi.mock('../../../services/propertyService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../services/propertyService')>();
  return { ...original, propertyService: { ...original.propertyService, getPropertyById: vi.fn() } };
});

const listedEscrow = {
  _id: 'escrow-1',
  property: 'property-1',
  amount: 2_000_000,
  status: 'locked',
  createdAt: '2026-10-27T12:00:00.000Z',
} as never;

describe('EscrowList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(escrowService.list).mockResolvedValue([listedEscrow]);
    vi.mocked(propertyService.getPropertyById).mockResolvedValue({
      _id: 'property-1',
      title: 'Apartment in Ikeja',
      location: 'Ikeja, Lagos',
      currency: 'NGN',
      media: [{ url: 'https://images.example.test/apartment.jpg', type: 'image', public_id: 'apartment' }],
    } as never);
  });

  it('loads release conditions and the linked apartment image for escrow cards', async () => {
    vi.mocked(escrowService.get).mockResolvedValue({
      ...listedEscrow,
      rules: [],
    } as never);

    render(<MemoryRouter><EscrowList /></MemoryRouter>);

    expect(await screen.findByText('No required release conditions.')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Apartment in Ikeja' })).toHaveAttribute(
      'src',
      'https://images.example.test/apartment.jpg',
    );
    expect(escrowService.get).toHaveBeenCalledWith('escrow-1');
    expect(propertyService.getPropertyById).toHaveBeenCalledWith('property-1');
    expect(screen.queryByText('Loading release conditions...')).not.toBeInTheDocument();
  });

  it('shows a retry after detail loading fails and clears the stuck loading state', async () => {
    vi.mocked(escrowService.get)
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce({
        ...listedEscrow,
        rules: [{ _id: 'rule-1', type: 'inspection_completed', description: 'Inspection', required: true, satisfied: false }],
      } as never);

    render(<MemoryRouter><EscrowList /></MemoryRouter>);

    const retry = await screen.findByRole('button', { name: 'Retry' });
    expect(screen.queryByText('Loading release conditions...')).not.toBeInTheDocument();
    fireEvent.click(retry);

    await waitFor(() => expect(screen.getByText('0/1')).toBeInTheDocument());
    expect(escrowService.get).toHaveBeenCalledTimes(2);
  });

  it('explains when the active profile is not authorized to read release conditions', async () => {
    vi.mocked(escrowService.get).mockRejectedValueOnce(new ApiRequestError('You do not have permission to perform this action with the current profile.', { status: 403 }));

    render(<MemoryRouter><EscrowList /></MemoryRouter>);

    expect(await screen.findByText(/not authorized to view release conditions/i)).toBeInTheDocument();
    expect(screen.getByText(/participant access or authorized finance access/i)).toBeInTheDocument();
    expect(screen.queryByText('No required release conditions.')).not.toBeInTheDocument();
  });

  it('uses the API `id` when an escrow projection does not include `_id`', async () => {
    const idOnlyEscrow = { ...listedEscrow, _id: undefined, id: 'escrow-id-only' } as never;
    vi.mocked(escrowService.list).mockResolvedValue([idOnlyEscrow]);
    vi.mocked(escrowService.get).mockResolvedValue({ ...idOnlyEscrow, rules: [] } as never);

    render(<MemoryRouter><EscrowList /></MemoryRouter>);

    const detailsLink = await screen.findByRole('link', { name: 'View escrow' });
    expect(detailsLink).toHaveAttribute('href', '/dashboard/admin/escrows/escrow-id-only');
    await waitFor(() => expect(escrowService.get).toHaveBeenCalledWith('escrow-id-only'));
    expect(detailsLink.getAttribute('href')).not.toContain('undefined');
  });
});
