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
vi.mock('../../../hooks/useCanonicalFieldDictionary', () => ({ useCanonicalFieldDictionary: () => ({ dictionary: { catalogues: { titleDocumentTypes: [{ key: 'c_of_o', label: 'C of O' }] } }, loading: false }) }));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'owner1', role: 'owner', name: 'Owner' }, activeProfile: { id: 'owner-profile' } }),
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
    getFeeOrder: vi.fn(),
    quoteFee: vi.fn(),
    createFeeOrder: vi.fn(),
  },
}));

const service = vi.mocked(titleVerificationService);
const documents = vi.mocked(documentService);

describe('LandlordTitleVerifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.listTitleVerifications.mockResolvedValue({ verifications: [] });
    documents.listPropertyDocuments.mockResolvedValue({
      documents: [{ publicReference: 'RTQ-DOC-00000001', title: 'Certificate of Occupancy', documentType: 'c_of_o' }],
    });
    sessionStorage.setItem('realtiq.titleFeeOrder:owner-profile:prop1', 'order-1');
    service.getFeeOrder.mockResolvedValue({ id: 'order-1', propertyId: 'prop1', ownerProfileId: 'owner-profile', state: 'paid', currency: 'NGN', amountMinor: 10000, serviceFeeMode: 'upfront', paymentId: 'payment-1', paymentReference: 'REF-1', providerSettlementState: 'unconfirmed', verificationId: null, version: 1, createdAt: '2026-11-10T10:00:00.000Z', updatedAt: '2026-11-10T10:00:00.000Z' });
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
    await screen.findByText(/Order status:/);
    await userEvent.selectOptions(screen.getByLabelText(/restricted title document/i), 'RTQ-DOC-00000001');
    await userEvent.click(screen.getByRole('button', { name: /submit for legal review/i }));

    await waitFor(() => expect(service.submitTitleVerification).toHaveBeenCalledWith(expect.objectContaining({
      propertyId: 'prop1',
      documentId: 'RTQ-DOC-00000001',
      feeOrderId: 'order-1',
      metadata: { source: 'title_document_upload' },
    })));
    expect(await screen.findByText('A matching title-document fingerprint already exists and requires legal review.')).toBeInTheDocument();
    expect(screen.getAllByText(/requires legal review/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/fraud/i)).not.toBeInTheDocument();
  });

  it('keeps legal-review submission blocked until the matching fee order is paid', async () => {
    service.getFeeOrder.mockResolvedValueOnce({ id: 'order-1', propertyId: 'prop1', ownerProfileId: 'owner-profile', state: 'pending', currency: 'NGN', amountMinor: 10000, serviceFeeMode: 'upfront', paymentId: 'payment-1', paymentReference: 'REF-1', providerSettlementState: 'unconfirmed', verificationId: null, version: 1, createdAt: '2026-11-10T10:00:00.000Z', updatedAt: '2026-11-10T10:00:00.000Z' });
    render(<MemoryRouter><LandlordTitleVerifications /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: /submit for legal review/i })).toBeDisabled();
    expect(service.submitTitleVerification).not.toHaveBeenCalled();
  });

  it('requires an explicit fee mode before requesting a title quote', async () => {
    sessionStorage.removeItem('realtiq.titleFeeOrder:owner-profile:prop1');
    service.quoteFee.mockRejectedValue(new Error('Policy unavailable'));
    render(<MemoryRouter><LandlordTitleVerifications /></MemoryRouter>);
    const quoteButton = await screen.findByRole('button', { name: 'Get current quote' });
    expect(quoteButton).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText('Service fee mode'), 'deferred');
    expect(quoteButton).toBeEnabled();
    await userEvent.click(quoteButton);
    await waitFor(() => expect(service.quoteFee).toHaveBeenCalledWith({ propertyId: 'prop1', serviceFeeMode: 'deferred' }));
  });
});
