import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Swal from 'sweetalert2';
import { stepUpService } from '../../../services/stepUpService';
import { titleVerificationService } from '../../../services/titleVerificationService';
import type { TitleVerification, TitleVerificationStatus } from '../../../types';
import TitleVerificationReview from './TitleVerificationReview';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../components/title/RegistryAuditDetails', () => ({ default: () => null }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ token: 'admin-token', activeProfile: { id: 'admin-profile' } }) }));
vi.mock('../../../services/stepUpService', () => ({ stepUpService: { start: vi.fn(), verify: vi.fn() } }));
vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));
vi.mock('../../../services/documentService', () => ({ documentService: { getDocument: vi.fn() } }));
vi.mock('../../../services/titleVerificationService', () => ({
  titleVerificationService: {
    listTitleVerifications: vi.fn(), getTitleVerification: vi.fn(),
    reviewTitleVerification: vi.fn(), revokeTitleVerification: vi.fn(), requestRegistryExternalAnchor: vi.fn(), retryTitleVerificationExternalAnchor: vi.fn(),
  },
}));

const verification = (status: TitleVerificationStatus, externalAnchorStatus?: TitleVerification['externalAnchorStatus']): TitleVerification => ({
  verificationId: 'verification-1',
  property: { _id: 'property-1', title: 'Lekki Home' },
  documentType: 'survey_plan',
  status,
  publicVerificationId: status === 'published' ? 'RTQ-TV-2026-000001' : null,
  externalAnchorStatus,
  submittedAt: '2026-07-24T08:00:00.000Z',
});

const renderReview = async (status: TitleVerificationStatus, externalAnchorStatus?: TitleVerification['externalAnchorStatus']) => {
  const selected = verification(status, externalAnchorStatus);
  vi.mocked(titleVerificationService.listTitleVerifications).mockResolvedValue({ verifications: [selected] });
  vi.mocked(titleVerificationService.getTitleVerification).mockResolvedValue({ verification: selected, logs: [] });
  render(<MemoryRouter><TitleVerificationReview /></MemoryRouter>);
  const [row] = await screen.findAllByRole('button', { name: /Lekki Home/ });
  fireEvent.click(row);
  await screen.findByRole('heading', { name: 'Lekki Home' });
};

describe('title verification step-up boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem('activeProfileId', 'admin-profile');
    vi.mocked(stepUpService.start).mockResolvedValue({
      challengeId: 'challenge-title', expiresAt: new Date(Date.now() + 60_000).toISOString(), method: 'totp',
    });
    vi.mocked(stepUpService.verify).mockResolvedValue(undefined);
  });

  it('starts bound TOTP before submitting an approval', async () => {
    await renderReview('pending');
    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true, value: 'Reviewed.' } as never);

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(stepUpService.start).toHaveBeenCalledWith(
      'PATCH', '/api/title-verifications/verification-1/review', { decision: 'approve', reviewNotes: 'Reviewed.' },
    ));
    fireEvent.change(screen.getByLabelText('Six-digit authenticator code'), { target: { value: '123456' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Verify and continue' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));

    await waitFor(() => expect(titleVerificationService.reviewTitleVerification).toHaveBeenCalledWith(
      'verification-1', { decision: 'approve', reviewNotes: 'Reviewed.' }, 'admin-token', 'challenge-title',
    ));
    expect(stepUpService.verify).toHaveBeenCalledWith('challenge-title', '123456');
  });

  it('starts bound TOTP before requesting an external registry anchor', async () => {
    const selected = verification('published', 'not_requested');
    vi.mocked(titleVerificationService.listTitleVerifications).mockResolvedValue({ verifications: [selected] });
    vi.mocked(titleVerificationService.getTitleVerification).mockResolvedValue({ verification: selected, logs: [] });
    vi.mocked(titleVerificationService.requestRegistryExternalAnchor).mockResolvedValue({ record: { publicVerificationId: 'RTQ-TV-2026-000001', registryStatus: 'active' } });
    render(<MemoryRouter><TitleVerificationReview /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Lekki Home' });

    fireEvent.click(screen.getByRole('button', { name: 'Request External Anchor' }));
    await waitFor(() => expect(stepUpService.start).toHaveBeenCalledWith(
      'POST', '/api/title-registry/RTQ-TV-2026-000001/request-external-anchor', {},
    ));
    fireEvent.change(screen.getByLabelText('Six-digit authenticator code'), { target: { value: '123456' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Verify and continue' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));

    await waitFor(() => expect(titleVerificationService.requestRegistryExternalAnchor).toHaveBeenCalledWith(
      'RTQ-TV-2026-000001', 'challenge-title',
    ));
  });

  it('offers a step-up retry only when the server reports a failed anchor', async () => {
    await renderReview('published', 'failed');
    expect(screen.getByRole('button', { name: 'Retry External Anchor' })).toBeEnabled();
    expect(titleVerificationService.retryTitleVerificationExternalAnchor).not.toHaveBeenCalled();
  });

  it('does not submit a decision merely by opening the review screen', async () => {
    await renderReview('pending');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
    expect(titleVerificationService.reviewTitleVerification).not.toHaveBeenCalled();
  });

  it('shows revocation and external-anchor request only for a published record', async () => {
    await renderReview('published');
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Request External Anchor' })).toBeEnabled();
    expect(titleVerificationService.revokeTitleVerification).not.toHaveBeenCalled();
    expect(titleVerificationService.requestRegistryExternalAnchor).not.toHaveBeenCalled();
  });
});
