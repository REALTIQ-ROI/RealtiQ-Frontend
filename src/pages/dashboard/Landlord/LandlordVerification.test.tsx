import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  updateOnboarding: vi.fn(),
  evidence: vi.fn(),
  cases: vi.fn(),
  contract: vi.fn(),
  createHolderCase: vi.fn(),
  getHolderCase: vi.fn(),
  holderHistory: vi.fn(),
  stepUpStart: vi.fn(),
  stepUpVerify: vi.fn(),
}));

vi.mock('../../../services/profileService', () => ({ profileService: {
  current: mocks.current,
  getOnboarding: mocks.onboarding,
  updateOnboarding: mocks.updateOnboarding,
} }));

vi.mock('../../../services/verificationCaseService', () => ({ verificationCaseService: {
  listEvidence: mocks.evidence,
  listHolderCases: mocks.cases,
  getEvidenceContract: mocks.contract,
  getEvidence: vi.fn(),
  getEvidenceContent: vi.fn(),
  retryEvidence: vi.fn(),
  deleteEvidence: vi.fn(),
  getHolderCase: mocks.getHolderCase,
  holderHistory: mocks.holderHistory,
  createHolderCase: mocks.createHolderCase,
  withdrawCase: vi.fn(),
} }));

vi.mock('../../../services/stepUpService', () => ({ stepUpService: {
  start: mocks.stepUpStart,
  verify: mocks.stepUpVerify,
} }));

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ activeProfile: { id: mocks.profileId }, token: 'session-1' }) }));
vi.mock('../../../components/layout/LandlordPortalLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('../../../components/auth/StepUpDialog', () => ({ default: ({ challenge, onSubmit }: { challenge: { label: string } | null; onSubmit: (code: string) => void }) => challenge
  ? <div role="dialog" aria-label={challenge.label}><p>{challenge.label}</p><button type="button" onClick={() => onSubmit('123456')}>Verify and continue</button></div>
  : null }));

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
    mocks.updateOnboarding.mockReset();
    mocks.createHolderCase.mockReset();
    mocks.getHolderCase.mockResolvedValue({ id: 'case-1', profileId: 'profile-1', kind: 'kyc', structure: 'company', draftVersion: 1, state: 'submitted', version: 1, rejectionCodes: [], submittedAt: null, reviewedAt: null, expiresAt: null });
    mocks.holderHistory.mockResolvedValue({ events: [], nextCursor: null });
    mocks.stepUpStart.mockReset();
    mocks.stepUpStart.mockImplementation((method: 'POST' | 'PATCH') => Promise.resolve({ challengeId: `challenge-${method.toLowerCase()}-${mocks.stepUpStart.mock.calls.length}`, expiresAt: new Date(Date.now() + 60_000).toISOString(), method: 'totp' }));
    mocks.stepUpVerify.mockReset();
    mocks.stepUpVerify.mockResolvedValue(undefined);
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
    mocks.onboarding.mockImplementation((requestedId: string) => Promise.resolve({
      ...draft,
      profileId: requestedId,
      version: requestedId === 'profile-2' ? 8 : 7,
      values: { profileMarker: requestedId },
    }));

    const view = render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    await waitFor(() => expect(mocks.current).toHaveBeenCalledWith('profile-1'));

    mocks.profileId = 'profile-2';
    localStorage.setItem('activeProfileId', 'profile-2');
    view.rerender(<MemoryRouter><LandlordVerification /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Second Landlord' })).toBeInTheDocument();
    const editor = await screen.findByRole('textbox', { name: 'Profile Marker' });
    await waitFor(() => expect(editor).toHaveValue('profile-2'));
    expect(mocks.onboarding).toHaveBeenCalledWith('profile-2');
    resolveFirstProfile?.({ profile });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Example Landlord' })).not.toBeInTheDocument());
    expect(editor).toHaveValue('profile-2');
    expect(screen.getByText('Saved · version 8')).toBeInTheDocument();
  });

  it('shows an evidence selector only for route purposes with available uploaded evidence', async () => {
    mocks.contract.mockResolvedValue({
      ...contract,
      individualRoutes: { nigerian: ['bvn', 'nin', 'additional_government_id', 'proof_of_address'] },
    });
    mocks.evidence.mockResolvedValue({
      evidence: [{
        id: 'evidence-nin-1', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'nin_slip',
        version: 1, previousEvidenceId: null, mimeType: 'application/pdf', size: 245120, state: 'available',
        errorCode: null, contentValidatedAt: '2026-10-25T10:45:00.000Z', createdAt: '2026-10-25T10:45:00.000Z',
      }],
      nextCursor: null,
    });

    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Example Landlord' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Individual identity route'), 'nigerian');

    expect(screen.getByLabelText('Evidence for nin')).toBeInTheDocument();
    expect(screen.queryByLabelText('Evidence for bvn')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Evidence for additional government id')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Evidence for proof of address')).not.toBeInTheDocument();
    expect(screen.getByText(/No available bvn evidence has been uploaded/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Upload bvn evidence' })).toHaveAttribute('href', '#kyc-evidence-upload');
    expect(screen.getByRole('option', { name: /nin slip · v1/ })).toHaveValue('evidence-nin-1');

    await userEvent.selectOptions(screen.getByLabelText('Evidence for nin'), 'evidence-nin-1');
    await userEvent.type(screen.getByLabelText('Identity country'), 'NG');
    await userEvent.click(screen.getByRole('button', { name: 'Submit saved draft for verification' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/evidence is required for each configured identity purpose/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/bvn, additional government id, proof of address/i);
  });

  it('shows a normal input for a missing field and saves the first draft using the server version', async () => {
    const emptyDraft = { ...draft, version: 0, values: {}, readiness: { intakeMissing: ['countryOfResidence'] } };
    const savedDraft = { ...emptyDraft, version: 1, values: { countryOfResidence: 'NG' }, readiness: { intakeMissing: [] } };
    mocks.onboarding.mockResolvedValueOnce(emptyDraft).mockResolvedValue(savedDraft);
    mocks.updateOnboarding.mockResolvedValueOnce(savedDraft);

    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    const country = await screen.findByRole('textbox', { name: 'Country Of Residence' });
    expect(country).toHaveAttribute('aria-required', 'true');
    await userEvent.type(country, 'NG');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft with authenticator' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));

    await waitFor(() => expect(mocks.updateOnboarding).toHaveBeenCalledWith(
      { expectedVersion: 0, values: { countryOfResidence: 'NG' } },
      'challenge-patch-1',
      'profile-1',
    ));
    expect(await screen.findByText('Saved · version 1')).toBeInTheDocument();
  });

  it('saves edits with PATCH-bound step-up, blocks submission while saving, then submits the returned version with a separate POST challenge', async () => {
    const initialDraft = { ...draft, structure: 'company', version: 3, values: { companyName: 'Original Ltd' } };
    const savedDraft = { ...initialDraft, version: 4, values: { companyName: 'Updated Ltd' }, updatedAt: '2026-11-01T01:00:00.000Z' };
    const createdCase = { id: 'case-new', profileId: 'profile-1', kind: 'kyc', structure: 'company', draftVersion: 4, state: 'submitted', version: 1, rejectionCodes: [], submittedAt: null, reviewedAt: null, expiresAt: null };
    mocks.onboarding.mockReset().mockResolvedValueOnce(initialDraft).mockResolvedValue(savedDraft);
    let resolvePatch: ((value: typeof savedDraft) => void) | undefined;
    mocks.updateOnboarding.mockReturnValueOnce(new Promise((resolve) => { resolvePatch = resolve; }));
    mocks.createHolderCase.mockResolvedValue(createdCase);

    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    const editor = await screen.findByRole('textbox', { name: 'Company Name' });
    expect(screen.queryByLabelText('Profile information (JSON)')).not.toBeInTheDocument();
    fireEvent.change(editor, { target: { value: 'Updated Ltd' } });
    const submitButton = screen.getByRole('button', { name: 'Submit saved draft for verification' });
    expect(submitButton).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Save draft with authenticator' }));
    expect(editor).toBeDisabled();
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));
    const updateBody = { expectedVersion: 3, values: { companyName: 'Updated Ltd' } };
    await waitFor(() => expect(mocks.updateOnboarding).toHaveBeenCalledWith(updateBody, 'challenge-patch-1', 'profile-1'));
    expect(mocks.stepUpStart).toHaveBeenNthCalledWith(1, 'PATCH', '/api/profiles/current/onboarding', updateBody);
    expect(submitButton).toBeDisabled();

    resolvePatch?.(savedDraft);
    expect(await screen.findByText('Saved · version 4')).toBeInTheDocument();
    await waitFor(() => expect(editor).toBeEnabled());
    await waitFor(() => expect(submitButton).toBeEnabled());
    await userEvent.click(submitButton);
    expect(editor).toBeDisabled();
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));

    await waitFor(() => expect(mocks.createHolderCase).toHaveBeenCalledTimes(1));
    const submission = mocks.stepUpStart.mock.calls[1];
    expect(submission[0]).toBe('POST');
    expect(submission[1]).toBe('/api/profiles/current/verification-cases');
    expect(submission[2]).toMatchObject({ expectedDraftVersion: 4, people: [] });
    expect(submission[2]).toHaveProperty('operationKey');
    expect(mocks.stepUpVerify).toHaveBeenNthCalledWith(1, 'challenge-patch-1', '123456');
    expect(mocks.stepUpVerify).toHaveBeenNthCalledWith(2, 'challenge-post-2', '123456');
    expect(mocks.updateOnboarding).toHaveBeenCalledTimes(1);
    expect(mocks.createHolderCase).toHaveBeenCalledWith(submission[2], 'challenge-post-2');
  });

  it('preserves local edits and requires review after a draft version conflict', async () => {
    const initialDraft = { ...draft, version: 3, values: { countryOfResidence: 'NG' } };
    const latestDraft = { ...draft, version: 4, values: { countryOfResidence: 'GB' } };
    mocks.onboarding.mockReset().mockResolvedValueOnce(initialDraft).mockResolvedValueOnce(latestDraft);
    mocks.updateOnboarding.mockRejectedValueOnce(new ApiRequestError('Reload the private draft before submitting.', { status: 409, code: 'CONFLICT_ONBOARDING_VERSION' }));

    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    const editor = await screen.findByRole('textbox', { name: 'Country Of Residence' });
    fireEvent.change(editor, { target: { value: 'CA' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save draft with authenticator' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));

    expect(await screen.findByText(/draft changed elsewhere/i)).toBeInTheDocument();
    expect(editor).toHaveValue('CA');
    expect(screen.getByText(/latest saved draft is version 4/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save draft with authenticator' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Use latest saved draft' }));
    expect(editor).toHaveValue('GB');
    expect(await screen.findByText('Saved · version 4')).toBeInTheDocument();
  });

  it('refreshes the draft after a submission version conflict without retrying the case POST', async () => {
    const initialDraft = { ...draft, structure: 'company', version: 3, values: { companyName: 'Current Ltd' } };
    const latestDraft = { ...initialDraft, version: 4, values: { companyName: 'Updated elsewhere Ltd' } };
    mocks.onboarding.mockReset().mockResolvedValueOnce(initialDraft).mockResolvedValueOnce(latestDraft);
    mocks.createHolderCase.mockRejectedValueOnce(new ApiRequestError('Reload the private draft before submitting.', { status: 409, code: 'CONFLICT_ONBOARDING_VERSION' }));

    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    const submit = await screen.findByRole('button', { name: 'Submit saved draft for verification' });
    await userEvent.click(submit);
    expect(screen.getByRole('textbox', { name: 'Company Name' })).toBeDisabled();
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));

    expect(await screen.findByText(/onboarding draft changed before submission/i)).toBeInTheDocument();
    expect(screen.getByText(/latest saved draft is version 4/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Company Name' })).toHaveValue('Current Ltd');
    expect(submit).toBeDisabled();
    expect(mocks.createHolderCase).toHaveBeenCalledTimes(1);
    expect(mocks.onboarding).toHaveBeenCalledTimes(2);
  });
});
