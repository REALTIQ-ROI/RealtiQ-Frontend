import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePaymentPage } from './usePaymentPage';
import { paymentService } from '../services/paymentService';

const auth = vi.hoisted(() => ({ profileId: 'profile-a' }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ activeProfile: { id: auth.profileId }, token: 'session' }) }));
vi.mock('../services/paymentService', () => ({ paymentService: { getPaymentsPage: vi.fn() } }));

describe('usePaymentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.profileId = 'profile-a';
    localStorage.setItem('activeProfileId', auth.profileId);
  });

  it('requests bounded server pages and uses the returned count to navigate', async () => {
    vi.mocked(paymentService.getPaymentsPage).mockImplementation(async (page, limit) => ({
      payments: [], page: page ?? 1, limit: limit ?? 20, total: 25,
    }));
    const { result } = renderHook(() => usePaymentPage());
    await waitFor(() => expect(result.current.data?.page).toBe(1));
    expect(paymentService.getPaymentsPage).toHaveBeenCalledWith(1, 20);
    act(() => result.current.setPage(2));
    await waitFor(() => expect(result.current.data?.page).toBe(2));
    expect(paymentService.getPaymentsPage).toHaveBeenCalledWith(2, 20);
  });

  it('discards an old profile response after profile selection changes', async () => {
    let resolveOld!: (value: Awaited<ReturnType<typeof paymentService.getPaymentsPage>>) => void;
    vi.mocked(paymentService.getPaymentsPage)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ payments: [], page: 1, limit: 20, total: 0 });
    const { result, rerender } = renderHook(() => usePaymentPage());
    await waitFor(() => expect(paymentService.getPaymentsPage).toHaveBeenCalledTimes(1));
    auth.profileId = 'profile-b';
    localStorage.setItem('activeProfileId', 'profile-b');
    rerender();
    await waitFor(() => expect(result.current.data?.total).toBe(0));
    await act(async () => resolveOld({ payments: [{ _id: 'stale' }] as never, page: 1, limit: 20, total: 1 }));
    expect(result.current.data?.payments).toEqual([]);
  });
});
