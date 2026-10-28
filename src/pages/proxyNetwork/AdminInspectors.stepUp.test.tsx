import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proxyNetworkService } from '../../services/proxyNetworkService';
import { AdminInspectorDetailPage } from './AdminInspectors';

const stepUpMocks = vi.hoisted(() => ({
  action: null as unknown,
  begin: vi.fn(),
  complete: vi.fn(),
  reload: vi.fn(),
}));

vi.mock('../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../components/proxyNetwork/AdminKycMediaViewer', () => ({
  default: ({ title, url, onClose }: { title: string; url: string; onClose: () => void }) => <div data-testid="private-preview"><span>{title}</span><span>{url}</span><button type="button" onClick={onClose}>Close secure preview</button></div>,
}));
vi.mock('../../services/proxyNetworkService', () => ({
  proxyNetworkService: {
    getAdminInspector: vi.fn(),
    fetchAdminInspectorDocument: vi.fn(),
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

const detailResponse = {
  profile: {
    _id: 'profile-1',
    id: 'profile-1',
    name: 'Ada Agent',
    professionalType: 'structural_engineer',
    professionalTitle: 'Registered Engineer',
    bio: 'Residential inspection specialist',
    yearsOfExperience: 12,
    specialties: ['Structural review'],
    serviceAreas: ['Lagos'],
    location: { country: 'Nigeria', state: 'Lagos', city: 'Ikeja', coordinates: { lat: 6.6, lng: 3.35 } },
    availabilityStatus: 'available',
    verificationStatus: 'approved',
    isSearchable: true,
    ratingAverage: 4.8,
    ratingCount: 12,
    completedJobs: 8,
    responseRate: 94,
    profileImageUrl: 'https://public.invalid/consented.jpg',
    submittedAt: '2026-10-27T12:00:00.000Z',
    reviewedAt: '2026-10-27T12:00:00.000Z',
    createdAt: '2026-10-27T12:00:00.000Z',
    updatedAt: '2026-10-27T12:00:00.000Z',
    approvedAt: '2026-10-27T12:00:00.000Z',
    suspendedAt: null,
    user: {
      _id: 'user-1',
      name: 'Ada Agent',
      email: 'ada@example.test',
      phone: '+2348000000000',
      role: 'landlord',
      accountStatus: 'active',
      emailVerified: true,
      phoneVerified: true,
      createdAt: '2026-10-27T12:00:00.000Z',
      updatedAt: '2026-10-27T12:00:00.000Z',
      kyc: {
        status: 'under_review',
        route: 'nigerian',
        fullLegalName: 'Adaeze Nwosu',
        address: '12 Example Road, Lagos',
        phone: '+2348000000000',
        nationalId: '123456789012',
        submittedAt: '2026-10-27T12:00:00.000Z',
        reviewedAt: null,
        minimumVerifiedAt: null,
        evidence: [{ kind: 'nin', status: 'pending', checkedAt: '2026-10-27T12:00:00.000Z', expiresAt: null, policyVersion: 'v1' }],
        privateDocuments: {
          idDocument: { submitted: true, contentAccess: { status: 'withheld', reasonCode: 'KYC_FILE_NOT_LINKED_TO_PROTECTED_STORAGE' } },
          selfie: { submitted: true, contentAccess: { status: 'withheld', reasonCode: 'KYC_FILE_NOT_LINKED_TO_PROTECTED_STORAGE' } },
        },
        professionalDocuments: [
          { index: 0, label: 'Professional licence', mimeType: 'application/pdf', verificationStatus: 'unverified', contentAccess: { status: 'withheld', reasonCode: 'KYC_FILE_NOT_LINKED_TO_PROTECTED_STORAGE' } },
          { index: 1, label: 'Professional credential', mimeType: 'application/pdf', verificationStatus: 'verified', contentAccess: { status: 'protected_route', method: 'GET', path: '/api/documents/private-migrations/legacy-files/660000000000000000000008/content' } },
        ],
        documentAccessNotice: 'Document bytes and provider URLs are not included. Use contentAccess.path only when status is protected_route.',
      },
    },
  },
  jobCount: 9,
  disputeCount: 2,
  payoutAccount: {
    _id: 'payout-1', user: 'user-1', profile: 'user-1', maskedAccountNumber: '****1234', bankName: 'Example Bank', verifiedAccountName: 'Ada Agent', verifiedAt: '2026-10-27T12:00:00.000Z', createdAt: '2026-10-27T12:00:00.000Z', updatedAt: '2026-10-27T12:00:00.000Z',
  },
  payoutSummary: { currency: 'NGN', released: { count: 3, amount: 45000 }, pending: { count: 1, amount: 15000 } },
  reviews: [{ id: 'review-1', rating: 5 }],
};

const renderDetail = (path = '/admin/proxy-inspectors/profile-1') => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/admin/proxy-inspectors/:profileId" element={<AdminInspectorDetailPage />} /></Routes>
  </MemoryRouter>,
);

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

describe('admin Property Agent detail projection and protected decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stepUpMocks.action = null;
    vi.mocked(proxyNetworkService.getAdminInspector).mockResolvedValue(detailResponse as never);
  });

  afterEach(() => {
    if (originalCreateObjectURL) Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
    else Reflect.deleteProperty(URL, 'createObjectURL');
    if (originalRevokeObjectURL) Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
    else Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('loads the populated admin detail using the Property Agent profile ID and renders account, profile, KYC, payout and review fields', async () => {
    renderDetail();

    await screen.findByText('Email: ada@example.test · Phone: +2348000000000');
    expect(proxyNetworkService.getAdminInspector).toHaveBeenCalledWith('profile-1', expect.any(AbortSignal));
    expect(screen.getByText('Adaeze Nwosu')).toBeInTheDocument();
    expect(screen.getByText('12 Example Road, Lagos')).toBeInTheDocument();
    expect(screen.getByText('Registered Engineer')).toBeInTheDocument();
    expect(screen.getByText('Residential inspection specialist')).toBeInTheDocument();
    expect(screen.getByText('Ikeja, Lagos, Nigeria')).toBeInTheDocument();
    expect(screen.getByText(/4\.8 \(12 ratings\)/)).toBeInTheDocument();
    expect(screen.getByText(/45,000/)).toBeInTheDocument();
    expect(screen.getByText('****1234')).toBeInTheDocument();
    expect(screen.getByText('Review review-1')).toBeInTheDocument();
    expect(screen.getByText('••••9012')).toBeInTheDocument();
    expect(screen.queryByText('123456789012')).not.toBeInTheDocument();
  });

  it('allows an authorized reviewer to reveal the national ID only in the current page session', async () => {
    const user = userEvent.setup();
    renderDetail();
    await screen.findByText('Email: ada@example.test · Phone: +2348000000000');
    await user.click(screen.getByRole('button', { name: 'Reveal ID' }));
    expect(screen.getByText('123456789012')).toBeInTheDocument();
  });

  it('fetches only explicitly protected document routes through the authenticated service and revokes the temporary URL', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:private-credential');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    vi.mocked(proxyNetworkService.fetchAdminInspectorDocument).mockResolvedValue({ blob: new Blob(['pdf']), contentType: 'application/pdf' });
    renderDetail();
    await screen.findByText('Email: ada@example.test · Phone: +2348000000000');

    expect(screen.getAllByText(/File access is withheld/)).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'View protected file' }));
    await screen.findByTestId('private-preview');
    expect(proxyNetworkService.fetchAdminInspectorDocument).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'protected_route', method: 'GET', path: '/api/documents/private-migrations/legacy-files/660000000000000000000008/content' }),
      expect.any(AbortSignal),
    );
    expect(createObjectURL).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Close secure preview' }));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:private-credential');
  });

  it('binds approval to the documented review path and body, then sends the challenge', async () => {
    const user = userEvent.setup();
    vi.mocked(proxyNetworkService.getAdminInspector).mockResolvedValueOnce({
      ...detailResponse,
      profile: { ...detailResponse.profile, verificationStatus: 'under_review' },
    } as never);
    renderDetail();
    await screen.findByText('Email: ada@example.test · Phone: +2348000000000');
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
    await waitFor(() => expect(proxyNetworkService.getAdminInspector).toHaveBeenCalledTimes(2));
  });

  it('shows a recoverable invalid-link state and never requests details for an undefined profile ID', () => {
    renderDetail('/admin/proxy-inspectors/undefined');
    expect(screen.getByText(/does not contain a valid profile ID/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to review queue' })).toHaveAttribute('href', '/admin/proxy-inspectors');
    expect(proxyNetworkService.getAdminInspector).not.toHaveBeenCalled();
  });
});
