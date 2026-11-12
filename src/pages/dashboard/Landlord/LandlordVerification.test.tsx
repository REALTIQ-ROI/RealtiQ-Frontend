import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../../lib/axios';
import { sha256File } from '../../../utils/profileEvidenceUpload';
import LandlordVerification from './LandlordVerification';

const mocks = vi.hoisted(() => ({
  profileId: 'profile-1',
  profileKind: 'owner',
  profileStructure: 'individual',
  accountRole: 'owner',
  adminCapabilities: [] as string[],
  current: vi.fn(),
  onboarding: vi.fn(),
  updateOnboarding: vi.fn(),
  evidence: vi.fn(),
  allEvidence: vi.fn(),
  cases: vi.fn(),
  contract: vi.fn(),
  createHolderCase: vi.fn(),
  getHolderCase: vi.fn(),
  holderHistory: vi.fn(),
  stepUpStart: vi.fn(),
  stepUpVerify: vi.fn(),
  uploadEvidence: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('../../../services/profileService', () => ({ profileService: {
  current: mocks.current,
  getOnboarding: mocks.onboarding,
  updateOnboarding: mocks.updateOnboarding,
} }));

vi.mock('../../../services/verificationCaseService', () => ({ verificationCaseService: {
  listEvidence: mocks.evidence,
  listAllEvidence: mocks.allEvidence,
  listHolderCases: mocks.cases,
  getEvidenceContract: mocks.contract,
  getEvidence: vi.fn(),
  getEvidenceContent: vi.fn(),
  retryEvidence: vi.fn(),
  deleteEvidence: vi.fn(),
  uploadEvidence: mocks.uploadEvidence,
  getHolderCase: mocks.getHolderCase,
  holderHistory: mocks.holderHistory,
  createHolderCase: mocks.createHolderCase,
  withdrawCase: vi.fn(),
} }));

vi.mock('../../../services/stepUpService', () => ({ stepUpService: {
  start: mocks.stepUpStart,
  verify: mocks.stepUpVerify,
} }));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: vi.fn(), info: vi.fn() } }));

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({
  activeProfile: { id: mocks.profileId, kind: mocks.profileKind, structure: mocks.profileStructure, name: 'Example profile', status: 'active', version: 1, permissions: {} },
  token: 'session-1',
  user: { role: mocks.accountRole },
  adminAccess: { profileId: mocks.profileId, capabilities: mocks.adminCapabilities, readOnly: false, isInternalAudit: false, staffDepartments: [] },
}) }));
vi.mock('../../../components/layout/LandlordPortalLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('../../../components/layout/BuyerPortalLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
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

const submitSelectedPrivateEvidence = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Upload a document' }));
  await userEvent.selectOptions(screen.getByLabelText('Purpose'), 'nin');
  await userEvent.selectOptions(screen.getByLabelText('Subject'), 'self');
  const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!fileInput) throw new Error('Evidence file input was not rendered.');
  await userEvent.upload(fileInput, new File(['valid supported file bytes'], 'nin.pdf', { type: 'application/pdf' }));
  await userEvent.click(screen.getByRole('button', { name: 'Continue with authenticator' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));
};

describe('landlord profile verification loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profileId = 'profile-1';
    mocks.profileKind = 'owner';
    mocks.profileStructure = 'individual';
    mocks.accountRole = 'owner';
    mocks.adminCapabilities = [];
    localStorage.setItem('activeProfileId', 'profile-1');
    localStorage.setItem('token', 'session-1');
    mocks.current.mockImplementation((id: string) => Promise.resolve({ profile: { ...profile, id, kind: mocks.profileKind, structure: mocks.profileStructure } }));
    mocks.onboarding.mockResolvedValue(draft);
    mocks.evidence.mockResolvedValue({ evidence: [], nextCursor: null });
    mocks.allEvidence.mockImplementation(async () => {
      const records: unknown[] = [];
      let before: string | undefined;
      do {
        const page = await mocks.evidence({ limit: 100, ...(before ? { before } : {}) });
        records.push(...page.evidence);
        before = page.nextCursor ?? undefined;
      } while (before);
      return records;
    });
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
    mocks.uploadEvidence.mockReset();
    mocks.toastSuccess.mockReset();
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
  }, 15000);

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

  it('does not call applicant KYC endpoints for an unsupported selected profile', async () => {
    mocks.profileKind = 'developer';
    mocks.profileStructure = 'individual';
    mocks.current.mockClear();

    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);

    expect(await screen.findByRole('status')).toHaveTextContent(/applicant kyc form is not available for this profile type/i);
    expect(mocks.current).not.toHaveBeenCalled();
    expect(mocks.onboarding).not.toHaveBeenCalled();
    expect(mocks.evidence).not.toHaveBeenCalled();
    expect(mocks.cases).not.toHaveBeenCalled();
    expect(mocks.contract).not.toHaveBeenCalled();
  });

  it('routes a staff profile to the authorized reviewer experience without loading applicant data', async () => {
    mocks.profileKind = 'staff';
    mocks.profileStructure = 'individual';
    mocks.accountRole = 'admin';
    mocks.adminCapabilities = ['verification.read'];
    mocks.current.mockClear();

    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);

    expect(await screen.findByRole('link', { name: 'Open KYC review' })).toHaveAttribute('href', '/dashboard/admin/kyc');
    expect(mocks.current).not.toHaveBeenCalled();
    expect(mocks.onboarding).not.toHaveBeenCalled();
    expect(mocks.evidence).not.toHaveBeenCalled();
  });

  it('shows an evidence selector only for route purposes with available uploaded evidence', async () => {
    mocks.profileKind = 'buyer';
    mocks.accountRole = 'buyer';
    mocks.onboarding.mockResolvedValue({ ...draft, kind: 'buyer' });
    mocks.contract.mockResolvedValue({
      ...contract,
      purposes: ['bvn', 'nin', 'additional_government_id', 'proof_of_address'],
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
    expect(screen.getByText(/No available additional government id evidence has been uploaded/i)).toBeInTheDocument();
    expect(screen.getByText(/No available proof of address evidence has been uploaded/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Upload BVN evidence' }));
    expect(screen.getByRole('dialog', { name: 'Upload private evidence' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Upload private evidence' }).parentElement?.parentElement).toBe(document.body);
    expect(screen.getByText('Document: BVN · For you')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('option', { name: /nin slip · version 1/i })).toHaveValue('evidence-nin-1');

    await userEvent.selectOptions(screen.getByLabelText('Evidence for nin'), 'evidence-nin-1');
    await userEvent.type(screen.getByLabelText('Identity country'), 'NG');
    await userEvent.click(screen.getByRole('button', { name: 'Submit saved draft for verification' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/evidence is required for each configured identity purpose/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/bvn, additional government id, proof of address/i);
  });

  it('blocks individual international KYC when the backend accepted-ID list is empty', async () => {
    mocks.profileKind = 'buyer';
    mocks.accountRole = 'buyer';
    mocks.onboarding.mockResolvedValue({ ...draft, kind: 'buyer' });
    mocks.contract.mockResolvedValue({
      ...contract,
      purposes: ['passport', 'residence_national_id', 'overseas_address_proof'],
      documentKinds: { residence_national_id: ['national_id_card'] },
      individualRoutes: { international: ['passport', 'residence_national_id', 'overseas_address_proof'] },
      acceptedInternationalIds: [],
    });
    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Example Landlord' });
    await userEvent.selectOptions(screen.getByLabelText('Individual identity route'), 'international');
    expect(screen.getAllByText(/accepted international identity document list has not been configured/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Submit saved draft for verification' })).toBeDisabled();
  });

  it('replaces a deleted tombstone with its record ID, not its version or prior link', async () => {
    mocks.uploadEvidence.mockResolvedValue({
      id: 'evidence-uploaded', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'nin',
      version: 5, previousEvidenceId: 'evidence-tombstone', mimeType: 'application/pdf', size: 100, state: 'available',
      errorCode: null, contentValidatedAt: '2026-11-11T10:00:00.000Z', createdAt: '2026-11-11T10:00:00.000Z',
    });
    mocks.evidence.mockResolvedValue({
      evidence: [
        { id: 'evidence-tombstone', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'nin', version: 4,
          previousEvidenceId: 'older-record-must-not-be-used', mimeType: 'application/pdf', size: 100, state: 'deleted', errorCode: null,
          contentValidatedAt: null, createdAt: '2026-11-11T09:00:00.000Z' },
        { id: 'wrong-purpose', profileId: 'profile-1', purpose: 'bvn', subject: 'self', documentKind: 'bvn', version: 99,
          previousEvidenceId: null, mimeType: 'application/pdf', size: 100, state: 'available', errorCode: null,
          contentValidatedAt: null, createdAt: '2026-11-11T09:30:00.000Z' },
        { id: 'wrong-profile', profileId: 'profile-2', purpose: 'nin', subject: 'self', documentKind: 'nin', version: 100,
          previousEvidenceId: null, mimeType: 'application/pdf', size: 100, state: 'available', errorCode: null,
          contentValidatedAt: null, createdAt: '2026-11-11T09:45:00.000Z' },
      ],
      nextCursor: null,
    });
    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Example Landlord' });

    await userEvent.click(screen.getByRole('button', { name: 'Upload a document' }));
    await userEvent.selectOptions(screen.getByLabelText('Purpose'), 'nin');
    await userEvent.selectOptions(screen.getByLabelText('Subject'), 'self');
    expect(screen.getByText(/Replacing the latest evidence record · Version 4/i)).toBeInTheDocument();
    expect(screen.getByText(/Current file state: Deleted/i)).toBeInTheDocument();
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error('Evidence file input was not rendered.');
    const selectedFile = new File(['private evidence'], 'nin.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, selectedFile);
    await userEvent.click(screen.getByRole('button', { name: 'Continue with authenticator' }));
    const digest = await sha256File(selectedFile);
    const verifyButton = await screen.findByRole('button', { name: 'Verify and continue' });
    expect(mocks.uploadEvidence).not.toHaveBeenCalled();
    expect(mocks.stepUpStart).toHaveBeenCalledWith('POST', '/api/profiles/current/onboarding/evidence', {
      purpose: 'nin', subject: 'self', operationKey: expect.any(String), previousEvidenceId: 'evidence-tombstone',
      __stepUpFileSha256: digest,
    });
    await userEvent.click(verifyButton);

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith(
      'Private evidence uploaded successfully and is available for selection. KYC approval is a separate step.',
    ));
    expect(mocks.uploadEvidence).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Not Submitted/i)).toBeInTheDocument();
    const stepUpBody = mocks.stepUpStart.mock.calls[0][2] as Record<string, unknown>;
    expect(stepUpBody).toMatchObject({ purpose: 'nin', subject: 'self', previousEvidenceId: 'evidence-tombstone' });
    expect(stepUpBody.__stepUpFileSha256).toBe(digest);
    expect(stepUpBody).not.toHaveProperty('documentKind');
    expect(stepUpBody).not.toHaveProperty('version');
    expect(stepUpBody).not.toHaveProperty('previousEvidenceId', 'older-record-must-not-be-used');
    const uploadForm = mocks.uploadEvidence.mock.calls[0][0] as FormData;
    expect(uploadForm.get('previousEvidenceId')).toBe('evidence-tombstone');
    expect(uploadForm.get('previousEvidenceId')).not.toBe('4');
    expect(uploadForm.get('__stepUpFileSha256')).toBe(digest);
    expect(uploadForm.get('documentKind')).toBeNull();
    expect(uploadForm.getAll('file')).toHaveLength(1);
    expect(screen.queryByRole('dialog', { name: 'Upload private evidence' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Upload a document' }));
    expect(screen.getByLabelText('Purpose')).toHaveValue('');
    expect(screen.getByLabelText('Subject')).toHaveValue('');
    expect(screen.getByLabelText('Document kind')).toHaveValue('');
    expect(document.querySelector<HTMLInputElement>('input[type="file"]')).toHaveValue('');
  }, 15000);

  it('omits previousEvidenceId for the first upload of a purpose and subject', async () => {
    mocks.uploadEvidence.mockResolvedValue({
      id: 'first-nin', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'nin', version: 1,
      previousEvidenceId: null, mimeType: 'application/pdf', size: 100, state: 'available', errorCode: null,
      contentValidatedAt: null, createdAt: '2026-11-11T10:00:00.000Z',
    });
    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Example Landlord' });
    await userEvent.click(screen.getByRole('button', { name: 'Upload a document' }));
    await userEvent.selectOptions(screen.getByLabelText('Purpose'), 'nin');
    await userEvent.selectOptions(screen.getByLabelText('Subject'), 'self');
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error('Evidence file input was not rendered.');
    await userEvent.upload(fileInput, new File(['first private evidence'], 'nin.pdf', { type: 'application/pdf' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue with authenticator' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));

    await waitFor(() => expect(mocks.uploadEvidence).toHaveBeenCalledTimes(1));
    expect(mocks.stepUpStart.mock.calls[0][2]).not.toHaveProperty('previousEvidenceId');
    expect((mocks.uploadEvidence.mock.calls[0][0] as FormData).has('previousEvidenceId')).toBe(false);
  }, 15000);

  it('uploads a complete six-text-field replacement with a matching file-bound challenge', async () => {
    mocks.contract.mockResolvedValue({ ...contract, documentKinds: { nin: ['nin_slip', 'nin_card'] } });
    mocks.evidence.mockResolvedValue({ evidence: [{
      id: 'latest-nin', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'nin_slip', version: 3,
      previousEvidenceId: 'older-nin', mimeType: 'application/pdf', size: 100, state: 'deleted', errorCode: null,
      contentValidatedAt: null, createdAt: '2026-11-11T09:00:00.000Z',
    }], nextCursor: null });
    mocks.uploadEvidence.mockResolvedValue({
      id: 'replacement-nin', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'nin_slip', version: 4,
      previousEvidenceId: 'latest-nin', mimeType: 'application/pdf', size: 100, state: 'available', errorCode: null,
      contentValidatedAt: '2026-11-12T09:00:00.000Z', createdAt: '2026-11-12T09:00:00.000Z',
    });
    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Example Landlord' });
    await userEvent.click(screen.getByRole('button', { name: 'Upload a document' }));
    await userEvent.selectOptions(screen.getByLabelText('Purpose'), 'nin');
    await userEvent.selectOptions(screen.getByLabelText('Subject'), 'self');
    await userEvent.selectOptions(screen.getByLabelText('Document kind'), 'nin_slip');
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error('Evidence file input was not rendered.');
    const selectedFile = new File(['replacement evidence'], 'nin.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, selectedFile);
    await userEvent.click(screen.getByRole('button', { name: 'Continue with authenticator' }));

    const digest = await sha256File(selectedFile);
    expect(mocks.stepUpStart).toHaveBeenCalledWith('POST', '/api/profiles/current/onboarding/evidence', {
      purpose: 'nin', subject: 'self', documentKind: 'nin_slip', operationKey: expect.any(String),
      previousEvidenceId: 'latest-nin', __stepUpFileSha256: digest,
    });
    expect(mocks.uploadEvidence).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));

    await waitFor(() => expect(mocks.uploadEvidence).toHaveBeenCalledTimes(1));
    const upload = mocks.uploadEvidence.mock.calls[0][0] as FormData;
    expect([...upload.keys()]).toEqual(['file', 'purpose', 'subject', 'documentKind', 'operationKey', 'previousEvidenceId', '__stepUpFileSha256']);
    expect(upload.get('file')).toBe(selectedFile);
    expect(upload.get('purpose')).toBe('nin');
    expect(upload.get('subject')).toBe('self');
    expect(upload.get('documentKind')).toBe('nin_slip');
    expect(upload.get('previousEvidenceId')).toBe('latest-nin');
    expect(upload.get('__stepUpFileSha256')).toBe(digest);
    expect(mocks.toastSuccess).toHaveBeenCalledWith(expect.stringContaining('uploaded successfully'));
  }, 15000);

  it('refreshes a version conflict and requires confirmation before rebasing with a new operation key', async () => {
    const oldRecord = { id: 'old-record', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'nin', version: 1,
      previousEvidenceId: null, mimeType: 'application/pdf', size: 100, state: 'available', errorCode: null, contentValidatedAt: null, createdAt: '2026-11-10T10:00:00.000Z' };
    const newestTombstone = { ...oldRecord, id: 'newest-tombstone', version: 2, previousEvidenceId: 'old-record', state: 'deleted', createdAt: '2026-11-11T09:00:00.000Z' };
    mocks.evidence.mockResolvedValueOnce({ evidence: [oldRecord], nextCursor: null }).mockResolvedValueOnce({ evidence: [newestTombstone], nextCursor: null });
    mocks.uploadEvidence
      .mockRejectedValueOnce(new ApiRequestError('Confirm the current evidence version before replacing it.', { status: 409, code: 'CONFLICT_EVIDENCE_VERSION' }))
      .mockResolvedValueOnce({ ...newestTombstone, id: 'replacement', version: 3, previousEvidenceId: 'newest-tombstone', state: 'available' });
    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Example Landlord' });
    await userEvent.click(screen.getByRole('button', { name: 'Upload a document' }));
    await userEvent.selectOptions(screen.getByLabelText('Purpose'), 'nin');
    await userEvent.selectOptions(screen.getByLabelText('Subject'), 'self');
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error('Evidence file input was not rendered.');
    await userEvent.upload(fileInput, new File(['same private evidence'], 'nin.pdf', { type: 'application/pdf' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue with authenticator' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));

    expect(await screen.findByRole('button', { name: 'Confirm current version' })).toBeInTheDocument();
    expect(mocks.uploadEvidence).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm current version' }));
    expect(document.querySelector<HTMLInputElement>('input[type="file"]')?.files?.[0]?.name).toBe('nin.pdf');
    await userEvent.click(screen.getByRole('button', { name: 'Continue with authenticator' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));

    await waitFor(() => expect(mocks.uploadEvidence).toHaveBeenCalledTimes(2));
    const firstBody = mocks.stepUpStart.mock.calls[0][2] as Record<string, unknown>;
    const rebasedBody = mocks.stepUpStart.mock.calls[1][2] as Record<string, unknown>;
    expect(firstBody.previousEvidenceId).toBe('old-record');
    expect(rebasedBody.previousEvidenceId).toBe('newest-tombstone');
    expect(rebasedBody.operationKey).not.toBe(firstBody.operationKey);
    expect((mocks.uploadEvidence.mock.calls[1][0] as FormData).get('previousEvidenceId')).toBe('newest-tombstone');
  }, 15000);

  it('reuses the same operation key and exact replacement metadata after an ambiguous upload result', async () => {
    mocks.evidence.mockResolvedValue({ evidence: [{
      id: 'current-record', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'nin', version: 3,
      previousEvidenceId: null, mimeType: 'application/pdf', size: 100, state: 'available', errorCode: null,
      contentValidatedAt: null, createdAt: '2026-11-11T09:00:00.000Z',
    }], nextCursor: null });
    mocks.uploadEvidence
      .mockRejectedValueOnce(new ApiRequestError('The request timed out. Check the latest server status before retrying; the request may have been processed.'))
      .mockResolvedValueOnce({ id: 'replacement-record', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'nin', version: 4,
        previousEvidenceId: 'current-record', mimeType: 'application/pdf', size: 100, state: 'available', errorCode: null,
        contentValidatedAt: null, createdAt: '2026-11-11T10:00:00.000Z' });
    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Example Landlord' });
    await userEvent.click(screen.getByRole('button', { name: 'Upload a document' }));
    await userEvent.selectOptions(screen.getByLabelText('Purpose'), 'nin');
    await userEvent.selectOptions(screen.getByLabelText('Subject'), 'self');
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error('Evidence file input was not rendered.');
    await userEvent.upload(fileInput, new File(['unchanged payload'], 'nin.pdf', { type: 'application/pdf' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue with authenticator' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/retry only with the same file and details/i);
    expect(mocks.uploadEvidence).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Continue with authenticator' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));
    await waitFor(() => expect(mocks.uploadEvidence).toHaveBeenCalledTimes(2));
    const firstBody = mocks.stepUpStart.mock.calls[0][2] as Record<string, unknown>;
    const retryBody = mocks.stepUpStart.mock.calls[1][2] as Record<string, unknown>;
    expect(retryBody).toEqual(firstBody);
    expect(retryBody.previousEvidenceId).toBe('current-record');
    const firstForm = mocks.uploadEvidence.mock.calls[0][0] as FormData;
    const retryForm = mocks.uploadEvidence.mock.calls[1][0] as FormData;
    expect(retryForm.get('operationKey')).toBe(firstForm.get('operationKey'));
    expect(retryForm.get('previousEvidenceId')).toBe(firstForm.get('previousEvidenceId'));
  }, 15000);

  it.each([
    { code: 'INPUT_EVIDENCE_UPLOAD_INVALID', status: 422, expected: /upload request could not be parsed/i },
    { code: 'DOCUMENT_CONTENT_INVALID', status: 422, expected: /file content or format was rejected.*PDF/i },
    { code: 'DOCUMENT_SIZE_INVALID', status: 413, expected: /file exceeds the allowed size.*976\.56 KiB/i },
  ])('shows safe, code-specific feedback for $code', async ({ code, status, expected }) => {
    mocks.uploadEvidence.mockRejectedValueOnce(new ApiRequestError('Raw multipart parser internals must not be displayed.', { status, code, requestId: 'evidence-request-1' }));
    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Example Landlord' });
    await submitSelectedPrivateEvidence();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(expected);
    expect(alert).toHaveTextContent('Support reference: evidence-request-1');
    expect(alert).not.toHaveTextContent('Raw multipart parser internals');
  }, 15000);

  it('keeps the KYC form and retryable challenge after an invalid authenticator code', async () => {
    mocks.stepUpVerify.mockRejectedValueOnce(new ApiRequestError('The verification code is invalid.', { status: 403, code: 'AUTH_FACTOR_CODE_INVALID' }));
    mocks.uploadEvidence.mockResolvedValue({
      id: 'verified-upload', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'nin', version: 1,
      previousEvidenceId: null, mimeType: 'application/pdf', size: 100, state: 'available', errorCode: null,
      contentValidatedAt: null, createdAt: '2026-11-11T10:00:00.000Z',
    });
    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Example Landlord' });
    await userEvent.click(screen.getByRole('button', { name: 'Upload a document' }));
    await userEvent.selectOptions(screen.getByLabelText('Purpose'), 'nin');
    await userEvent.selectOptions(screen.getByLabelText('Subject'), 'self');
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error('Evidence file input was not rendered.');
    await userEvent.upload(fileInput, new File(['valid supported file bytes'], 'nin.pdf', { type: 'application/pdf' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue with authenticator' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/authenticator code was not accepted/i);
    expect(screen.getByRole('heading', { name: 'Example Landlord' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Upload private profile evidence' })).toBeInTheDocument();
    expect(fileInput.files?.[0]?.name).toBe('nin.pdf');
    expect(mocks.uploadEvidence).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    await waitFor(() => expect(mocks.uploadEvidence).toHaveBeenCalledTimes(1));
    expect(mocks.stepUpVerify).toHaveBeenCalledTimes(2);
  }, 15000);

  it('requires a new file-bound challenge after AUTH_STEP_UP_REQUIRED without an automatic resubmit', async () => {
    mocks.uploadEvidence
      .mockRejectedValueOnce(new ApiRequestError('Confirm this uploaded file with two-step verification.', { status: 403, code: 'AUTH_STEP_UP_REQUIRED' }))
      .mockResolvedValueOnce({
        id: 'verified-after-fresh-challenge', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'nin', version: 1,
        previousEvidenceId: null, mimeType: 'application/pdf', size: 100, state: 'available', errorCode: null,
        contentValidatedAt: null, createdAt: '2026-11-11T10:00:00.000Z',
      });
    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Example Landlord' });
    await submitSelectedPrivateEvidence();

    expect(await screen.findByRole('alert')).toHaveTextContent(/did not match this exact file and its details.*fresh authenticator challenge/i);
    expect(mocks.uploadEvidence).toHaveBeenCalledTimes(1);
    expect(mocks.stepUpStart).toHaveBeenCalledTimes(1);
    const firstBody = mocks.stepUpStart.mock.calls[0][2] as Record<string, unknown>;
    const firstForm = mocks.uploadEvidence.mock.calls[0][0] as FormData;
    expect(firstForm.get('__stepUpFileSha256')).toBe(firstBody.__stepUpFileSha256);

    await userEvent.click(screen.getByRole('button', { name: 'Continue with authenticator' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));
    await waitFor(() => expect(mocks.uploadEvidence).toHaveBeenCalledTimes(2));
    expect(mocks.stepUpStart).toHaveBeenCalledTimes(2);
    expect(mocks.stepUpStart.mock.calls[1][2]).toEqual(firstBody);
  }, 15000);

  it('starts a fresh challenge and operation key when the file or purpose changes', async () => {
    mocks.contract.mockResolvedValue({ ...contract, purposes: ['nin', 'bvn'], documentKinds: {} });
    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Example Landlord' });
    await userEvent.click(screen.getByRole('button', { name: 'Upload a document' }));
    await userEvent.selectOptions(screen.getByLabelText('Purpose'), 'nin');
    await userEvent.selectOptions(screen.getByLabelText('Subject'), 'self');
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error('Evidence file input was not rendered.');
    const firstFile = new File(['first file bytes'], 'nin.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, firstFile);
    await userEvent.click(screen.getByRole('button', { name: 'Continue with authenticator' }));
    await screen.findByRole('dialog', { name: 'Upload private profile evidence' });
    const firstBody = mocks.stepUpStart.mock.calls[0][2] as Record<string, unknown>;

    const changedFile = new File(['different file bytes'], 'nin-replacement.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, changedFile);
    await userEvent.selectOptions(screen.getByLabelText('Purpose'), 'bvn');
    await userEvent.click(screen.getByRole('button', { name: 'Continue with authenticator' }));
    await waitFor(() => expect(mocks.stepUpStart).toHaveBeenCalledTimes(2));
    const changedBody = mocks.stepUpStart.mock.calls[1][2] as Record<string, unknown>;

    expect(changedBody.purpose).toBe('bvn');
    expect(changedBody.operationKey).not.toBe(firstBody.operationKey);
    expect(changedBody.__stepUpFileSha256).toBe(await sha256File(changedFile));
    expect(changedBody.__stepUpFileSha256).not.toBe(firstBody.__stepUpFileSha256);
    expect(mocks.uploadEvidence).not.toHaveBeenCalled();
  }, 15000);

  it('clears the prior profile evidence list when the selected profile changes', async () => {
    const firstProfileRecord = { id: 'profile-one-evidence', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'profile_one_marker', version: 1,
      previousEvidenceId: null, mimeType: 'application/pdf', size: 100, state: 'available', errorCode: null, contentValidatedAt: null, createdAt: '2026-11-11T09:00:00.000Z' };
    mocks.evidence.mockImplementation(async () => ({ evidence: mocks.profileId === 'profile-1' ? [firstProfileRecord] : [], nextCursor: null }));
    const view = render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    expect(await screen.findByText('NIN · Profile One Marker')).toBeInTheDocument();

    mocks.profileId = 'profile-2';
    localStorage.setItem('activeProfileId', 'profile-2');
    mocks.current.mockImplementation((id: string) => Promise.resolve({ profile: { ...profile, id, name: 'Second profile' } }));
    view.rerender(<MemoryRouter><LandlordVerification /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Second profile' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('NIN · Profile One Marker')).not.toBeInTheDocument());
  }, 15000);

  it('shows a normal input for a missing field and saves the first draft using the server version', async () => {
    const emptyDraft = { ...draft, version: 0, values: {}, readiness: { intakeMissing: ['countryOfResidence'] } };
    const savedDraft = { ...emptyDraft, version: 1, values: { countryOfResidence: 'NG' }, readiness: { intakeMissing: [] } };
    mocks.onboarding.mockResolvedValueOnce(emptyDraft).mockResolvedValue(savedDraft);
    mocks.updateOnboarding.mockResolvedValueOnce(savedDraft);

    render(<MemoryRouter><LandlordVerification /></MemoryRouter>);
    const country = await screen.findByRole('textbox', { name: 'Country Of Residence' });
    expect(country).toHaveAttribute('aria-required', 'true');
    expect(screen.getByRole('link', { name: 'Complete profile details' })).toHaveAttribute('href', '#kyc-profile-draft');
    expect(document.getElementById('kyc-profile-draft')).toBeInTheDocument();
    await userEvent.type(country, 'NG');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft with authenticator' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Verify and continue' }));

    await waitFor(() => expect(mocks.updateOnboarding).toHaveBeenCalledWith(
      { expectedVersion: 0, values: { countryOfResidence: 'NG' } },
      'challenge-patch-1',
      'profile-1',
    ));
    expect(await screen.findByText('Saved · version 1')).toBeInTheDocument();
  }, 15000);

  it('saves edits with PATCH-bound step-up, blocks submission while saving, then submits the returned version with a separate POST challenge', async () => {
    mocks.profileKind = 'buyer';
    mocks.profileStructure = 'company';
    mocks.current.mockResolvedValue({ profile: { ...profile, kind: 'buyer', structure: 'company' } });
    const initialDraft = { ...draft, kind: 'buyer', structure: 'company', version: 3, values: { companyName: 'Original Ltd' } };
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
    expect(submission[2]).not.toHaveProperty('identityRoute');
    expect(submission[2]).not.toHaveProperty('identityCountry');
    expect(submission[2]).not.toHaveProperty('identityEvidence');
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
    mocks.profileKind = 'buyer';
    mocks.profileStructure = 'company';
    mocks.current.mockResolvedValue({ profile: { ...profile, kind: 'buyer', structure: 'company' } });
    const initialDraft = { ...draft, kind: 'buyer', structure: 'company', version: 3, values: { companyName: 'Current Ltd' } };
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
