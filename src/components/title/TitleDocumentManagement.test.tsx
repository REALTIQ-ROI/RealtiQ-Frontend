import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { titleDocumentService } from '../../services/titleDocumentService';
import type { ManagedTitleDocument } from '../../types';
import TitleDocumentManagement from './TitleDocumentManagement';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const mocks = vi.hoisted(() => ({ stepUp: { begin: vi.fn(), complete: vi.fn(), cancel: vi.fn(), challenge: null, busy: false, error: null } }));
vi.mock('../../hooks/useBoundStepUp', () => ({ useBoundStepUp: () => mocks.stepUp }));
vi.mock('../../utils/titleUploadStepUp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/titleUploadStepUp')>();
  return { ...actual, digestTitleUpload: vi.fn().mockResolvedValue('a'.repeat(64)) };
});
vi.mock('../../services/titleDocumentService', () => ({
  titleDocumentService: {
    listManaged: vi.fn(),
    updatePolicy: vi.fn(),
    analytics: vi.fn(),
    upload: vi.fn(),
    openViewer: vi.fn(),
  },
}));

const rejected: ManagedTitleDocument = {
  id: 'doc1',
  publicReference: 'RTQ-DOC-1',
  documentType: 'survey_plan',
  title: 'Registered Survey Plan',
  verificationStatus: 'rejected',
  verified: false,
  accessMode: 'paid_view_once',
  price: 5000,
  submissionVersion: 1,
  previousDocument: null,
  accessPolicy: { enabled: true, mode: 'paid_view_once', price: 5000 },
  submittedAt: '2026-07-23T10:00:00.000Z',
  rejectionReason: 'The seal is not legible.',
};

describe('TitleDocumentManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.stepUp.begin.mockReset().mockResolvedValue(true);
    vi.mocked(titleDocumentService.listManaged).mockResolvedValue([rejected]);
  });

  it('binds a rejected document resubmission to its file and metadata before upload', async () => {
    render(<MemoryRouter><TitleDocumentManagement propertyId="prop1" sold={false} /></MemoryRouter>);
    expect(await screen.findByText('The seal is not legible.', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Submission version 1/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit a new version' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /replace|delete/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit a new version' }));
    expect(screen.getByRole('button', { name: 'Submit new vault record' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Restricted file'), { target: { files: [new File(['private'], 'title.pdf', { type: 'application/pdf' })] } });
    fireEvent.submit(screen.getByRole('button', { name: 'Submit new vault record' }).closest('form')!);
    await vi.waitFor(() => expect(mocks.stepUp.begin).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      path: '/api/documents/properties/prop1/title-upload',
      body: expect.objectContaining({ documentType: 'survey_plan', title: 'Registered Survey Plan', __stepUpFileSha256: 'a'.repeat(64) }),
    })));
    expect(titleDocumentService.upload).not.toHaveBeenCalled();
  });

  it('locks upload, resubmission, and policy editing after sale while retaining the document', async () => {
    render(<MemoryRouter><TitleDocumentManagement propertyId="prop1" sold /></MemoryRouter>);
    expect(await screen.findByText('Registered Survey Plan')).toBeInTheDocument();
    expect(screen.getByText(/property has been sold/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload a missing type' })).toBeDisabled();
    expect(screen.getByLabelText('Access policy for Registered Survey Plan')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Submit a new version' })).not.toBeInTheDocument();
  });
});
