import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAsync } from '../../../hooks/useAsync';
import type { AdminEscrowDisputeDetail } from '../../../types/escrow';
import AdminEscrowDisputeDetails from './AdminEscrowDisputeDetails';

vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../hooks/useAsync', () => ({ useAsync: vi.fn() }));

const detail: AdminEscrowDisputeDetail = {
  dispute: {
    id: 'd1', reason: 'Milestone evidence requires review', description: 'Inspection evidence does not match.',
    status: 'open', preDisputeStatus: 'release_pending', resolution: null,
    openedAt: '2026-07-25T12:00:00.000Z', resolvedAt: null,
    createdAt: '2026-07-25T12:00:00.000Z', updatedAt: '2026-07-25T12:00:00.000Z',
  },
  escrow: { id: 'e1', status: 'disputed' },
  milestones: { all: [{ id: 'r1' }, { id: 'r2' }], satisfied: [{ id: 'r1' }], outstanding: [{ id: 'r2' }] },
  financialState: { paymentStatus: 'paid', refund: null, sellerPayout: null },
  history: [], logs: [],
  availableActions: { reopen: true, refundBuyer: true, releaseSeller: false, cancelEscrow: true },
};

const renderPage = () => render(
  <MemoryRouter initialEntries={['/dashboard/admin/escrow-disputes/d1']}>
    <Routes><Route path="/dashboard/admin/escrow-disputes/:disputeId" element={<AdminEscrowDisputeDetails />} /></Routes>
  </MemoryRouter>,
);

describe('safe finance dispute detail', () => {
  const execute = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAsync).mockReturnValue({ data: detail, loading: false, error: null, execute });
  });

  it('shows only safe dispute status, financial state and milestone counts', () => {
    renderPage();
    expect(screen.getByText('Dispute d1')).toBeInTheDocument();
    expect(screen.getByText('Milestone evidence requires review')).toBeInTheDocument();
    expect(screen.getByText('1 satisfied, 1 outstanding, 2 total')).toBeInTheDocument();
    expect(screen.getByText(/Resolution submission is temporarily unavailable/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refund buyer' })).not.toBeInTheDocument();
  });

  it('refreshes canonical status on demand', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(execute).toHaveBeenCalled();
  });
});
