import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../../lib/axios';
import LandlordVerification from './LandlordVerification';

const mocks = vi.hoisted(() => ({
  profileId: 'profile-1',
  current: vi.fn(),
  onboarding: vi.fn(),
  evidence: vi.fn(),
  cases: vi.fn(),
  contract: vi.fn(),
}));

vi.mock('../../../services/profileService', () => ({ profileService: {
  current: mocks.current,
  getOnboarding: mocks.onboarding,
} }));

vi.mock('../../../services/verificationCaseService', () => ({ verificationCaseService: {
  listEvidence: mocks.evidence,
  listHolderCases: mocks.cases,
  getEvidenceContract: mocks.contract,
  getEvidence: vi.fn(),
  getEvidenceContent: vi.fn(),
  retryEvidence: vi.fn(),
  deleteEvidence: vi.fn(),
  getHolderCase: vi.fn(),
  holderHistory: vi.fn(),
  createHolderCase: vi.fn(),
  withdrawCase: vi.fn(),
} }));

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ activeProfile: { id: mocks.profileId }, token: 'session-1' }) }));
vi.mock('../../../components/layout/LandlordPortalLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('../../../components/auth/StepUpDialog', () => ({ default: () => null }));

const profile = {
  id: 'profile-1', kind: 'owner', structure: 'individual', name: 'Example Landlord', status: 'active',
  verification: { status: 'not_submitted' }, version: 1, permissions: {},
};

const draft = {
  profileId: 'profile-1', kind: 'owner', structure: 'individual', version: 1, state: 'draft' as const,
  values: {}, readiness: {}, fields: [], updatedAt: '2026-10-01T00:00:00.000Z',
};

const contract = {
  version: 1, formats: ['application/pdf'], purposes: ['nin'], documentKinds: {}, maxBytes: 1000000,
  policies: { upload: { state: 'configured' }, acceptedIdentity: { state: 'configured' } },
  acceptedInternationalIds: [], individualRoutes: {}, serviceAreaSource: { state: 'configured' },
  subjects: { fixed: ['self'], personFields: [] },
};

describe('landlord profile verification loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profileId = 'profile-1';
    localStorage.setItem('activeProfileId', 'profile-1');
    localStorage.setItem('token', 'session-1');
    mocks.current.mockResolvedValue({ profile });
    mocks.onboarding.mockResolvedValue(draft);
    mocks.evidence.mockResolvedValue({ evidence: [], nextCursor: null });
    mocks.cases.mockResolvedValue({ cases: [], nextCursor: null });
    mocks.contract.mockResolvedValue(contract);
  });

  it('keeps the page usable when one read request times out and retries that section independently', async () => {
    mocks.evidence
      .mockRejectedValueOnce(new ApiRequestError('The request timed out. Check the latest server status before retrying; the request may have been processed.'))
      .mockResolvedValueOnce({ evidence: [], nextCursor: null });

    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Example Landlord' })).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Private evidence did not load before the request timed out/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/read-only request; no KYC submission or change was made/i);
    expect(screen.getByText('No verification cases returned for this profile.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry evidence' }));
    await waitFor(() => expect(mocks.evidence).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('No evidence records returned for this profile.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Example Landlord' })).toBeInTheDocument();
  });

  it('ignores a late profile response after the active profile changes', async () => {
    let resolveFirstProfile: ((value: { profile: typeof profile }) => void) | undefined;
    mocks.current.mockImplementation((requestedId: string) => requestedId === 'profile-1'
      ? new Promise<{ profile: typeof profile }>((resolve) => { resolveFirstProfile = resolve; })
      : Promise.resolve({ profile: { ...profile, id: 'profile-2', name: 'Second Landlord' } }));

    const view = render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    await waitFor(() => expect(mocks.current).toHaveBeenCalledWith('profile-1'));

    mocks.profileId = 'profile-2';
    localStorage.setItem('activeProfileId', 'profile-2');
    view.rerender(<MemoryRouter><LandlordVerification /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Second Landlord' })).toBeInTheDocument();
    resolveFirstProfile?.({ profile });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Example Landlord' })).not.toBeInTheDocument());
  });
});
