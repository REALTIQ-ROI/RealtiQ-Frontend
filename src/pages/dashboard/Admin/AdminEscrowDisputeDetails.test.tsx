import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Swal from 'sweetalert2';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAsync } from '../../../hooks/useAsync';
import { escrowService } from '../../../services/escrowService';
import { ApiRequestError } from '../../../lib/axios';
import type { AdminEscrowDisputeDetail } from '../../../types/escrow';
import AdminEscrowDisputeDetails from './AdminEscrowDisputeDetails';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));
vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../hooks/useAsync', () => ({ useAsync: vi.fn() }));
vi.mock('../../../services/escrowService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../services/escrowService')>();
  return { ...original, escrowService: { ...original.escrowService, resolveAdminDispute: vi.fn() } };
});

const detail: AdminEscrowDisputeDetail = {
  dispute: {
    _id: 'd1',
    escrow: 'e1',
    raisedBy: 'b1',
    reason: 'Milestone evidence requires review',
    description: 'Inspection evidence does not match.',
    evidence: [{ documentId: 'doc1', label: 'Inspection report' }],
    status: 'open',
    preDisputeStatus: 'release_pending',
    openedAt: '2026-07-25T12:00:00.000Z',
    createdAt: '2026-07-25T12:00:00.000Z',
    updatedAt: '2026-07-25T12:00:00.000Z',
  },
  escrow: {
    _id: 'e1',
    amount: 75_000_000,
    status: 'disputed',
    refundStatus: 'none',
    sellerPayoutStatus: 'none',
    createdAt: '2026-07-24T12:00:00.000Z',
    property: { _id: 'p1', publicReference: 'RTQ-PROP-1', title: 'Lekki Home', price: 75_000_000, location: 'Lekki', currency: 'NGN', propertyType: 'house', media: [], status: 'available' },
    buyer: { _id: 'b1', name: 'Ada Buyer', email: 'ada@example.com', role: 'buyer' },
    seller: { _id: 's1', name: 'Tunde Seller', email: 'tunde@example.com', role: 'landlord' },
    rules: [
      { _id: 'r1', type: 'inspection_completed', description: 'Inspection complete', required: true, satisfied: true },
      { _id: 'r2', type: 'document_verified', description: 'Verify title document', required: true, satisfied: false },
    ],
  },
  milestones: {
    all: [],
    satisfied: [],
    outstanding: [{ _id: 'r2', type: 'document_verified', description: 'Verify title document', required: true, satisfied: false }],
  },
  financialState: { paymentStatus: 'paid', refund: null, sellerPayout: null },
  history: [],
  logs: [{ action: 'disputed', createdAt: '2026-07-25T12:00:00.000Z', note: 'Opened by buyer' }],
  availableActions: { reopen: true, refundBuyer: true, releaseSeller: false, cancelEscrow: true },
};

const renderPage = () => render(
  <MemoryRouter initialEntries={['/dashboard/admin/escrow-disputes/d1']}>
    <Routes><Route path="/dashboard/admin/escrow-disputes/:disputeId" element={<AdminEscrowDisputeDetails />} /></Routes>
  </MemoryRouter>,
);

describe('AdminEscrowDisputeDetails', () => {
  const execute = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    execute.mockResolvedValue(detail);
    vi.mocked(useAsync).mockReturnValue({ data: detail, loading: false, error: null, execute });
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true, isDenied: false, isDismissed: false, value: 'Reviewed decision' });
  });

  it('renders transaction context, milestones, history, logs, and exactly four actions', () => {
    renderPage();
    expect(screen.getByText('Ada Buyer · ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('Tunde Seller · tunde@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Inspection report.*doc1/)).toBeInTheDocument();
    expect(screen.getByText('Opened by buyer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen Escrow' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Refund Buyer' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Release Funds to Seller/Landlord' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel Escrow' })).toBeEnabled();
    expect(screen.getAllByText('Verify title document')).toHaveLength(2);
  });

  it('submits a required reason and renders a financial 202 as processing, not released', async () => {
    vi.mocked(escrowService.resolveAdminDispute).mockResolvedValue({
      status: 202,
      data: {
        escrow: { _id: 'e1', status: 'refund_processing', refundStatus: 'processing' },
        pending: true,
      },
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Refund Buyer' }));
    await waitFor(() => expect(escrowService.resolveAdminDispute).toHaveBeenCalledWith('d1', {
      action: 'refund_buyer',
      reason: 'Reviewed decision',
    }));
    expect(await screen.findByText(/Buyer refund processing has started/i)).toBeInTheDocument();
    expect(screen.queryByText('Buyer refunded')).not.toBeInTheDocument();
  });

  it('shows seller-owned payout guidance and refetches a conflicting state', async () => {
    const releasable: AdminEscrowDisputeDetail = {
      ...detail,
      escrow: {
        ...detail.escrow,
        rules: detail.escrow.rules?.map((rule) => ({ ...rule, satisfied: true })),
      },
      milestones: { all: [], satisfied: [], outstanding: [] },
      availableActions: { ...detail.availableActions, releaseSeller: true },
    };
    vi.mocked(useAsync).mockReturnValue({ data: releasable, loading: false, error: null, execute });
    vi.mocked(escrowService.resolveAdminDispute).mockRejectedValueOnce(new ApiRequestError(
      'Seller payout account details are required before funds can be released.',
      { status: 409, requiresSellerAccount: true },
    ));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Release Funds to Seller/Landlord' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/seller must configure their payout account from landlord settings/i);
    expect(execute).toHaveBeenCalled();
  });

  it('blocks repeated financial actions when provider reconciliation is required', async () => {
    vi.mocked(escrowService.resolveAdminDispute).mockResolvedValue({
      status: 202,
      data: {
        escrow: { _id: 'e1', status: 'refund_processing' },
        pending: true,
        reconciliationRequired: true,
      },
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Refund Buyer' }));
    expect(await screen.findAllByText(/Provider confirmation is pending/i)).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Refund Buyer' })).toBeDisabled();
  });
});
