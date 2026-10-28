import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { ApiRequestError } from '../../lib/axios';
import type { ProxyInspectionDetail } from '../../types/proxyNetwork';
import { proxyNetworkService } from '../../services/proxyNetworkService';
import ProxyWorkspace from './ProxyWorkspace';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'buyer-1', role: 'buyer', name: 'Buyer' }, activeProfile: { id: 'buyer-profile-1' }, token: 'test-token' }),
}));

vi.mock('../../services/stepUpService', () => ({
  stepUpService: { start: vi.fn(), verify: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('../../services/proxyNetworkService', () => ({
  proxyNetworkService: {
    sendMessage: vi.fn(),
    getEvidence: vi.fn(),
    uploadEvidence: vi.fn(),
    saveReport: vi.fn(),
    proposePrice: vi.fn(),
    confirmPrice: vi.fn(),
    initializePayment: vi.fn(),
    verifyPayment: vi.fn(),
    schedule: vi.fn(),
    start: vi.fn(),
    submitCompletion: vi.fn(),
    confirmCompletion: vi.fn(),
    dispute: vi.fn(),
    review: vi.fn(),
    releasePayment: vi.fn(),
    resolveDispute: vi.fn(),
  },
}));

import { stepUpService } from '../../services/stepUpService';

const detail = (overrides: Partial<ProxyInspectionDetail> = {}): ProxyInspectionDetail => ({
  request: {
    _id: 'request-1',
    property: { _id: 'property-1', title: 'Lekki duplex', publicReference: 'RTQ-1' },
    buyer: { _id: 'buyer-1', name: 'Buyer', role: 'buyer' },
    inspector: { _id: 'agent-1', name: 'Ada Okafor', role: 'proxy_inspector' },
    inspectorProfile: 'profile-1',
    requestedServices: ['photos'],
    status: 'awaiting_payment',
    proposedPrice: 40_000,
    agreedPrice: 40_000,
    buyerPriceConfirmed: true,
    inspectorPriceConfirmed: true,
    priceLockedAt: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  pricing: {
    agreedPrice: 40_000,
    buyerFeePercentage: 10,
    buyerFeeAmount: 4_000,
    buyerTotalAmount: 44_000,
    inspectorCommissionPercentage: 10,
    inspectorCommissionAmount: 4_000,
    inspectorPayoutAmount: 36_000,
    totalPlatformRevenue: 8_000,
  },
  serviceEscrow: null,
  report: null,
  evidence: [],
  dispute: null,
  ...overrides,
});

describe('ProxyWorkspace pricing display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('activeProfileId', 'buyer-profile-1');
    vi.mocked(stepUpService.start).mockResolvedValue({
      challengeId: 'challenge-1',
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      method: 'totp',
    });
    vi.mocked(stepUpService.verify).mockResolvedValue(undefined);
  });

  it('shows buyer fee and total payable from backend pricing', () => {
    render(
      <MemoryRouter>
        <ProxyWorkspace detail={detail()} requestId="request-1" role="buyer" reload={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('₦40,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₦4,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₦44,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/not a confirmation that an approved, versioned partner-fee policy/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/The approved, versioned partner-fee policy and provider activation are not confirmed/i)).toBeInTheDocument();
  });

  it('shows inspector commission and payout from backend pricing', () => {
    render(
      <MemoryRouter>
        <ProxyWorkspace detail={detail({ request: { ...detail().request, status: 'awaiting_price_confirmation' } })} requestId="request-1" role="proxy_inspector" reload={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('₦36,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/These amounts are returned by the backend/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/approved, versioned partner-fee policy or provider activation/i).length).toBeGreaterThan(0);
  });

  it('renders private evidence using the documented id and metadata fields', () => {
    render(
      <MemoryRouter>
        <ProxyWorkspace
          detail={detail({ evidence: [{
            id: 'evidence-1', type: 'image', category: 'inspection_photo', mimeType: 'image/jpeg',
            fileSize: 1024, caption: 'Front elevation', uploadedAt: '2026-08-01T00:00:00.000Z',
            accessUrl: 'https://private.example/signed-evidence',
          }] })}
          requestId="request-1"
          role="buyer"
          reload={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByAltText('Front elevation')).toHaveAttribute('src', 'https://private.example/signed-evidence');
  });

  it('binds checkout to TOTP and redirects only after the user reviews server pricing', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    vi.mocked(proxyNetworkService.initializePayment).mockResolvedValue({
      reference: 'pay-ref-1',
      redirectUrl: 'https://pay.example/checkout',
      pricing: {
        agreedPrice: 40_000,
        buyerFeePercentage: 10,
        buyerFeeAmount: 4_000,
        buyerTotalAmount: 44_000,
      },
    });

    render(
      <MemoryRouter>
        <ProxyWorkspace detail={detail()} requestId="request-1" role="buyer" reload={reload} />
      </MemoryRouter>,
    );

    expect(proxyNetworkService.initializePayment).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Pay Now' }));

    expect(stepUpService.start).toHaveBeenCalledWith('POST', '/api/proxy-inspections/request-1/initialize-payment', {});
    await user.type(screen.getByLabelText('Six-digit authenticator code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }));

    expect(proxyNetworkService.initializePayment).toHaveBeenCalledTimes(1);
    expect(proxyNetworkService.initializePayment).toHaveBeenCalledWith('request-1', 'challenge-1', {});
    expect(reload).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('realtiq.proxyPaymentContext')).toBe(JSON.stringify({ reference: 'pay-ref-1', requestId: 'request-1' }));
    await user.click(screen.getByRole('button', { name: /Continue to provider checkout/ }));
    expect(assign).toHaveBeenCalledWith('https://pay.example/checkout');
  });

  it('continues an existing pending initialization without issuing another request', async () => {
    const user = userEvent.setup();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    vi.mocked(proxyNetworkService.initializePayment).mockResolvedValue({
      reference: 'pay-ref-pending',
      redirectUrl: 'https://pay.example/pending-checkout',
      pending: true,
      message: 'A payment initialization already exists; continue with the returned redirectUrl.',
      pricing: {
        agreedPrice: 40_000,
        buyerFeePercentage: 10,
        buyerFeeAmount: 4_000,
        buyerTotalAmount: 44_000,
      },
    });

    render(
      <MemoryRouter>
        <ProxyWorkspace detail={detail()} requestId="request-1" role="buyer" reload={vi.fn()} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Pay Now' }));
    await user.type(screen.getByLabelText('Six-digit authenticator code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }));

    expect(proxyNetworkService.initializePayment).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('realtiq.proxyPaymentContext')).toBe(JSON.stringify({ reference: 'pay-ref-pending', requestId: 'request-1' }));
    await user.click(screen.getByRole('button', { name: /Continue to provider checkout/ }));
    expect(assign).toHaveBeenCalledWith('https://pay.example/pending-checkout');
  });

  it('preserves a checkout reference without a redirect and offers status verification instead of retry', async () => {
    const user = userEvent.setup();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    vi.mocked(proxyNetworkService.initializePayment).mockResolvedValue({
      reference: 'pay-ref-no-link',
      message: 'Checkout link is unavailable. Try again later.',
    });
    vi.mocked(proxyNetworkService.verifyPayment).mockResolvedValue({
      verified: false,
    });

    render(
      <MemoryRouter>
        <ProxyWorkspace detail={detail()} requestId="request-1" role="buyer" reload={vi.fn()} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Pay Now' }));
    await user.type(screen.getByLabelText('Six-digit authenticator code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }));

    expect(assign).not.toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent('Checkout link is unavailable. Try again later.');
    expect(screen.getByText('Payment reference: pay-ref-no-link')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry initialization/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check payment status' }));
    expect(proxyNetworkService.verifyPayment).toHaveBeenCalledWith('pay-ref-no-link');
    expect(await screen.findByText(/No new checkout was started/i)).toBeInTheDocument();
  });

  it('refreshes and preserves the current price after the server rejects a stale proposal', async () => {
    const user = userEvent.setup();
    const reload = vi.fn().mockResolvedValue(undefined);
    vi.mocked(proxyNetworkService.proposePrice).mockRejectedValue(
      new ApiRequestError('The proposed price changed. Review the current request.', { status: 409, code: 'CONFLICT' }),
    );
    render(<MemoryRouter><ProxyWorkspace detail={detail({ request: { ...detail().request, status: 'awaiting_price_confirmation', priceLockedAt: undefined } })} requestId="request-1" role="buyer" reload={reload} /></MemoryRouter>);

    await user.type(screen.getByLabelText('Whole NGN amount'), '55000');
    await user.click(screen.getByRole('button', { name: 'Propose' }));

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(proxyNetworkService.proposePrice).toHaveBeenCalledWith('request-1', 55000);
    expect(toast.error).toHaveBeenCalledWith('The proposed price changed. Review the current request.');
    expect(toast.success).not.toHaveBeenCalledWith('New price proposed; both confirmations were reset.');
  });

  it('submits the Property Agent appointment and refreshes the server-scheduled time', async () => {
    const user = userEvent.setup();
    const reload = vi.fn().mockResolvedValue(undefined);
    const futureLocalDate = new Date(Date.now() + 60 * 60 * 1000);
    const localTime = new Date(
      futureLocalDate.getTime() - futureLocalDate.getTimezoneOffset() * 60_000,
    ).toISOString().slice(0, 16);
    vi.mocked(proxyNetworkService.schedule).mockResolvedValue({ scheduledAt: '2026-10-27T10:00:00.000Z' } as never);
    render(<MemoryRouter><ProxyWorkspace detail={detail({ request: { ...detail().request, inspector: { _id: 'buyer-1', name: 'Ada', role: 'proxy_inspector' }, status: 'funded' } })} requestId="request-1" role="proxy_inspector" reload={reload} /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/Confirm or update inspection appointment/), { target: { value: localTime } });
    await user.click(screen.getByRole('button', { name: 'Confirm appointment' }));

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(proxyNetworkService.schedule).toHaveBeenCalledWith('request-1', new Date(localTime).toISOString());
    expect(toast.success).toHaveBeenCalledWith('Schedule updated.');
  });

  it('starts only through the confirmed action and reloads the server in-progress state', async () => {
    const user = userEvent.setup();
    const reload = vi.fn().mockResolvedValue(undefined);
    vi.mocked(proxyNetworkService.start).mockResolvedValue({ _id: 'request-1', status: 'in_progress' } as never);
    render(<MemoryRouter><ProxyWorkspace detail={detail({ request: { ...detail().request, inspector: { _id: 'buyer-1', name: 'Ada', role: 'proxy_inspector' }, status: 'scheduled' } })} requestId="request-1" role="proxy_inspector" reload={reload} /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: 'Start inspection' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Start inspection' }));

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(proxyNetworkService.start).toHaveBeenCalledWith('request-1');
    expect(toast.success).toHaveBeenCalledWith('Inspection started.');
  });

  it('saves the report before completion and displays authoritative 422 missing fields', async () => {
    const user = userEvent.setup();
    const reload = vi.fn().mockResolvedValue(undefined);
    const reportDraft = {
      declarationAccepted: true,
      signedByName: 'Ada Okafor',
      sections: [{ key: 'structure', title: 'Structure', condition: 'good', comments: '' }],
      summary: 'No material defects observed.',
    };
    localStorage.setItem('realtiq.proxyReportDraft.request-1', JSON.stringify(reportDraft));
    vi.mocked(proxyNetworkService.saveReport).mockResolvedValue({ _id: 'report-1', ...reportDraft } as never);
    vi.mocked(proxyNetworkService.submitCompletion).mockRejectedValue(
      new ApiRequestError('The completion requirements are incomplete.', { status: 422, missing: ['Server requires a location confirmation.'] }),
    );
    const inspectionPhoto = { id: 'e1', type: 'image', category: 'inspection_photo', accessUrl: 'https://private.example/photo' };
    render(<MemoryRouter><ProxyWorkspace detail={detail({ request: { ...detail().request, inspector: { _id: 'buyer-1', name: 'Ada', role: 'proxy_inspector' }, status: 'in_progress', requestedServices: ['condition_report', 'photos'] }, evidence: [inspectionPhoto] })} requestId="request-1" role="proxy_inspector" reload={reload} /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: 'Submit completion' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Submit completion' }));

    expect(proxyNetworkService.saveReport).toHaveBeenCalledWith('request-1', reportDraft, false);
    expect(proxyNetworkService.submitCompletion).toHaveBeenCalledWith('request-1');
    expect(await screen.findByText('Server requires a location confirmation.')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('The completion requirements are incomplete.');
    expect(toast.success).not.toHaveBeenCalledWith('Completion submitted for Buyer review.');
  });

  it('confirms completion as release-pending and does not report payout as settled', async () => {
    const user = userEvent.setup();
    const reload = vi.fn().mockResolvedValue(undefined);
    vi.mocked(proxyNetworkService.confirmCompletion).mockResolvedValue({ status: 'release_pending' } as never);
    render(<MemoryRouter><ProxyWorkspace detail={detail({ request: { ...detail().request, status: 'awaiting_buyer_confirmation' } })} requestId="request-1" role="buyer" reload={reload} /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: 'Confirm reviewed completion' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm completion' }));

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith('Completion confirmed. Payout is awaiting Admin action.');
    expect(proxyNetworkService.confirmCompletion).toHaveBeenCalledWith('request-1');
  });

  it('refreshes on an active-dispute conflict and keeps the buyer reason for review', async () => {
    const user = userEvent.setup();
    const reload = vi.fn().mockResolvedValue(undefined);
    vi.mocked(proxyNetworkService.dispute).mockRejectedValue(
      new ApiRequestError('A dispute is already active for this inspection.', { status: 409, code: 'CONFLICT' }),
    );
    render(<MemoryRouter><ProxyWorkspace detail={detail({ request: { ...detail().request, status: 'awaiting_buyer_confirmation' } })} requestId="request-1" role="buyer" reload={reload} /></MemoryRouter>);

    await user.type(screen.getByLabelText('Reason'), 'Evidence does not match the property');
    await user.click(screen.getByLabelText(/I understand this pauses conflicting completion/i));
    await user.click(screen.getByRole('button', { name: 'Raise dispute' }));

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Reason')).toHaveValue('Evidence does not match the property');
    expect(toast.error).toHaveBeenCalledWith('A dispute is already active for this inspection.');
    expect(toast.success).not.toHaveBeenCalledWith('Dispute raised.');
  });

  it('renders an empty conversation and then a server-held contact notice without inventing messages', () => {
    const empty = detail({ conversation: { conversation: { _id: 'c1', type: 'proxy_inspection' }, messages: [] } });
    const view = render(<MemoryRouter><ProxyWorkspace detail={empty} requestId="request-1" role="buyer" reload={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('No messages yet.')).toBeInTheDocument();

    view.rerender(<MemoryRouter><ProxyWorkspace detail={detail({ conversation: { conversation: { _id: 'c1', type: 'proxy_inspection' }, messages: [{ _id: 'm1', text: 'Contact information was withheld.', kind: 'system', createdAt: '2026-10-26T12:00:00.000Z' }] } })} requestId="request-1" role="buyer" reload={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('Contact information was withheld.')).toBeInTheDocument();
    expect(screen.queryByText('No messages yet.')).not.toBeInTheDocument();
  });

  it('keeps a rejected message draft and clears it only after server acknowledgement', async () => {
    const user = userEvent.setup();
    const reload = vi.fn().mockResolvedValue(undefined);
    vi.mocked(proxyNetworkService.sendMessage)
      .mockRejectedValueOnce(new Error('Message could not be accepted.'))
      .mockResolvedValueOnce({ _id: 'm1', text: 'Please confirm the appointment.', kind: 'participant' } as never);
    render(<MemoryRouter><ProxyWorkspace detail={detail()} requestId="request-1" role="buyer" reload={reload} /></MemoryRouter>);

    const message = screen.getByLabelText('Message');
    await user.type(message, 'Please confirm the appointment.');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Message could not be accepted.'));
    expect(message).toHaveValue('Please confirm the appointment.');

    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(message).toHaveValue(''));
  });

  it('keeps selected evidence and captions when upload fails', async () => {
    const user = userEvent.setup();
    vi.mocked(proxyNetworkService.uploadEvidence).mockRejectedValueOnce(
      new Error('Evidence upload could not be accepted.'),
    );
    render(<MemoryRouter><ProxyWorkspace detail={detail({ request: { ...detail().request, inspector: { _id: 'buyer-1', name: 'Ada', role: 'proxy_inspector' }, status: 'in_progress' } })} requestId="request-1" role="proxy_inspector" reload={vi.fn()} /></MemoryRouter>);

    const file = new File(['inspection evidence'], 'front.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/Choose evidence files/);
    await user.upload(fileInput, file);
    await user.type(screen.getByPlaceholderText('Caption'), 'Front entrance');
    await user.click(screen.getByRole('button', { name: 'Upload selected evidence' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Evidence upload could not be accepted.'));
    expect(fileInput).toHaveProperty('files.0', file);
    expect(screen.getByPlaceholderText('Caption')).toHaveValue('Front entrance');
  });

  it('does not leave an acknowledged message draft available for duplicate send when refresh fails', async () => {
    const user = userEvent.setup();
    const reload = vi.fn().mockRejectedValue(new Error('Refresh failed.'));
    vi.mocked(proxyNetworkService.sendMessage).mockResolvedValueOnce({
      _id: 'm1',
      text: 'Please confirm the appointment.',
      kind: 'participant',
    } as never);
    render(<MemoryRouter><ProxyWorkspace detail={detail()} requestId="request-1" role="buyer" reload={reload} /></MemoryRouter>);

    const message = screen.getByLabelText('Message');
    await user.type(message, 'Please confirm the appointment.');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(proxyNetworkService.sendMessage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(message).toHaveValue(''));
    expect(toast.success).toHaveBeenCalledWith('Message sent.');
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('action was accepted'));
    expect(screen.getByRole('button', { name: 'Refresh latest state' })).toBeInTheDocument();
  });

  it('submits a review only for completed work and refreshes after the server returns it', async () => {
    const user = userEvent.setup();
    const reload = vi.fn().mockResolvedValue(undefined);
    vi.mocked(proxyNetworkService.review).mockResolvedValue({ _id: 'review-1', rating: 5 } as never);
    const active = detail({ request: { ...detail().request, status: 'release_pending' } });
    const view = render(<MemoryRouter><ProxyWorkspace detail={active} requestId="request-1" role="buyer" reload={reload} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Submit review' })).not.toBeInTheDocument();

    view.rerender(<MemoryRouter><ProxyWorkspace detail={detail({ request: { ...detail().request, status: 'completed' } })} requestId="request-1" role="buyer" reload={reload} /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Submit review' }));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(proxyNetworkService.review).toHaveBeenCalledWith('request-1', { rating: 5, comment: undefined });
    expect(toast.success).toHaveBeenCalledWith('Review submitted.');
  });
});
