import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManageKyc from './KycManagement';

const mocks = vi.hoisted(() => ({
  staffQueue: vi.fn(),
  staffCase: vi.fn(),
  staffHistory: vi.fn(),
  staffEvidenceContent: vi.fn(),
  claimCase: vi.fn(),
  decideCase: vi.fn(),
  begin: vi.fn(),
  complete: vi.fn(),
  cancel: vi.fn(),
  stepUpErrorCode: vi.fn(),
}));

vi.mock('../../../components/layout/AdminLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('../../../hooks/useBoundStepUp', () => ({ useBoundStepUp: () => ({
  begin: mocks.begin,
  complete: mocks.complete,
  cancel: mocks.cancel,
  challenge: null,
  busy: false,
  error: null,
  errorCode: mocks.stepUpErrorCode(),
}) }));
vi.mock('../../../components/auth/StepUpDialog', () => ({ default: ({ onSubmit }: { onSubmit: (code: string) => Promise<boolean> }) => <button type="button" onClick={() => void onSubmit('123456')}>Complete decision step-up</button> }));
vi.mock('../../../services/verificationCaseService', () => ({
  verificationDecisionSources: ['original_document', 'official_registry', 'approved_provider'],
  verificationCaseService: {
    staffQueue: mocks.staffQueue,
    staffCase: mocks.staffCase,
    staffHistory: mocks.staffHistory,
    staffEvidenceContent: mocks.staffEvidenceContent,
    claimCase: mocks.claimCase,
    decideCase: mocks.decideCase,
  },
}));

const queueCase = { id: 'case-1', kind: 'company_buyer', structure: 'company', state: 'under_review', version: 4, profileId: 'profile-1' };
const detail = {
  ...queueCase,
  draftVersion: 2,
  rejectionCodes: [],
  submittedAt: '2026-11-01T10:00:00.000Z',
  reviewedAt: null,
  expiresAt: null,
  snapshot: {
    values: { countryOfResidence: 'Nigeria' },
    people: [],
    applicant: { identityId: 'profile-1', name: 'Applicant Example' },
    identity: {
      route: 'nigerian',
      country: 'NG',
      evidence: [{ purpose: 'nin', evidenceId: 'nin-evidence-1' }],
    },
  },
  requiredChecks: ['evidence.company_registration', 'companyBuyer.scuml'],
  approvalBlockers: [],
};

const chooseCase = async () => {
  await userEvent.click(await screen.findByRole('button', { name: /case-1/ }));
  await screen.findByRole('heading', { name: 'Applicant information' });
};

describe('ManageKyc current decision contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.staffQueue.mockResolvedValue({ cases: [queueCase], nextCursor: null });
    mocks.staffCase.mockResolvedValue(detail);
    mocks.staffHistory.mockResolvedValue({ events: [], nextCursor: null });
    mocks.staffEvidenceContent.mockResolvedValue(new Blob(['protected evidence'], { type: 'application/pdf' }));
    mocks.begin.mockResolvedValue(true);
    mocks.stepUpErrorCode.mockReturnValue(null);
    mocks.decideCase.mockResolvedValue({ ...detail, state: 'approved', version: 5 });
    mocks.complete.mockImplementation(async () => {
      const action = mocks.begin.mock.calls.at(-1)?.[0];
      return { ok: true, value: await action.execute('decision-challenge', action.body) };
    });
  });

  it('uses fixed source choices, optional actual expiry, and server-required SCUML applicability in the bound decision body', async () => {
    render(<ManageKyc />);
    await chooseCase();
    const sourceSelects = [
      screen.getByLabelText('Decision source for evidence.company_registration'),
      screen.getByLabelText('Decision source for companyBuyer.scuml'),
    ];
    expect(within(sourceSelects[0]).queryByRole('option', { name: 'original document' })).not.toBeInTheDocument();
    expect(within(sourceSelects[0]).getByRole('option', { name: 'Official registry' })).toBeInTheDocument();
    expect(within(sourceSelects[0]).getByRole('option', { name: 'Approved provider' })).toBeInTheDocument();
    await userEvent.selectOptions(sourceSelects[0], 'official_registry');
    await userEvent.type(screen.getAllByLabelText(/Private supporting reference/)[0], 'registration-evidence-ref');

    await userEvent.click(screen.getByText(/Additional applicant and case checks/));
    await userEvent.selectOptions(sourceSelects[1], 'original_document');
    await userEvent.type(screen.getAllByLabelText(/Private supporting reference/)[1], 'scuml-certificate-ref');
    await userEvent.selectOptions(screen.getByLabelText('SCUML applicability'), 'required');
    expect(screen.getByText(/Both options require a private supporting reference/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Approve KYC with authenticator' }));
    const expectedBody = {
      expectedVersion: 4,
      decision: 'approved',
      checks: [
        { field: 'evidence.company_registration', source: 'official_registry', reference: 'registration-evidence-ref' },
        { field: 'companyBuyer.scuml', source: 'original_document', reference: 'scuml-certificate-ref', applicability: 'required' },
      ],
    };
    await waitFor(() => expect(mocks.begin).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST', path: '/api/admin/verification-cases/case-1/decision', body: expectedBody,
    })));
    await userEvent.click(screen.getByRole('button', { name: 'Complete decision step-up' }));
    await waitFor(() => expect(mocks.decideCase).toHaveBeenCalledWith('case-1', expectedBody, 'decision-challenge'));
  }, 15000);

  it('explains the backend expiry-required response without offering a non-expiring field', async () => {
    mocks.complete.mockResolvedValue({ ok: false, error: 'Expiry is required. (REVIEW_VERIFICATION_EXPIRY_REQUIRED)' });
    mocks.staffCase.mockResolvedValue({ ...detail, requiredChecks: ['evidence.nin'] });
    render(<ManageKyc />);
    await chooseCase();
    expect(screen.getByLabelText(/Document expiry date/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/non-expiring/i)).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Decision source for evidence.nin'), 'original_document');
    await userEvent.type(screen.getByLabelText(/Private supporting reference/), 'nin-evidence-ref');
    await userEvent.click(screen.getByRole('button', { name: 'Approve KYC with authenticator' }));
    await userEvent.click(screen.getByRole('button', { name: 'Complete decision step-up' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No non-expiring exception is currently configured.');
  });

  it('shows applicant details and linked uploaded evidence in a readable form instead of raw JSON', async () => {
    render(<ManageKyc />);
    await chooseCase();

    expect(screen.getByRole('heading', { name: 'Applicant Example' })).toBeInTheDocument();
    expect(screen.getByText('Submitted country of residence')).toBeInTheDocument();
    expect(screen.getByText('Nigeria')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Private evidence' })).toHaveLength(2);
    expect(screen.getByText('National identity number (NIN)')).toBeInTheDocument();
    expect(screen.queryByText('Authorized case snapshot')).not.toBeInTheDocument();
    expect(screen.queryByText(/"countryOfResidence"/)).not.toBeInTheDocument();
  });

  it('opens case-linked evidence through the protected staff evidence route', async () => {
    const createObjectURL = vi.fn(() => 'blob:protected-case-file');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    render(<ManageKyc />);
    await chooseCase();

    await userEvent.click(screen.getAllByRole('button', { name: 'View document' })[0]);

    await waitFor(() => expect(mocks.staffEvidenceContent).toHaveBeenCalledWith('case-1', 'nin-evidence-1'));
    expect(await screen.findByRole('dialog', { name: 'Protected case evidence' })).toBeInTheDocument();
    expect(screen.getByText('The content was retrieved through the authorized case evidence route.')).toBeInTheDocument();
  });

  it('counts submitted document checks separately from additional server-required applicant checks', async () => {
    const evidence = [
      { purpose: 'nin', evidenceId: 'evidence-nin' },
      { purpose: 'bvn', evidenceId: 'evidence-bvn' },
      { purpose: 'additional_government_id', evidenceId: 'evidence-id' },
      { purpose: 'proof_of_address', evidenceId: 'evidence-address' },
    ];
    mocks.staffCase.mockResolvedValue({
      ...detail,
      snapshot: { ...detail.snapshot, identity: { route: 'nigerian', country: 'NG', evidence } },
      requiredChecks: [
        'countryOfResidence',
        'applicant.identity_route',
        'applicant.country_of_residence',
        ...evidence.map((item) => `evidence.${item.evidenceId}`),
      ],
    });
    render(<ManageKyc />);
    await chooseCase();

    expect(screen.getByRole('heading', { name: 'Document checks' })).toBeInTheDocument();
    expect(screen.getByText('4 documents')).toBeInTheDocument();
    const additionalChecks = screen.getByText(/Additional applicant and case checks/);
    expect(additionalChecks).toHaveTextContent('3');
    await userEvent.click(additionalChecks);
    expect(screen.getByLabelText('Decision source for countryOfResidence')).toBeVisible();
  });

  it('explains that submitted cases must be claimed before approval and offers the claim action', async () => {
    mocks.staffCase.mockResolvedValue({ ...detail, state: 'submitted' });
    render(<ManageKyc />);
    await chooseCase();

    expect(screen.getByRole('button', { name: 'Approve KYC with authenticator' })).toBeDisabled();
    expect(screen.getByText(/Claim this case with your authenticator first/)).toBeInTheDocument();
    const claimButton = screen.getByRole('button', { name: 'Claim case to begin review with authenticator' });
    expect(claimButton).toBeEnabled();
    await userEvent.click(claimButton);

    expect(mocks.begin).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      path: '/api/admin/verification-cases/case-1/claim',
      body: { expectedVersion: 4 },
    }));
  });

  it('explains when a document expiry entered by the reviewer is no longer in the future', async () => {
    mocks.staffCase.mockResolvedValue({ ...detail, requiredChecks: ['evidence.nin-evidence-1'] });
    render(<ManageKyc />);
    await chooseCase();
    await userEvent.selectOptions(screen.getByLabelText('Decision source for evidence.nin-evidence-1'), 'original_document');
    await userEvent.type(screen.getByLabelText(/Private supporting reference/), 'nin-reference');
    fireEvent.change(screen.getByLabelText(/Document expiry date/), { target: { value: '2000-01-01T12:12' } });

    expect(screen.getByRole('button', { name: 'Approve KYC with authenticator' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Enter a future expiry date from the document for National identity number (NIN).');
  });
});
