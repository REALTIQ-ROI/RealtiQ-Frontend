import { render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../../lib/axios';
import { adminPolicyRegistry } from '../../../services/adminPolicyRegistry';
import AdminPolicies from './AdminPolicies';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  begin: vi.fn(),
  complete: vi.fn(),
  cancel: vi.fn(),
  clearError: vi.fn(),
  getError: vi.fn(),
  getPolicy: vi.fn(),
  getHistory: vi.fn(),
  prepareRevision: vi.fn(),
  decideRevision: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../../hooks/useBoundStepUp', () => ({ useBoundStepUp: () => ({
  begin: mocks.begin, complete: mocks.complete, cancel: mocks.cancel, clearError: mocks.clearError,
  getError: mocks.getError, challenge: null, busy: false, error: null, errorCode: null,
}) }));
vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('../../../components/auth/StepUpDialog', () => ({ default: ({ onSubmit, error }: { onSubmit: (code: string) => Promise<boolean>; error?: string | null }) => <>
  {error ? <p role="alert">{error}</p> : null}<button type="button" onClick={() => void onSubmit('123456')}>Complete mock step-up</button>
</> }));
vi.mock('../../../services/adminPolicyService', () => ({
  adminPolicyService: {
    getPolicy: mocks.getPolicy,
    getHistory: mocks.getHistory,
    prepareRevision: mocks.prepareRevision,
    decideRevision: mocks.decideRevision,
  },
}));

const currentPolicy = (key: string, revision = 0, state = 'unconfigured', value: unknown = null) => ({
  policy: { key, state, revision, value },
});

const identityValue = {
  verificationTtlSeconds: 7200, resetTtlSeconds: 1800, cooldownSeconds: 300, deliveryAttempts: 2, retrySeconds: [60, 300],
};

const openPolicy = async (key: string, label?: string) => {
  const found = await screen.findAllByRole('button', { name: /View and edit policy/ });
  const metadata = adminPolicyRegistry.find((item) => item.key === key);
  const card = found.find((button) => button.closest('li')?.textContent?.includes(label ?? metadata?.label ?? key));
  if (!card) throw new Error(`Policy ${key} was not listed`);
  await waitFor(() => expect(card).toBeEnabled());
  await userEvent.click(card);
};

describe('AdminPolicies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: { _id: 'admin-current', name: 'Admin', role: 'admin' }, activeProfile: { id: 'staff-profile' }, token: 'token' });
    mocks.getPolicy.mockImplementation(async (key: string) => currentPolicy(key));
    mocks.getHistory.mockResolvedValue({ revisions: [], nextCursor: null });
    mocks.begin.mockResolvedValue(true);
    mocks.getError.mockReturnValue(null);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('lists all 30 registered policies grouped by category and loads current state from the API', async () => {
    render(<AdminPolicies />);
    expect(await screen.findByRole('heading', { name: 'Identity and profiles' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Notifications and delivery' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Verification, trust, and credentials' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Private files and custody' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Search and discovery' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Plans and payouts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Listings and data' })).toBeInTheDocument();
    await waitFor(() => expect(mocks.getPolicy).toHaveBeenCalledTimes(30));
    for (const item of adminPolicyRegistry) expect(screen.getByText(item.key)).toBeInTheDocument();
    expect(adminPolicyRegistry).toHaveLength(30);
    expect(screen.getAllByText('unconfigured')).toHaveLength(30);
  });

  it('renders named, blank schema fields for an unconfigured policy without supplying guessed defaults', async () => {
    render(<AdminPolicies />);
    await openPolicy('identity_email', 'Identity email');
    expect(await screen.findByText('No approved value is configured. No default values are supplied here.')).toBeInTheDocument();
    expect(screen.getByLabelText('Verification TTL (seconds)')).toHaveValue(null);
    expect(screen.getByLabelText('Reset TTL (seconds)')).toHaveValue(null);
    expect(screen.getByLabelText('Cooldown (seconds)')).toHaveValue(null);
    expect(screen.getByLabelText('Delivery attempts')).toHaveValue(null);
    expect(screen.queryByLabelText(/JSON/i)).not.toBeInTheDocument();
    expect(mocks.getHistory).toHaveBeenCalledWith('identity_email', { limit: 25 });
  });

  it('binds the exact structured revision body to step-up and displays the server returned state', async () => {
    mocks.getPolicy.mockImplementation(async (key: string) => currentPolicy(key, 4, 'configured', identityValue));
    const revision = { id: 'approved-1', key: 'identity_email', basedOnRevision: 4, value: identityValue, reason: 'Approved change', state: 'approved', preparedBy: 'admin-current', preparedProfile: 'staff-profile', approvedBy: 'admin-current', approvedAt: '2026-10-27T12:00:00.000Z', createdAt: '2026-10-27T12:00:00.000Z' };
    mocks.prepareRevision.mockResolvedValue(revision);
    mocks.complete.mockImplementation(async () => {
      const action = mocks.begin.mock.calls[0][0];
      return { ok: true, value: await action.execute('step-up-id', action.body) };
    });
    render(<AdminPolicies />);
    await openPolicy('identity_email', 'Identity email');
    const editor = screen.getByRole('region', { name: 'Identity email' });
    await within(editor).findByLabelText('Verification TTL (seconds)');
    await userEvent.clear(within(editor).getByLabelText('Verification TTL (seconds)'));
    await userEvent.type(within(editor).getByLabelText('Verification TTL (seconds)'), '7200');
    await userEvent.clear(within(editor).getByLabelText('Reset TTL (seconds)'));
    await userEvent.type(within(editor).getByLabelText('Reset TTL (seconds)'), '1800');
    await userEvent.clear(within(editor).getByLabelText('Cooldown (seconds)'));
    await userEvent.type(within(editor).getByLabelText('Cooldown (seconds)'), '300');
    const firstRetry = within(editor).getByLabelText('Retry delays (seconds) item 1');
    await userEvent.clear(firstRetry);
    await userEvent.type(firstRetry, '60');
    const secondRetry = within(editor).getByLabelText('Retry delays (seconds) item 2');
    await userEvent.clear(secondRetry);
    await userEvent.type(secondRetry, '300');
    await userEvent.type(within(editor).getByLabelText('Reason'), 'Approved change');
    await userEvent.click(within(editor).getByRole('button', { name: 'Submit policy revision' }));

    const expectedBody = { value: identityValue, reason: 'Approved change', expectedRevision: 4 };
    await waitFor(() => expect(mocks.begin).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST', path: '/api/admin/policies/identity_email/revisions', body: expectedBody,
    })));
    await userEvent.click(screen.getByRole('button', { name: 'Complete mock step-up' }));
    expect(mocks.prepareRevision).toHaveBeenCalledWith('identity_email', expectedBody, 'step-up-id');
    expect(await within(editor).findByRole('status')).toHaveTextContent('The server reports its state as “approved”.');
    expect(within(editor).queryByText(/not active|must be approved by another/i)).not.toBeInTheDocument();
  });

  it('creates exactly one retry-delay input per selected delivery attempt', async () => {
    render(<AdminPolicies />);
    await openPolicy('contact_verification', 'Contact verification');
    const editor = screen.getByRole('region', { name: 'Contact verification' });
    expect(await within(editor).findByLabelText('Code length')).toHaveValue(null);
    await userEvent.type(within(editor).getByLabelText('Delivery attempts'), '2');
    expect(within(editor).getByLabelText('Retry delays (seconds) item 1')).toBeInTheDocument();
    expect(within(editor).getByLabelText('Retry delays (seconds) item 2')).toBeInTheDocument();
    expect(within(editor).queryByLabelText(/JSON/i)).not.toBeInTheDocument();
    expect(within(editor).getByRole('button', { name: 'Submit policy revision' })).toBeInTheDocument();
    expect(mocks.begin).not.toHaveBeenCalled();
  });

  it('keeps backend authorization and bound step-up authoritative when challenge setup fails', async () => {
    mocks.begin.mockResolvedValue(false);
    mocks.getError.mockReturnValue('Protected challenge could not be started.');
    mocks.getPolicy.mockImplementation(async (key: string) => key === 'owner_listing_cap'
      ? currentPolicy(key, 1, 'configured', { activeListings: 10 })
      : currentPolicy(key));
    render(<AdminPolicies />);
    await openPolicy('owner_listing_cap', 'Owner listing cap');
    const editor = screen.getByRole('region', { name: 'Owner listing cap' });
    await within(editor).findByLabelText('Maximum active listings');
    await userEvent.clear(within(editor).getByLabelText('Maximum active listings'));
    await userEvent.type(within(editor).getByLabelText('Maximum active listings'), '25');
    await userEvent.type(within(editor).getByLabelText('Reason'), 'Approved value');
    await userEvent.click(within(editor).getByRole('button', { name: 'Submit policy revision' }));
    expect(await within(editor).findByRole('status')).toHaveTextContent('Protected challenge could not be started.');
    expect(mocks.prepareRevision).not.toHaveBeenCalled();
  });

  it('renders backend policy validation details without discarding typed field edits', async () => {
    mocks.prepareRevision.mockRejectedValue(new ApiRequestError('Policy values are invalid', {
      status: 422, code: 'CONTENT_POLICY_INVALID',
      fieldErrors: [{ path: 'value.retrySeconds', msg: 'Must contain one delay per attempt.' }],
    }));
    mocks.getPolicy.mockImplementation(async (key: string) => key === 'identity_email'
      ? currentPolicy(key, 2, 'configured', identityValue)
      : currentPolicy(key));
    render(<AdminPolicies />);
    await openPolicy('identity_email', 'Identity email');
    const editor = screen.getByRole('region', { name: 'Identity email' });
    const retry = await within(editor).findByLabelText('Retry delays (seconds) item 1');
    await userEvent.clear(retry);
    await userEvent.type(retry, '60');
    await userEvent.type(within(editor).getByLabelText('Reason'), 'Approved value');
    await userEvent.click(within(editor).getByRole('button', { name: 'Submit policy revision' }));
    const action = mocks.begin.mock.calls.at(-1)?.[0];
    await expect(action.execute('challenge', action.body)).rejects.toThrow('Policy values are invalid');
    expect(await within(editor).findByRole('alert', { name: 'Server validation errors' })).toHaveTextContent('value.retrySeconds: Must contain one delay per attempt.');
    expect(within(editor).getByLabelText('Retry delays (seconds) item 1')).toHaveValue(60);
  });

  it('shows immediate approval only when returned by the server and refreshes active state', async () => {
    let submitted = false;
    const initialValue = identityValue;
    const approvedRevision = { id: 'approved-rev', key: 'identity_email', basedOnRevision: 0, value: identityValue, reason: 'Approved', state: 'approved', preparedBy: 'admin-current', preparedProfile: 'staff-profile', approvedBy: 'admin-current', approvedAt: '2026-10-27T12:00:00.000Z', createdAt: '2026-10-27T12:00:00.000Z' };
    mocks.getPolicy.mockImplementation(async (key: string) => key === 'identity_email'
      ? submitted ? currentPolicy(key, 1, 'configured', { ...initialValue }) : currentPolicy(key, 0, 'configured', initialValue)
      : currentPolicy(key));
    mocks.prepareRevision.mockImplementation(async () => { submitted = true; return approvedRevision; });
    mocks.getHistory.mockImplementation(async (key: string) => key === 'identity_email' && submitted
      ? { revisions: [approvedRevision], nextCursor: null }
      : { revisions: [], nextCursor: null });
    mocks.complete.mockImplementation(async () => {
      const action = mocks.begin.mock.calls[0][0];
      return { ok: true, value: await action.execute('step-up-id', action.body) };
    });
    render(<AdminPolicies />);
    await openPolicy('identity_email', 'Identity email');
    const editor = screen.getByRole('region', { name: 'Identity email' });
    await within(editor).findByLabelText('Verification TTL (seconds)');
    await userEvent.type(within(editor).getByLabelText('Reason'), 'Approved change');
    await userEvent.click(within(editor).getByRole('button', { name: 'Submit policy revision' }));
    await userEvent.click(screen.getByRole('button', { name: 'Complete mock step-up' }));
    expect(await within(editor).findByRole('status')).toHaveTextContent('state as “approved”');
    expect(await within(editor).findByText('Approved revision:')).toBeInTheDocument();
    expect(within(editor).getByText('Approved revision:').parentElement).toHaveTextContent('1');
    expect(within(editor).getByText('approved')).toBeInTheDocument();
  });

  it('retains the draft and requires review after a server version conflict', async () => {
    mocks.getPolicy.mockImplementation(async (key: string) => key === 'identity_email'
      ? currentPolicy(key, 4, 'configured', identityValue)
      : currentPolicy(key));
    mocks.prepareRevision.mockRejectedValue(new ApiRequestError('Policy version changed', { status: 409, code: 'CONFLICT_POLICY_VERSION' }));
    render(<AdminPolicies />);
    await openPolicy('identity_email', 'Identity email');
    const editor = screen.getByRole('region', { name: 'Identity email' });
    await within(editor).findByLabelText('Verification TTL (seconds)');
    await userEvent.type(within(editor).getByLabelText('Reason'), 'Keep this draft');
    await userEvent.click(within(editor).getByRole('button', { name: 'Submit policy revision' }));
    const action = mocks.begin.mock.calls[0][0];
    await expect(action.execute('step-up', action.body)).rejects.toThrow('Policy version changed');
    expect(await within(editor).findByRole('checkbox', { name: /I reviewed the refreshed current policy/ })).toBeInTheDocument();
    expect(within(editor).getByLabelText('Reason')).toHaveValue('Keep this draft');
    expect(within(editor).getByRole('button', { name: 'Submit policy revision' })).toBeDisabled();
    expect(mocks.getHistory).toHaveBeenCalledWith('identity_email', { limit: 25 });
  });

  it('preserves bodyless decision endpoint, distinct preparer restriction, and server denial handling', async () => {
    const revision = {
      id: 'revision-7', key: 'notification_delivery', basedOnRevision: 0,
      value: { email: false, sms: false, whatsapp: false, push: false, maxAttempts: 1, retrySeconds: [60] },
      reason: 'Approved settings', state: 'pending', preparedBy: 'another-admin', preparedProfile: 'other-profile',
      approvedBy: null, approvedAt: null, rejectedAt: null, createdAt: '2026-10-27T12:00:00.000Z',
    };
    mocks.getHistory.mockImplementation(async (key: string) => key === 'notification_delivery' ? { revisions: [revision], nextCursor: null } : { revisions: [], nextCursor: null });
    mocks.decideRevision.mockRejectedValue(new ApiRequestError('Decision permission is denied', { status: 403, code: 'PERMISSION_DEPARTMENT_REQUIRED' }));
    render(<AdminPolicies />);
    await openPolicy('notification_delivery', 'Notification delivery');
    const editor = screen.getByRole('region', { name: 'Notification delivery' });
    await within(editor).findByRole('button', { name: 'Approve revision' });
    await userEvent.click(within(editor).getByRole('button', { name: 'Approve revision' }));
    await waitFor(() => expect(mocks.begin).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST', path: '/api/admin/policies/notification_delivery/revisions/revision-7/approved', body: {},
    })));
    const action = mocks.begin.mock.calls.at(-1)?.[0];
    await expect(action.execute('decision-challenge', {})).rejects.toThrow('Decision permission is denied');
    expect(mocks.decideRevision).toHaveBeenCalledWith('notification_delivery', 'revision-7', 'approved', 'decision-challenge');
    expect(await within(editor).findByRole('status')).toHaveTextContent('Decision permission is denied');
  });

  it('loads history using the opaque cursor and deduplicates rows', async () => {
    const first = { id: 'rev-1', key: 'identity_email', basedOnRevision: 0, value: identityValue, reason: 'First', state: 'rejected', preparedBy: 'staff-2', preparedProfile: 'profile-2', createdAt: '2026-10-27T12:00:00.000Z' };
    const second = { ...first, id: 'rev-2', reason: 'Second' };
    let firstPage = true;
    mocks.getHistory.mockImplementation(async (key: string, options?: { before?: string }) => {
      if (key !== 'identity_email') return { revisions: [], nextCursor: null };
      if (!options?.before && firstPage) { firstPage = false; return { revisions: [first], nextCursor: 'opaque-next-revision' }; }
      return { revisions: [first, second], nextCursor: null };
    });
    render(<AdminPolicies />);
    await openPolicy('identity_email', 'Identity email');
    const editor = screen.getByRole('region', { name: 'Identity email' });
    await within(editor).findByText('First');
    await userEvent.click(within(editor).getByRole('button', { name: 'Load more history' }));
    await waitFor(() => expect(editor.querySelectorAll('ol > li')).toHaveLength(2));
    expect(mocks.getHistory).toHaveBeenCalledWith('identity_email', { limit: 25, before: 'opaque-next-revision' });
  });
});
