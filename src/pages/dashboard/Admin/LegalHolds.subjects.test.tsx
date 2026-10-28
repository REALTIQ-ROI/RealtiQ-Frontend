import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../../lib/axios';
import { stepUpService } from '../../../services/stepUpService';
import { legalHoldService, type LegalHoldSubject } from '../../../services/legalHoldService';
import LegalHolds from './LegalHolds';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  lookupSubjects: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  release: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../services/legalHoldService', () => ({
  legalHoldService: {
    lookupSubjects: mocks.lookupSubjects,
    list: mocks.list,
    get: mocks.get,
    create: mocks.create,
    release: mocks.release,
  },
}));
vi.mock('../../../services/stepUpService', () => ({ stepUpService: { start: vi.fn(), verify: vi.fn() } }));

const accountProfileCategory = {
  category: 'account_profile',
  label: 'Account and profile',
  subjectKinds: [
    { subjectKind: 'account', label: 'Account' },
    { subjectKind: 'profile', label: 'Profile' },
  ],
};
const litigationCategory = {
  category: 'regulatory_litigation',
  label: 'Regulatory and litigation',
  subjectKinds: [{ subjectKind: 'litigation_record', label: 'Litigation record' }],
};
const profileSubject: LegalHoldSubject = {
  subjectId: 'profile-id-exactly-as-returned',
  subjectKind: 'profile',
  category: 'account_profile',
  title: 'Example profile',
  subtitle: 'Developer · Company',
};
const hold = {
  id: 'hold-1',
  subjectKind: 'profile',
  subjectId: profileSubject.subjectId,
  holderId: null,
  profileId: null,
  category: 'account_profile',
  reasonCode: 'regulatory_preservation',
  issuer: 'staff-1',
  createdAt: '2026-10-27T00:00:00.000Z',
  expiresAt: null,
  reviewAt: null,
  state: 'active',
  releaseActor: null,
  releaseReasonCode: null,
  releasedAt: null,
  version: 1,
};

const subjectResponse = (subjects: LegalHoldSubject[] = [profileSubject], nextCursor: string | null = null) => ({
  categories: [accountProfileCategory, litigationCategory],
  subjects,
  nextCursor,
});

const renderLegalHolds = () => render(<MemoryRouter><LegalHolds /></MemoryRouter>);
const createSubjectKindSelect = () => screen.getAllByLabelText('Subject kind')[0];

const chooseProfileKind = async () => {
  await screen.findByRole('option', { name: 'Account and profile' });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'account_profile' } });
  fireEvent.change(createSubjectKindSelect(), { target: { value: 'profile' } });
  await waitFor(() => expect(legalHoldService.lookupSubjects).toHaveBeenCalledWith(
    expect.objectContaining({ category: 'account_profile', subjectKind: 'profile', limit: 25 }),
    expect.any(AbortSignal),
  ));
  await screen.findByRole('option', { name: 'Example profile · Developer · Company' });
};

describe('admin legal-hold subject selector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'staff-token');
    localStorage.setItem('activeProfileId', 'staff-profile');
    mocks.useAuth.mockReturnValue({ token: 'staff-token', activeProfile: { id: 'staff-profile' } });
    mocks.lookupSubjects.mockImplementation(async (query: Record<string, unknown> = {}) => {
      if (!query.category || !query.subjectKind) return subjectResponse([]);
      if (query.subjectKind === 'litigation_record') return subjectResponse([]);
      if (query.q === 'invalid-input') throw new ApiRequestError('Invalid subject query', {
        status: 422,
        code: 'INPUT_LEGAL_HOLD_SUBJECT_QUERY_INVALID',
      });
      if (query.q === 'no-match') return subjectResponse([]);
      if (query.after === 'cursor-page-2') {
        return subjectResponse([
          profileSubject,
          { ...profileSubject, subjectId: 'profile-second-id', title: 'Second profile', subtitle: undefined },
        ]);
      }
      return subjectResponse([profileSubject], query.q ? 'cursor-page-2' : null);
    });
    mocks.list.mockResolvedValue({ holds: [], nextCursor: null });
    mocks.get.mockResolvedValue(hold);
    mocks.create.mockResolvedValue(hold);
    mocks.release.mockResolvedValue(hold);
    vi.mocked(stepUpService.start).mockResolvedValue({
      challengeId: 'legal-hold-challenge',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      method: 'totp',
    });
    vi.mocked(stepUpService.verify).mockResolvedValue(undefined);
  });

  it('uses API-provided category and kind labels, searches with debounce, and follows the opaque cursor', async () => {
    renderLegalHolds();
    await chooseProfileKind();

    const searchInput = screen.getByLabelText('Search subjects');
    fireEvent.change(searchInput, { target: { value: 'E' } });
    fireEvent.change(searchInput, { target: { value: 'Exa' } });
    fireEvent.change(searchInput, { target: { value: 'Exam' } });
    fireEvent.change(searchInput, { target: { value: 'Example' } });
    await waitFor(() => expect(legalHoldService.lookupSubjects).toHaveBeenCalledWith(
      { category: 'account_profile', subjectKind: 'profile', q: 'Example', limit: 25 },
      expect.any(AbortSignal),
    ), { timeout: 2_000 });
    const searchCalls = vi.mocked(legalHoldService.lookupSubjects).mock.calls.filter(([query]) => query?.q === 'Example');
    expect(searchCalls).toHaveLength(1);

    fireEvent.click(await screen.findByRole('button', { name: 'Load more subjects' }));
    await screen.findByRole('option', { name: 'Second profile' });
    expect(legalHoldService.lookupSubjects).toHaveBeenCalledWith(
      { category: 'account_profile', subjectKind: 'profile', q: 'Example', limit: 25, after: 'cursor-page-2' },
      expect.any(AbortSignal),
    );
    const subjectOptions = within(screen.getByLabelText('Subject')).getAllByRole('option');
    expect(subjectOptions.filter((option) => option.textContent?.includes('Example profile'))).toHaveLength(1);
    expect(within(createSubjectKindSelect()).getByRole('option', { name: 'Profile' })).toBeInTheDocument();
  });

  it('clears a selected subject when filters change or a new result set omits it', async () => {
    renderLegalHolds();
    await chooseProfileKind();
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: profileSubject.subjectId } });
    expect(screen.getByLabelText('Subject')).toHaveValue(profileSubject.subjectId);

    fireEvent.change(screen.getByLabelText('Search subjects'), { target: { value: 'no-match' } });
    expect(screen.getByLabelText('Subject')).toHaveValue('');
    expect(await screen.findByText('No selectable subjects of this kind are currently available.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prepare hold with authenticator' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'regulatory_litigation' } });
    expect(createSubjectKindSelect()).toHaveValue('');
    expect(screen.getByText('Select a subject kind in this category.')).toBeInTheDocument();
  });

  it('ignores an older search response after the query changes', async () => {
    let resolveOlderSearch!: (result: ReturnType<typeof subjectResponse>) => void;
    mocks.lookupSubjects.mockImplementation(async (query: Record<string, unknown> = {}) => {
      if (!query.category || !query.subjectKind) return subjectResponse([]);
      if (query.q === 'older') return new Promise((resolve) => { resolveOlderSearch = resolve; });
      if (query.q === 'newer') return subjectResponse([{ ...profileSubject, subjectId: 'newer-result', title: 'Newer result' }]);
      return subjectResponse([profileSubject]);
    });
    renderLegalHolds();
    await chooseProfileKind();

    fireEvent.change(screen.getByLabelText('Search subjects'), { target: { value: 'older' } });
    await waitFor(() => expect(legalHoldService.lookupSubjects).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'older' }), expect.any(AbortSignal),
    ), { timeout: 2_000 });
    fireEvent.change(screen.getByLabelText('Search subjects'), { target: { value: 'newer' } });
    expect(await screen.findByRole('option', { name: /Newer result/ })).toBeInTheDocument();

    resolveOlderSearch(subjectResponse([{ ...profileSubject, subjectId: 'older-result', title: 'Older result' }]));
    await waitFor(() => expect(screen.queryByRole('option', { name: /Older result/ })).not.toBeInTheDocument());
    expect(screen.getByRole('option', { name: /Newer result/ })).toBeInTheDocument();
  });

  it('shows an empty state for litigation_record without substituting another subject kind', async () => {
    renderLegalHolds();
    await screen.findByRole('option', { name: 'Regulatory and litigation' });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'regulatory_litigation' } });
    fireEvent.change(createSubjectKindSelect(), { target: { value: 'litigation_record' } });

    expect(await screen.findByText('No selectable subjects of this kind are currently available.')).toBeInTheDocument();
    expect(legalHoldService.lookupSubjects).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'regulatory_litigation', subjectKind: 'litigation_record' }),
      expect.any(AbortSignal),
    );
    expect(within(createSubjectKindSelect()).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Select a subject kind',
      'Litigation record',
    ]);
  });

  it('shows access denied and session-expiry handling for lookup authorization failures', async () => {
    mocks.lookupSubjects.mockRejectedValueOnce(new ApiRequestError('Forbidden', { status: 403 }));
    renderLegalHolds();
    expect(await screen.findByText(/Access denied\. The current staff profile needs compliance_data_protection authority/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('option', { name: 'Account and profile' })).toBeInTheDocument();

    mocks.lookupSubjects.mockRejectedValueOnce(new ApiRequestError('Expired', { status: 401 }));
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'account_profile' } });
    fireEvent.change(createSubjectKindSelect(), { target: { value: 'profile' } });
    await waitFor(() => expect(screen.getByText('Your session expired. Sign in again to continue.')).toBeInTheDocument());
  });

  it('retains valid category and kind selections after the documented 422 lookup error', async () => {
    renderLegalHolds();
    await chooseProfileKind();
    fireEvent.change(screen.getByLabelText('Search subjects'), { target: { value: 'invalid-input' } });

    expect(await screen.findByText(/The category, subject kind, or search query is invalid/)).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toHaveValue('account_profile');
    expect(createSubjectKindSelect()).toHaveValue('profile');
    expect(screen.getByLabelText('Search subjects')).toHaveValue('invalid-input');
  });

  it('submits the exact returned subject ID through the existing body-bound step-up flow', async () => {
    renderLegalHolds();
    await chooseProfileKind();
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: profileSubject.subjectId } });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare hold with authenticator' }));

    await waitFor(() => expect(stepUpService.start).toHaveBeenCalledWith('POST', '/api/admin/legal-holds', expect.objectContaining({
      subjectKind: 'profile',
      subjectId: 'profile-id-exactly-as-returned',
      category: 'account_profile',
      reasonCode: 'regulatory_preservation',
    })));
    expect(legalHoldService.create).not.toHaveBeenCalled();

    const codeInput = await screen.findByRole('textbox', { name: 'Six-digit authenticator code' });
    fireEvent.change(codeInput, { target: { value: '123456' } });
    const verifyButton = screen.getByRole('button', { name: 'Verify and continue' });
    await waitFor(() => expect(verifyButton).toBeEnabled());
    fireEvent.click(verifyButton);

    await waitFor(() => expect(stepUpService.verify).toHaveBeenCalledWith('legal-hold-challenge', '123456'));
    await waitFor(() => expect(legalHoldService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectKind: 'profile',
        subjectId: 'profile-id-exactly-as-returned',
        category: 'account_profile',
        reasonCode: 'regulatory_preservation',
      }),
      'legal-hold-challenge',
    ));
    expect(stepUpService.verify).toHaveBeenCalledWith('legal-hold-challenge', '123456');
  });
});
