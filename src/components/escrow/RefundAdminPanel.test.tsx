import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RefundAdminPanel from './RefundAdminPanel';
import type { Escrow } from '../../types/escrow';

const stepUpMocks = vi.hoisted(() => ({ begin: vi.fn(), cancel: vi.fn(), complete: vi.fn(), getError: vi.fn() }));
vi.mock('../../hooks/useBoundStepUp', () => ({ useBoundStepUp: () => ({ ...stepUpMocks, challenge: null, busy: false, error: null }) }));
vi.mock('sweetalert2', () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) } }));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));
vi.mock('../../services/escrowService', () => ({ escrowService: { processRefund: vi.fn() }, escrowErrorDetails: (error: unknown) => ({ message: String(error), status: undefined, requiresAccountDetails: false }) }));

const escrow = {
  _id: 'escrow-1',
  amount: 250_000,
  status: 'refund_failed',
  refundStatus: 'failed',
  currency: 'NGN',
} as Escrow;

describe('RefundAdminPanel security binding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stepUpMocks.begin.mockResolvedValue(true);
  });

  it('starts a one-use challenge for the exact empty-body refund recovery request', async () => {
    render(<RefundAdminPanel escrow={escrow} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry refund' }));

    await waitFor(() => expect(stepUpMocks.begin).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      path: '/api/admin/escrows/escrow-1/process-refund',
      body: {},
    })));
  });
});
