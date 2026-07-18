import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandlordTitleVerifications from './LandlordTitleVerifications';
import { ApiRequestError } from '../../../lib/axios';
import { documentService } from '../../../services/documentService';
import { titleVerificationService } from '../../../services/titleVerificationService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../../components/layout/LandlordPortalLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'owner1', role: 'landlord', name: 'Owner' } }),
}));
vi.mock('../../../contexts/PropertiesContext', () => ({
  useProperties: () => ({
    properties: [{ _id: 'prop1', publicReference: 'RTQ-PROP-00000001', title: 'Lekki Flat', location: 'Lekki', ownerId: 'owner1', titleVerification: { status: 'not_submitted' } }],
    refreshProperties: vi.fn(),
  }),
}));
vi.mock('../../../services/documentService', () => ({
  documentService: {
    listPropertyDocuments: vi.fn(),
    uploadTitleDocument: vi.fn(),
  },
}));
vi.mock('../../../services/titleVerificationService', () => ({
  titleVerificationService: {
    listTitleVerifications: vi.fn(),
    submitTitleVerification: vi.fn(),
  },
}));

const service = vi.mocked(titleVerificationService);
const documents = vi.mocked(documentService);

describe('LandlordTitleVerifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.listTitleVerifications.mockResolvedValue({ verifications: [] });
    documents.listPropertyDocuments.mockResolvedValue({
      documents: [{ publicReference: 'RTQ-DOC-00000001', title: 'Certificate of Occupancy', documentType: 'certificate_of_occupancy' }],
    });
  });

  it('validates title document selection and keeps state while displaying duplicate hash conflicts neutrally', async () => {
    service.submitTitleVerification.mockRejectedValueOnce(
      new ApiRequestError('A matching title-document fingerprint already exists and requires legal review.', {
        status: 409,
        details: {
          riskFlags: [{
            type: 'matching_title_document_other_property',
            severity: 'high',
            message: 'A matching title-document fingerprint already exists on another property and requires legal review.',
          }],
        },
      }),
    );

    render(<MemoryRouter><LandlordTitleVerifications /></MemoryRouter>);

    await screen.findByText(/no title verifications submitted yet/i);
    await screen.findByRole('option', { name: /RTQ-DOC-00000001/i });
    await userEvent.selectOptions(screen.getByLabelText(/restricted title document/i), 'RTQ-DOC-00000001');
    await userEvent.click(screen.getByRole('button', { name: /submit for legal review/i }));

    await waitFor(() => expect(service.submitTitleVerification).toHaveBeenCalledWith(expect.objectContaining({
      propertyId: 'RTQ-PROP-00000001',
      documentId: 'RTQ-DOC-00000001',
      metadata: { source: 'landlord_dashboard' },
    })));
    expect(await screen.findByText('A matching title-document fingerprint already exists and requires legal review.')).toBeInTheDocument();
    expect(screen.getAllByText(/requires legal review/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/fraud/i)).not.toBeInTheDocument();
  });
});
