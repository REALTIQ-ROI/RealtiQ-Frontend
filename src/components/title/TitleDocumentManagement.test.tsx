import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { titleDocumentService } from '../../services/titleDocumentService';
import type { ManagedTitleDocument } from '../../types';
import TitleDocumentManagement from './TitleDocumentManagement';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
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
    vi.mocked(titleDocumentService.listManaged).mockResolvedValue([rejected]);
  });

  it('shows rejected history and describes the permitted action as a new version', async () => {
    render(<MemoryRouter><TitleDocumentManagement propertyId="prop1" sold={false} /></MemoryRouter>);
    expect(await screen.findByText('The seal is not legible.', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Submission version 1/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit a new version' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /replace|delete/i })).not.toBeInTheDocument();
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
