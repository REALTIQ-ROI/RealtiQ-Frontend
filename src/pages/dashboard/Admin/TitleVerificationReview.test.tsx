import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Swal from 'sweetalert2';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { titleVerificationService } from '../../../services/titleVerificationService';
import type { TitleVerification, TitleVerificationStatus } from '../../../types';
import TitleVerificationReview from './TitleVerificationReview';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('sweetalert2', () => ({
  default: { fire: vi.fn() },
}));
vi.mock('../../../components/layout/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../components/title/RegistryAuditDetails', () => ({
  default: () => null,
}));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'admin-token' }),
}));
vi.mock('../../../services/documentService', () => ({
  documentService: { getDocument: vi.fn() },
}));
vi.mock('../../../services/titleVerificationService', () => ({
  titleVerificationService: {
    listTitleVerifications: vi.fn(),
    getTitleVerification: vi.fn(),
    reviewTitleVerification: vi.fn(),
    revokeTitleVerification: vi.fn(),
    requestRegistryExternalAnchor: vi.fn(),
  },
}));

const verification = (status: TitleVerificationStatus): TitleVerification => ({
  verificationId: 'verification-1',
  property: { _id: 'property-1', title: 'Lekki Home' },
  documentType: 'survey_plan',
  status,
  publicVerificationId: status === 'published' ? 'RTQ-TV-2026-000001' : null,
  submittedAt: '2026-07-24T08:00:00.000Z',
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

const renderReview = async (status: TitleVerificationStatus) => {
  const selected = verification(status);
  vi.mocked(titleVerificationService.listTitleVerifications).mockResolvedValue({ verifications: [selected] });
  vi.mocked(titleVerificationService.getTitleVerification).mockResolvedValue({ verification: selected, logs: [] });
  render(
    <MemoryRouter>
      <TitleVerificationReview />
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Lekki Home' });
  return selected;
};

describe('TitleVerificationReview action loading states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Swal.fire).mockResolvedValue({
      isConfirmed: true,
      isDenied: false,
      isDismissed: false,
      value: 'Reviewed by admin',
    });
  });

  it.each([
    ['Approve', 'Approving...', 'approve'],
    ['Reject', 'Rejecting...', 'reject'],
  ] as const)('shows a loading state while %s is being submitted', async (buttonName, loadingLabel, decision) => {
    const selected = await renderReview('pending');
    const request = deferred<{ verification: TitleVerification }>();
    vi.mocked(titleVerificationService.reviewTitleVerification).mockReturnValue(request.promise);

    fireEvent.click(screen.getByRole('button', { name: buttonName }));

    const loadingButton = await screen.findByRole('button', { name: loadingLabel });
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: decision === 'approve' ? 'Reject' : 'Approve' })).toBeDisabled();

    request.resolve({ verification: selected });
    await waitFor(() => expect(titleVerificationService.reviewTitleVerification).toHaveBeenCalledWith(
      selected.verificationId,
      expect.objectContaining({ decision }),
      'admin-token',
    ));
    await screen.findByRole('button', { name: buttonName });
  });

  it('shows a loading state while revocation is being submitted', async () => {
    const selected = await renderReview('published');
    const request = deferred<{ verification: TitleVerification }>();
    vi.mocked(titleVerificationService.revokeTitleVerification).mockReturnValue(request.promise);

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));

    const loadingButton = await screen.findByRole('button', { name: 'Revoking...' });
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Request External Anchor' })).toBeDisabled();

    request.resolve({ verification: selected });
    await screen.findByRole('button', { name: 'Revoke' });
  });

  it('shows a loading state while an external-anchor request is being submitted', async () => {
    await renderReview('published');
    const request = deferred<Awaited<ReturnType<typeof titleVerificationService.requestRegistryExternalAnchor>>>();
    vi.mocked(titleVerificationService.requestRegistryExternalAnchor).mockReturnValue(request.promise);

    fireEvent.click(screen.getByRole('button', { name: 'Request External Anchor' }));

    const loadingButton = await screen.findByRole('button', { name: 'Requesting...' });
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeDisabled();

    request.resolve({ record: {} } as Awaited<ReturnType<typeof titleVerificationService.requestRegistryExternalAnchor>>);
    await screen.findByRole('button', { name: 'Request External Anchor' });
  });
});
