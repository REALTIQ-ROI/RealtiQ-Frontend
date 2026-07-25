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
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { _id: state.role === 'buyer' ? 'b1' : state.role === 'landlord' ? 's1' : 'a1', name: 'User', email: 'u@test', role: state.role } }) }));
vi.mock('../../../components/escrow/EscrowRoleLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../components/escrow/RefundChat', () => ({ default: () => <section data-testid="refund-chat">Refund conversation</section> }));
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
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  it('shows buyer rule and dispute actions but never release actions', async () => {
    renderDetails(makeEscrow('locked'));
    expect(screen.getByText(/legacy escrow does not have milestone amount allocations/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Satisfy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Raise dispute' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /release/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Raise dispute' }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Milestone evidence requires review' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit dispute' }));
    await waitFor(() => expect(escrowService.dispute).toHaveBeenCalledWith('e1', {
      reason: 'Milestone evidence requires review',
      description: undefined,
      evidence: [],
      metadata: { source: 'escrow_detail' },
    }));
  });
  it('shows controlled final release only to admin when requirements are complete', () => {
    state.role = 'admin'; renderDetails(makeEscrow('release_pending', true));
    expect(screen.getByRole('button', { name: 'Approve final release' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Raise dispute' })).not.toBeInTheDocument();
  });
  it('allows the related seller to open the dispute form but hides it for terminal escrows', () => {
    state.role = 'landlord';
    const { unmount } = renderDetails(makeEscrow('locked'));
    expect(screen.getByRole('button', { name: 'Raise dispute' })).toBeInTheDocument();
    unmount();
    renderDetails(makeEscrow('released', true));
    expect(screen.queryByRole('button', { name: 'Raise dispute' })).not.toBeInTheDocument();
  });
  it('recognizes compact buyer and seller string references as escrow participants', () => {
    const buyerEscrow = makeEscrow('locked');
    buyerEscrow.buyer = 'b1';
    const { unmount } = renderDetails(buyerEscrow);
    expect(screen.getByRole('button', { name: 'Raise dispute' })).toBeInTheDocument();

    unmount();
    state.role = 'landlord';
    const sellerEscrow = makeEscrow('locked');
    sellerEscrow.seller = 's1';
    renderDetails(sellerEscrow);
    expect(screen.getByRole('button', { name: 'Raise dispute' })).toBeInTheDocument();
  });
  it('does not render refund conversation controls for landlords', () => {
    state.role = 'landlord';
    const escrow = makeEscrow('refund_processing');
    escrow.refundStatus = 'processing';
    renderDetails(escrow);
    expect(screen.queryByTestId('refund-chat')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /refund conversation/i })).not.toBeInTheDocument();
  });
  it('keeps provider-status polling silent instead of replacing the page loader', async () => {
    vi.useFakeTimers();
    const escrow = makeEscrow('refund_processing');
    escrow.refundStatus = 'processing';
    const execute = vi.fn().mockResolvedValue(escrow);
    vi.mocked(useAsync).mockReturnValue({ data: escrow, loading: false, error: null, execute });
    render(<MemoryRouter initialEntries={['/escrows/e1']}><Routes><Route path="/escrows/:id" element={<EscrowDetails />} /></Routes></MemoryRouter>);

    await vi.advanceTimersByTimeAsync(15_000);

    expect(execute).toHaveBeenCalledWith({ silent: true });
    expect(screen.queryByText('Loading escrow...')).not.toBeInTheDocument();
  });
  it('keeps milestone progress visible but read-only while disputed', () => {
    const escrow = makeEscrow('disputed', true);
    escrow.disputes = [{
      _id: 'd1',
      escrow: 'e1',
      raisedBy: escrow.buyer!,
      reason: 'Evidence review',
      evidence: [],
      status: 'open',
      preDisputeStatus: 'locked',
      openedAt: '2026-07-25T12:00:00Z',
      createdAt: '2026-07-25T12:00:00Z',
      updatedAt: '2026-07-25T12:00:00Z',
    }];
    renderDetails(escrow);
    expect(screen.getByText(/Dispute under review/i)).toBeInTheDocument();
    expect(screen.getByText('Evidence review')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Milestone progress' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Satisfy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /release/i })).not.toBeInTheDocument();
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
  it('shows a duplicate dispute conflict and refetches current escrow state', async () => {
    const escrow = makeEscrow('locked');
    const execute = vi.fn().mockResolvedValue(escrow);
    vi.mocked(useAsync).mockReturnValue({ data: escrow, loading: false, error: null, execute });
    vi.mocked(escrowService.dispute).mockRejectedValueOnce(new ApiRequestError(
      'An active dispute already exists for this escrow.',
      { status: 409 },
    ));
    render(<MemoryRouter initialEntries={['/escrows/e1']}><Routes><Route path="/escrows/:id" element={<EscrowDetails />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Raise dispute' }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Duplicate review' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit dispute' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('An active dispute already exists');
    expect(execute).toHaveBeenCalled();
  });

  it('renders ordered milestone allocation progress without describing it as released funds', () => {
    const escrow = makeEscrow('locked');
    escrow.rules = [
      { _id: 'r3', sequence: 3, type: 'physical_handover_completed', description: 'Handover', required: true, amount: 40_000_000, satisfied: false },
      { _id: 'r1', sequence: 1, type: 'inspection_completed', description: 'Inspection', required: true, amount: 25_000_000, satisfied: true },
      { _id: 'r2', sequence: 2, type: 'document_verified', description: 'Documents', required: true, amount: 35_000_000, satisfied: false },
    ];
    escrow.milestoneSummary = {
      configured: true,
      totalAllocated: 100_000_000,
      satisfiedAmount: 25_000_000,
      remainingAmount: 75_000_000,
      milestoneCount: 3,
      satisfiedMilestoneCount: 1,
    };

    renderDetails(escrow);

    expect(screen.getByRole('heading', { name: 'Milestone progress' })).toBeInTheDocument();
    expect(screen.getByText('Satisfied allocation').parentElement).toHaveTextContent(/25,000,000/);
    expect(screen.getByText('Remaining allocation').parentElement).toHaveTextContent(/75,000,000/);
    expect(screen.getByText(/not money released or transferred/i)).toBeInTheDocument();
    const milestoneLabels = screen.getAllByText(/Milestone [123]/).map((item) => item.textContent);
    expect(milestoneLabels).toEqual(['Milestone 1', 'Milestone 2', 'Milestone 3']);
  });

  it('allows milestones to be satisfied only in sequence', () => {
    const escrow = makeEscrow('locked');
    escrow.rules = [
      { _id: 'r1', sequence: 1, type: 'buyer_confirmation_required', description: 'First confirmation', required: true, satisfied: false },
      { _id: 'r2', sequence: 2, type: 'inspection_completed', description: 'Second confirmation', required: true, satisfied: false },
      { _id: 'r3', sequence: 3, type: 'buyer_confirmation_required', description: 'Final confirmation', required: true, satisfied: false },
    ];

    renderDetails(escrow);

    const satisfyButtons = screen.getAllByRole('button', { name: 'Satisfy' });
    expect(satisfyButtons).toHaveLength(3);
    expect(satisfyButtons[0]).toBeEnabled();
    expect(satisfyButtons[1]).toBeDisabled();
    expect(satisfyButtons[2]).toBeDisabled();
    expect(screen.getAllByText('Complete milestone 1 first.')).toHaveLength(2);
  });

  it('applies the returned milestone summary immediately after satisfying a rule', async () => {
    const escrow = makeEscrow('locked');
    escrow.rules = [{
      _id: 'r1',
      sequence: 1,
      type: 'buyer_confirmation_required',
      description: 'Buyer confirms inspection',
      required: true,
      amount: 50_000_000,
      satisfied: false,
    }];
    escrow.milestoneSummary = {
      configured: true,
      totalAllocated: 50_000_000,
      satisfiedAmount: 0,
      remainingAmount: 50_000_000,
      milestoneCount: 1,
      satisfiedMilestoneCount: 0,
    };
    vi.mocked(escrowService.satisfyRule).mockResolvedValueOnce({
      escrow: { _id: 'e1', status: 'locked', amount: 50_000_000 },
      rule: { ...escrow.rules[0], satisfied: true },
      missingRules: [],
      milestoneSummary: {
        configured: true,
        totalAllocated: 50_000_000,
        satisfiedAmount: 50_000_000,
        remainingAmount: 0,
        milestoneCount: 1,
        satisfiedMilestoneCount: 1,
      },
    });

    renderDetails(escrow);
    fireEvent.click(screen.getByRole('button', { name: 'Satisfy' }));

    await waitFor(() =>
      expect(screen.getByText('Satisfied allocation').parentElement)
        .toHaveTextContent(/50,000,000/),
    );
    expect(escrowService.satisfyRule).toHaveBeenCalledWith('e1', 'r1', 'Audit note');
  });
});
