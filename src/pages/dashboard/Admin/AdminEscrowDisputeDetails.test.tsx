import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAsync } from '../../../hooks/useAsync';
import type { AdminEscrowDisputeDetail } from '../../../types/escrow';
import AdminEscrowDisputeDetails from './AdminEscrowDisputeDetails';

const stepUpMocks = vi.hoisted(() => ({ begin: vi.fn(), cancel: vi.fn(), complete: vi.fn(), getError: vi.fn() }));

vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../hooks/useAsync', () => ({ useAsync: vi.fn() }));
vi.mock('../../../hooks/useBoundStepUp', () => ({ useBoundStepUp: () => ({ ...stepUpMocks, challenge: null, busy: false, error: null }) }));

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
    stepUpMocks.begin.mockResolvedValue(true);
  });

  it('shows only safe dispute status, financial state and milestone counts', () => {
    renderPage();
    expect(screen.getByText('Dispute d1')).toBeInTheDocument();
    expect(screen.getByText('Milestone evidence requires review')).toBeInTheDocument();
    expect(screen.getByText('1 satisfied, 1 outstanding, 2 total')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refund buyer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Release seller' })).not.toBeInTheDocument();
  });

  it('starts the exact reason-bound dispute resolution request through step-up', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Decision reason'), { target: { value: 'Evidence supports the buyer refund.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Refund buyer' }));
    expect(stepUpMocks.begin).toHaveBeenCalledWith(expect.objectContaining({
      method: 'PATCH',
      path: '/api/admin/escrow-disputes/d1/resolve',
      body: { action: 'refund_buyer', reason: 'Evidence supports the buyer refund.' },
    }));
  });

  it('refreshes canonical status on demand', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(execute).toHaveBeenCalled();
  });
});
