import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../../lib/axios';
import type { Property, UserRole } from '../../../types';
import type { Escrow, EscrowRule } from '../../../types/escrow';
import EscrowDetails from './EscrowDetails';
import { escrowService } from '../../../services/escrowService';
import { propertyService } from '../../../services/propertyService';
import { useAsync } from '../../../hooks/useAsync';

const state = vi.hoisted(() => ({ role: 'buyer' as UserRole }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { _id: state.role === 'buyer' ? 'b1' : state.role === 'landlord' ? 's1' : 'a1', name: 'User', email: 'u@test', role: state.role }, activeProfile: { id: 'staff-profile' } }) }));
vi.mock('../../../components/escrow/EscrowRoleLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../components/escrow/RefundChat', () => ({ default: () => <section data-testid="refund-chat">Refund conversation</section> }));
vi.mock('../../../hooks/useAsync', () => ({ useAsync: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('sweetalert2', () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true, value: 'Audit note' }) } }));
vi.mock('../../../services/escrowService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../services/escrowService')>();
  return { ...original, escrowService: { ...original.escrowService, dispute: vi.fn(), requestRelease: vi.fn(), approveRelease: vi.fn(), satisfyRule: vi.fn(), cancel: vi.fn() } };
});
vi.mock('../../../services/propertyService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../services/propertyService')>();
  return { ...original, propertyService: { ...original.propertyService, getPropertyById: vi.fn() } };
});

const makeEscrow = (status: Escrow['status'], satisfied = false): Escrow => ({
  _id: 'e1', amount: 50_000_000, currency: 'NGN', status, createdAt: '2026-01-01T00:00:00Z', logs: [],
  property: { _id: 'p1', title: 'Lagos Home', price: 50_000_000, location: 'Lagos', currency: 'NGN', propertyType: 'house', media: [], status: 'available' },
  buyer: { _id: 'b1', name: 'Buyer', email: 'b@test', role: 'buyer' }, seller: { _id: 's1', name: 'Seller', email: 's@test', role: 'landlord' },
  rules: [{ _id: 'r1', type: 'buyer_confirmation_required', description: 'Buyer confirms inspection', required: true, satisfied }],
});
const renderDetails = (escrow: Escrow | null, loading = false, error: string | null = null, route = '/escrows/e1') => {
  vi.mocked(useAsync).mockReturnValue({ data: escrow, loading, error, execute: vi.fn().mockResolvedValue(escrow) });
  return render(<MemoryRouter initialEntries={[route]}><Routes><Route path="/escrows/:id" element={<EscrowDetails />} /><Route path="/escrows" element={<EscrowDetails />} /></Routes></MemoryRouter>);
};

describe('EscrowDetails role actions and resilience', () => {
  beforeEach(() => {
    state.role = 'buyer';
    vi.mocked(propertyService.getPropertyById).mockReset().mockResolvedValue({ media: [] } as Property);
  });
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
  it('renders buyer and seller names from the detail participants projection', () => {
    const escrow = makeEscrow('locked');
    escrow.buyer = { _id: 'b1', name: 'Legacy buyer name', email: 'buyer@example.test', role: 'buyer' };
    escrow.seller = { _id: 's1', name: 'Legacy seller name', email: 'seller@example.test', role: 'landlord' };
    escrow.payment = {
      user: { _id: 'b1', name: 'Payment account name', email: 'buyer@example.test' },
    } as NonNullable<Escrow['payment']>;
    escrow.participants = {
      buyer: { profileId: 'buyer-profile-id', name: 'Buyer profile name' },
      seller: { profileId: 'seller-profile-id', name: 'Seller profile name' },
    };

    renderDetails(escrow);

    expect(screen.getByText('Buyer profile name', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('Seller profile name', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.queryByText('buyer-profile-id')).not.toBeInTheDocument();
    expect(screen.queryByText('seller-profile-id')).not.toBeInTheDocument();
    expect(screen.queryByText('Legacy buyer name')).not.toBeInTheDocument();
    expect(screen.queryByText('Payment account name')).not.toBeInTheDocument();
    expect(screen.queryByText('Legacy seller name')).not.toBeInTheDocument();
  });
  it('shows neutral unavailable labels for null participants without inferring names', async () => {
    const escrow = makeEscrow('locked');
    escrow.buyer = 'buyer-account';
    escrow.buyerId = 'buyer-profile';
    escrow.seller = 'seller-profile';
    escrow.sellerId = 'seller-account';
    escrow.payment = {
      user: { _id: 'buyer-account', name: 'Do Not Use Payment Name', email: 'buyer@example.test' },
    } as NonNullable<Escrow['payment']>;
    escrow.participants = { buyer: null, seller: null };
    escrow.property = 'p1';
    escrow.propertyId = { _id: 'p1', title: 'Property', price: escrow.amount, location: 'Lagos', currency: 'NGN', propertyType: 'house', media: [] };
    vi.mocked(propertyService.getPropertyById).mockResolvedValueOnce({
      _id: 'p1', title: 'Property', price: escrow.amount, location: 'Lagos', currency: 'NGN',
      propertyType: 'house', media: [], owner: { _id: 'seller-account', name: 'Do Not Use Property Owner Name' },
    } as Property);

    renderDetails(escrow);

    expect(screen.getByText('Buyer details unavailable')).toBeInTheDocument();
    expect(screen.getByText('Seller details unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Do Not Use Payment Name')).not.toBeInTheDocument();
    expect(screen.queryByText('Do Not Use Property Owner Name')).not.toBeInTheDocument();
  });
  it('loads the associated property image when the escrow response omits media', async () => {
    const escrow = makeEscrow('locked');
    escrow.property = 'p1';
    escrow.propertyId = { _id: 'p1', title: 'Escrow property', price: escrow.amount, location: 'Lagos', currency: 'NGN', propertyType: 'house', media: [], status: 'available' };
    vi.mocked(propertyService.getPropertyById).mockResolvedValueOnce({
      _id: 'p1',
      title: 'Hydrated Lagos Home',
      price: escrow.amount,
      location: 'Lagos',
      currency: 'NGN',
      propertyType: 'house',
      media: [{ url: '/property/apartment.jpg', public_id: 'apartment', type: 'image' }],
      status: 'available',
    } as Property);

    renderDetails(escrow);

    const image = await screen.findByRole('img', { name: 'Hydrated Lagos Home' });
    expect(image).toHaveAttribute('src', '/property/apartment.jpg');
    expect(propertyService.getPropertyById).toHaveBeenCalledWith('p1');
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
    escrow.buyer = 'b1';
    escrow.buyerId = { _id: 'b1', name: 'Buyer Who Opened It', email: 'buyer@example.test', role: 'buyer' };
    escrow.participants = {
      buyer: { profileId: 'b1', name: 'Buyer Who Opened It' },
      seller: null,
    };
    escrow.disputes = [{
      _id: 'd1',
      escrow: 'e1',
      raisedBy: 'b1',
      openedBy: { profileId: 'b1', name: 'Buyer Who Opened It' },
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
    expect(screen.getAllByText('Buyer Who Opened It')).toHaveLength(2);
    expect(screen.getByRole('progressbar', { name: 'Milestone progress' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Satisfy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /release/i })).not.toBeInTheDocument();
  });
  it('renders the dispute opener from the detail openedBy projection', () => {
    const escrow = makeEscrow('disputed');
    escrow.disputes = [{
      id: 'd1', escrow: 'e1', raisedBy: 'some-other-id', reason: 'Seller dispute', evidence: [],
      openedBy: { profileId: 'opener-profile-id', name: 'Profile name' },
      status: 'open', preDisputeStatus: 'locked', openedAt: '2026-01-01T00:00:00Z', createdAt: '', updatedAt: '',
    }];

    renderDetails(escrow);

    expect(screen.getByText('Profile name')).toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });
  it('uses the neutral unavailable label for a null openedBy projection without guessing', () => {
    const escrow = makeEscrow('disputed');
    escrow.disputes = [{
      id: 'd1', escrow: 'e1', reason: 'Identity omitted', evidence: [], status: 'open',
      raisedBy: { _id: 'b1', name: 'Do Not Use Legacy Identity', email: 'buyer@example.test', role: 'buyer' },
      openedBy: null,
      preDisputeStatus: 'locked', openedAt: '2026-01-01T00:00:00Z', createdAt: '', updatedAt: '',
    }];

    renderDetails(escrow);

    expect(screen.getByText('Participant details unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Do Not Use Legacy Identity')).not.toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });
  it('renders loading and API error recovery states', () => {
    const { rerender } = renderDetails(null, true);
    expect(screen.getByText('Loading escrow...')).toBeInTheDocument();
    vi.mocked(useAsync).mockReturnValue({ data: null, loading: false, error: 'Access forbidden (403).', execute: vi.fn().mockResolvedValue(null) });
    rerender(<MemoryRouter initialEntries={['/escrows/e1']}><Routes><Route path="/escrows/:id" element={<EscrowDetails />} /></Routes></MemoryRouter>);
    expect(screen.getByText('Access forbidden (403).')).toBeInTheDocument();
  });
  it('does not request an escrow when the route ID is missing or the literal undefined placeholder', () => {
    renderDetails(null, false, null, '/escrows/undefined');
    expect(screen.getByText('This escrow link does not contain a valid escrow ID.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to escrows' })).toHaveAttribute('href', '/dashboard/buyer/escrows');
    expect(vi.mocked(useAsync).mock.calls.at(-1)?.[1]).toBe(false);

    cleanup();
    renderDetails(null, false, null, '/escrows');
    expect(screen.getByText('This escrow link does not contain a valid escrow ID.')).toBeInTheDocument();
    expect(vi.mocked(useAsync).mock.calls.at(-1)?.[1]).toBe(false);
  });
  it('ignores null release-rule entries and fails closed on release actions', () => {
    state.role = 'admin';
    const escrow = makeEscrow('release_pending', true);
    escrow.rules = [null, ...escrow.rules] as unknown as Escrow['rules'];

    renderDetails(escrow);

    expect(screen.getByRole('alert')).toHaveTextContent(/incomplete release-condition data/i);
    expect(screen.queryByRole('button', { name: 'Approve final release' })).not.toBeInTheDocument();
  });
  it('keeps identifier-less rules from becoming null during the update merge and sort', () => {
    state.role = 'admin';
    const escrow = makeEscrow('release_pending', true);
    escrow.rules = [{ type: 'admin_approval_required', description: 'Final approval', required: true } as EscrowRule];

    renderDetails(escrow);

    expect(screen.getByRole('alert')).toHaveTextContent(/incomplete release-condition data/i);
    expect(screen.getByText('Milestone 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve final release' })).not.toBeInTheDocument();
  });
  it('uses a rule `id` projection as the rule identifier', () => {
    const escrow = makeEscrow('locked');
    escrow.rules = [{ id: 'rule-id-only', type: 'buyer_confirmation_required', description: 'Confirm inspection', required: true, satisfied: false } as EscrowRule];

    renderDetails(escrow);

    expect(screen.getByText('Confirm inspection')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Satisfy' })).toBeInTheDocument();
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
