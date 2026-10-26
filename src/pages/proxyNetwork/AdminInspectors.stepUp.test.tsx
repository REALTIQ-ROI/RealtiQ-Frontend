import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { proxyNetworkService } from '../../services/proxyNetworkService';
import { AdminInspectorDetailPage } from './AdminInspectors';

const stepUpMocks = vi.hoisted(() => ({
  action: null as unknown,
  begin: vi.fn(),
  complete: vi.fn(),
  reload: vi.fn(),
}));

vi.mock('../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../components/proxyNetwork/AdminKycMediaViewer', () => ({ default: () => null }));
vi.mock('../../features/proxyNetwork/useProxyResource', () => ({
  useProxyResource: () => ({
    data: {
      profile: {
        _id: 'profile-1',
        user: { _id: 'user-1', name: 'Ada Agent', email: 'ada@example.test', phone: '+2348000000000', kyc: {} },
        professionalType: 'property_inspector',
        verificationStatus: 'under_review',
        isSearchable: false,
        location: { city: 'Lagos', state: 'Lagos' },
      },
      jobCount: 0,
      disputeCount: 0,
      payoutAccount: null,
      reviews: [],
    },
    loading: false,
    status: 200,
    error: null,
    reload: stepUpMocks.reload,
  }),
}));
vi.mock('../../services/proxyNetworkService', () => ({
  proxyNetworkService: {
    getAdminInspector: vi.fn(),
    reviewInspector: vi.fn().mockResolvedValue({}),
    suspendInspector: vi.fn().mockResolvedValue({}),
    reactivateInspector: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock('../../hooks/useBoundStepUp', async () => {
  const React = await import('react');
  return {
    useBoundStepUp: () => {
      const [challenge, setChallenge] = React.useState<{ challengeId: string; expiresAt: string; method: 'totp'; label: string } | null>(null);
      const begin = async (action: unknown) => {
        stepUpMocks.action = action;
        setChallenge({ challengeId: 'challenge-1', expiresAt: '2099-01-01T00:00:00.000Z', method: 'totp', label: 'Protected test action' });
        return true;
      };
      const complete = async () => {
        const action = stepUpMocks.action as { body: object; execute: (challengeId: string, body: object) => Promise<unknown> } | null;
        if (!action) return { ok: false as const };
        const value = await action.execute('challenge-1', action.body);
        setChallenge(null);
        return { ok: true as const, value };
      };
      return {
        challenge,
        busy: false,
        error: null,
        begin,
        complete,
        cancel: vi.fn(),
        clearError: vi.fn(),
        getError: () => null,
      };
    },
  };
});
vi.mock('../../components/auth/StepUpDialog', () => ({
  default: ({ challenge, onSubmit }: { challenge: { challengeId: string } | null; onSubmit: (code: string) => Promise<boolean> }) => challenge
    ? <button type="button" onClick={() => void onSubmit('123456')}>Complete test challenge</button>
    : null,
}));

const renderDetail = () => render(
  <MemoryRouter initialEntries={['/admin/proxy-inspectors/profile-1']}>
    <Routes><Route path="/admin/proxy-inspectors/:profileId" element={<AdminInspectorDetailPage />} /></Routes>
  </MemoryRouter>,
);

describe('Property Agent staff decisions require exact bound step-up', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stepUpMocks.action = null;
  });

  it('binds approval to the documented review path and body, then sends the challenge', async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await user.type(screen.getByLabelText('Approval notes'), 'Credentials reviewed.');
    await user.click(screen.getByRole('button', { name: 'Approve Property Agent' }));

    expect(stepUpMocks.action).toMatchObject({
      method: 'PATCH',
      path: '/api/admin/proxy-inspectors/profile-1/review',
      body: { decision: 'approve', notes: 'Credentials reviewed.' },
    });

    await user.click(screen.getByRole('button', { name: 'Complete test challenge' }));
    await waitFor(() => expect(proxyNetworkService.reviewInspector).toHaveBeenCalledWith(
      'profile-1', 'challenge-1', { decision: 'approve', notes: 'Credentials reviewed.' },
    ));
    expect(stepUpMocks.reload).toHaveBeenCalled();
  });
});
