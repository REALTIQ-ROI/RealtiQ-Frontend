import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Swal from 'sweetalert2';
import { ApiRequestError } from '../../../lib/axios';
import { stepUpService } from '../../../services/stepUpService';
import { propertyService } from '../../../services/propertyService';
import PropertyApprovalReview from './PropertyApprovalReview';

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));
vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../components/property/PaymentTypeBadges', () => ({ default: () => null }));
vi.mock('../../../components/property/PropertyGallery', () => ({ default: () => null }));
vi.mock('../../../components/title/TitleVerificationBadge', () => ({ default: () => null }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: useAuthMock }));
vi.mock('../../../services/stepUpService', () => ({ stepUpService: { start: vi.fn(), verify: vi.fn() } }));
vi.mock('../../../services/propertyService', () => ({
  propertyService: {
    listPendingApprovalProperties: vi.fn(),
    getPropertyApprovalDetail: vi.fn(),
    updatePropertyApproval: vi.fn(),
  },
}));

const property = (approvalStatus: 'pending_review' | 'approved' | 'rejected' = 'pending_review') => ({
  _id: 'property-1',
  title: 'Review listing',
  price: 100,
  location: 'Lagos',
  propertyType: 'apartment',
  bedrooms: 2,
  bathrooms: 2,
  squareFeet: 1000,
  description: 'Listing description',
  paymentTypes: [],
  media: [],
  status: 'available',
  approvalStatus,
});

const queue = (items = [property()]) => ({ properties: items, total: items.length, page: 1, limit: 20 });
const detail = (item = property()) => ({ property: item, titleDocuments: [], titleDocumentStatus: 'not_submitted' });
const futureChallenge = (challengeId = 'challenge-1') => ({
  challengeId,
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  method: 'totp' as const,
});

const renderReview = async () => {
  vi.mocked(propertyService.listPendingApprovalProperties).mockResolvedValue(queue() as never);
  vi.mocked(propertyService.getPropertyApprovalDetail).mockResolvedValue(detail() as never);
  render(<MemoryRouter><PropertyApprovalReview /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Review listing' });
};

const confirmDecision = () => vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);

const submitTotp = async (code = '123456') => {
  const input = await screen.findByRole('textbox', { name: 'Six-digit authenticator code' });
  fireEvent.change(input, { target: { value: code } });
  const submit = screen.getByRole('button', { name: 'Verify and continue' });
  await waitFor(() => expect(submit).toBeEnabled());
  fireEvent.click(submit);
};

describe('admin listing approval bound step-up', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem('activeProfileId', 'admin-profile');
    useAuthMock.mockReturnValue({ token: 'admin-token', activeProfile: { id: 'admin-profile' } });
    vi.mocked(stepUpService.start).mockResolvedValue(futureChallenge());
    vi.mocked(stepUpService.verify).mockResolvedValue(undefined);
    vi.mocked(propertyService.updatePropertyApproval).mockResolvedValue({ property: property('approved') } as never);
  });

  it('confirms approval before creating a challenge and submits the exact bound body with its challenge', async () => {
    await renderReview();
    confirmDecision();

    fireEvent.click(screen.getByRole('button', { name: 'Approve Listing' }));
    await waitFor(() => expect(stepUpService.start).toHaveBeenCalledWith(
      'PATCH', '/api/properties/property-1/approval', { decision: 'approve' },
    ));
    expect(propertyService.updatePropertyApproval).not.toHaveBeenCalled();

    await submitTotp();
    await waitFor(() => expect(propertyService.updatePropertyApproval).toHaveBeenCalledWith(
      'property-1', { decision: 'approve' }, 'challenge-1',
    ));
    expect(stepUpService.verify).toHaveBeenCalledWith('challenge-1', '123456');
  });

  it('confirms the rejection reason first and binds only the documented rejection fields', async () => {
    const user = userEvent.setup();
    await renderReview();
    confirmDecision();

    await user.type(screen.getByLabelText('Rejection reason'), 'Missing ownership details.');
    fireEvent.click(screen.getByRole('button', { name: 'Reject Listing' }));
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Reject this listing?',
      text: expect.stringContaining('Reason: Missing ownership details.'),
    })));
    await waitFor(() => expect(stepUpService.start).toHaveBeenCalledWith(
      'PATCH', '/api/properties/property-1/approval', { decision: 'reject', rejectionReason: 'Missing ownership details.' },
    ));

    await submitTotp();
    await waitFor(() => expect(propertyService.updatePropertyApproval).toHaveBeenCalledWith(
      'property-1', { decision: 'reject', rejectionReason: 'Missing ownership details.' }, 'challenge-1',
    ));
  });

  it('keeps the confirmed decision intact after an invalid TOTP and permits another code attempt', async () => {
    await renderReview();
    confirmDecision();
    vi.mocked(stepUpService.verify).mockRejectedValueOnce(new ApiRequestError('Invalid code', { status: 403, code: 'AUTH_FACTOR_CODE_INVALID' }));

    fireEvent.click(screen.getByRole('button', { name: 'Approve Listing' }));
    await waitFor(() => expect(stepUpService.start).toHaveBeenCalledTimes(1));
    await submitTotp('111111');

    expect(await screen.findByText(/authenticator code was not accepted/i)).toBeInTheDocument();
    expect(propertyService.updatePropertyApproval).not.toHaveBeenCalled();
    expect(screen.getByText(/Confirmed decision: approve/)).toBeInTheDocument();

    await submitTotp('222222');
    await waitFor(() => expect(propertyService.updatePropertyApproval).toHaveBeenCalledWith(
      'property-1', { decision: 'approve' }, 'challenge-1',
    ));
    expect(stepUpService.start).toHaveBeenCalledTimes(1);
  });

  it('shows rate-limit guidance without submitting or discarding a still-live challenge', async () => {
    await renderReview();
    confirmDecision();
    vi.mocked(stepUpService.verify).mockRejectedValueOnce(new ApiRequestError('Rate limited', {
      status: 429,
      code: 'AUTH_FACTOR_RATE_LIMITED',
      retryAfter: '8',
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Approve Listing' }));
    await waitFor(() => expect(stepUpService.start).toHaveBeenCalledTimes(1));
    await submitTotp();

    expect(await screen.findByText(/Wait at least 8 seconds/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Six-digit authenticator code' })).toBeInTheDocument();
    expect(propertyService.updatePropertyApproval).not.toHaveBeenCalled();
    expect(stepUpService.start).toHaveBeenCalledTimes(1);
  });

  it('requires a fresh challenge when the protected PATCH rejects its challenge', async () => {
    await renderReview();
    confirmDecision();
    vi.mocked(propertyService.updatePropertyApproval).mockRejectedValueOnce(new ApiRequestError('Step-up required', {
      status: 403,
      code: 'AUTH_STEP_UP_REQUIRED',
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Approve Listing' }));
    await waitFor(() => expect(stepUpService.start).toHaveBeenCalledTimes(1));
    await submitTotp();

    expect(await screen.findByText(/does not match the current session or request/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Request a fresh authenticator challenge' })).toBeInTheDocument();
    expect(propertyService.updatePropertyApproval).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Request a fresh authenticator challenge' }));
    await waitFor(() => expect(stepUpService.start).toHaveBeenCalledTimes(2));
    expect(propertyService.updatePropertyApproval).toHaveBeenCalledTimes(1);
  });

  it('discards an invalid challenge and requires a new challenge before the PATCH', async () => {
    await renderReview();
    confirmDecision();
    vi.mocked(stepUpService.start).mockResolvedValueOnce(futureChallenge('stale-challenge')).mockResolvedValueOnce(futureChallenge('fresh-challenge'));
    vi.mocked(stepUpService.verify).mockRejectedValueOnce(new ApiRequestError('Challenge invalid', { status: 403, code: 'AUTH_CHALLENGE_INVALID' }));

    fireEvent.click(screen.getByRole('button', { name: 'Approve Listing' }));
    await waitFor(() => expect(stepUpService.start).toHaveBeenCalledTimes(1));
    await submitTotp();
    expect(propertyService.updatePropertyApproval).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole('button', { name: 'Request a fresh authenticator challenge' }));
    await waitFor(() => expect(stepUpService.start).toHaveBeenCalledTimes(2));
    await submitTotp();
    await waitFor(() => expect(propertyService.updatePropertyApproval).toHaveBeenCalledWith(
      'property-1', { decision: 'approve' }, 'fresh-challenge',
    ));
    expect(stepUpService.verify).toHaveBeenNthCalledWith(2, 'fresh-challenge', '123456');
  });

  it('does not verify an expired challenge and permits a new challenge for the confirmed action', async () => {
    await renderReview();
    confirmDecision();
    vi.mocked(stepUpService.start)
      .mockResolvedValueOnce({ challengeId: 'expired-challenge', expiresAt: new Date(Date.now() - 1000).toISOString(), method: 'totp' })
      .mockResolvedValueOnce(futureChallenge('new-challenge'));

    fireEvent.click(screen.getByRole('button', { name: 'Approve Listing' }));
    expect(await screen.findByText(/server returned an expired challenge/i)).toBeInTheDocument();
    expect(stepUpService.verify).not.toHaveBeenCalled();
    expect(propertyService.updatePropertyApproval).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Request a fresh authenticator challenge' }));
    await waitFor(() => expect(stepUpService.start).toHaveBeenCalledTimes(2));
    await submitTotp();
    await waitFor(() => expect(propertyService.updatePropertyApproval).toHaveBeenCalledWith(
      'property-1', { decision: 'approve' }, 'new-challenge',
    ));
  });

  it('guides an admin with AUTH_FACTOR_REQUIRED to the existing authenticator enrollment flow', async () => {
    await renderReview();
    confirmDecision();
    vi.mocked(stepUpService.start).mockRejectedValueOnce(new ApiRequestError('Factor required', { status: 403, code: 'AUTH_FACTOR_REQUIRED' }));

    fireEvent.click(screen.getByRole('button', { name: 'Approve Listing' }));

    const setupLink = await screen.findByRole('link', { name: 'Set up an authenticator in Account Security' });
    expect(setupLink).toHaveAttribute('href', '/dashboard/admin/settings#authenticator-enrollment');
    expect(setupLink).toHaveAttribute('target', '_blank');
    expect(propertyService.updatePropertyApproval).not.toHaveBeenCalled();
  });

  it('refreshes approval state after an ambiguous PATCH failure before allowing a fresh challenge', async () => {
    const requestOrder: string[] = [];
    await renderReview();
    confirmDecision();
    requestOrder.length = 0;
    vi.mocked(propertyService.updatePropertyApproval).mockImplementation(async () => {
      requestOrder.push('patch');
      throw new ApiRequestError('Unable to confirm the response.');
    });
    vi.mocked(propertyService.getPropertyApprovalDetail).mockImplementation(async () => {
      requestOrder.push('detail');
      return detail() as never;
    });
    vi.mocked(propertyService.listPendingApprovalProperties).mockImplementation(async () => {
      requestOrder.push('queue');
      return queue() as never;
    });

    fireEvent.click(screen.getByRole('button', { name: 'Approve Listing' }));
    await waitFor(() => expect(stepUpService.start).toHaveBeenCalledTimes(1));
    await submitTotp();

    await screen.findByRole('button', { name: 'Request a fresh authenticator challenge' });
    const patchIndex = requestOrder.indexOf('patch');
    expect(requestOrder.slice(patchIndex)).toEqual(['patch', 'detail', 'queue']);
    expect(propertyService.updatePropertyApproval).toHaveBeenCalledTimes(1);
  });
});
