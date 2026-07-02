import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../../lib/axios';
import type { UserRole } from '../../../types';
import type { Escrow } from '../../../types/escrow';
import EscrowDetails from './EscrowDetails';
import { escrowService } from '../../../services/escrowService';
import { useAsync } from '../../../hooks/useAsync';

const state = vi.hoisted(() => ({ role: 'buyer' as UserRole }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { _id: 'u1', name: 'User', email: 'u@test', role: state.role } }) }));
vi.mock('../../../components/escrow/EscrowRoleLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../hooks/useAsync', () => ({ useAsync: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('sweetalert2', () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true, value: 'Audit note' }) } }));
vi.mock('../../../services/escrowService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../services/escrowService')>();
  return { ...original, escrowService: { ...original.escrowService, dispute: vi.fn(), requestRelease: vi.fn(), approveRelease: vi.fn(), satisfyRule: vi.fn(), cancel: vi.fn() } };
});

const makeEscrow = (status: Escrow['status'], satisfied = false): Escrow => ({
  _id: 'e1', amount: 50_000_000, currency: 'NGN', status, createdAt: '2026-01-01T00:00:00Z', logs: [],
  property: { _id: 'p1', title: 'Lagos Home', price: 50_000_000, location: 'Lagos', currency: 'NGN', propertyType: 'house', media: [], status: 'available' },
  buyer: { _id: 'b1', name: 'Buyer', email: 'b@test', role: 'buyer' }, seller: { _id: 's1', name: 'Seller', email: 's@test', role: 'landlord' },
  rules: [{ _id: 'r1', type: 'buyer_confirmation_required', description: 'Buyer confirms inspection', required: true, satisfied }],
});
const renderDetails = (escrow: Escrow | null, loading = false, error: string | null = null) => {
  vi.mocked(useAsync).mockReturnValue({ data: escrow, loading, error, execute: vi.fn().mockResolvedValue(escrow) });
  return render(<MemoryRouter initialEntries={['/escrows/e1']}><Routes><Route path="/escrows/:id" element={<EscrowDetails />} /></Routes></MemoryRouter>);
};

describe('EscrowDetails role actions and resilience', () => {
  beforeEach(() => { state.role = 'buyer'; });
  afterEach(() => cleanup());
  it('shows buyer rule and dispute actions but never release actions', async () => {
    renderDetails(makeEscrow('locked'));
    expect(screen.getByRole('button', { name: 'Satisfy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Raise dispute' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /release/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Raise dispute' }));
    await waitFor(() => expect(escrowService.dispute).toHaveBeenCalledWith('e1', 'Audit note'));
  });
  it('shows controlled final release only to admin when requirements are complete', () => {
    state.role = 'admin'; renderDetails(makeEscrow('release_pending', true));
    expect(screen.getByRole('button', { name: 'Approve final release' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Raise dispute' })).not.toBeInTheDocument();
  });
  it('renders loading and API error recovery states', () => {
    const { rerender } = renderDetails(null, true);
    expect(screen.getByText('Loading escrow...')).toBeInTheDocument();
    vi.mocked(useAsync).mockReturnValue({ data: null, loading: false, error: 'Access forbidden (403).', execute: vi.fn().mockResolvedValue(null) });
    rerender(<MemoryRouter initialEntries={['/escrows/e1']}><Routes><Route path="/escrows/:id" element={<EscrowDetails />} /></Routes></MemoryRouter>);
    expect(screen.getByText('Access forbidden (403).')).toBeInTheDocument();
  });
  it('shows exact 409 missing-rule context after a conflicting release request', async () => {
    state.role = 'landlord';
    vi.mocked(escrowService.requestRelease).mockRejectedValueOnce(new ApiRequestError('Conditions remain', { status: 409, missingRules: [{ description: 'Verified title document' }] }));
    renderDetails(makeEscrow('locked', true));
    fireEvent.click(screen.getByRole('button', { name: 'Request release' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Missing: Verified title document');
  });
});
