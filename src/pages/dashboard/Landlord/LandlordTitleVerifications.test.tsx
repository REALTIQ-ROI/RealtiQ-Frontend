import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandlordTitleVerifications from './LandlordTitleVerifications';
import { ApiRequestError } from '../../../lib/axios';
import { titleVerificationService } from '../../../services/titleVerificationService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../../components/layout/LandlordPortalLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'owner1', role: 'landlord', name: 'Owner' } }),
}));
vi.mock('../../../contexts/PropertiesContext', () => ({
  useProperties: () => ({
    properties: [{ _id: 'prop1', title: 'Lekki Flat', location: 'Lekki', ownerId: 'owner1', titleVerification: { status: 'not_submitted' } }],
    refreshProperties: vi.fn(),
  }),
}));
vi.mock('../../../services/titleVerificationService', () => ({
  titleVerificationService: {
    listTitleVerifications: vi.fn(),
    submitTitleVerification: vi.fn(),
  },
}));

const service = vi.mocked(titleVerificationService);

describe('LandlordTitleVerifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.listTitleVerifications.mockResolvedValue({ verifications: [] });
  });

  it('validates document ID and keeps state while displaying duplicate hash conflicts neutrally', async () => {
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
    await userEvent.click(screen.getByRole('button', { name: /submit for legal review/i }));
    expect(service.submitTitleVerification).not.toHaveBeenCalled();

    await userEvent.type(screen.getByPlaceholderText(/paste the stored document id/i), 'doc1');
    await userEvent.click(screen.getByRole('button', { name: /submit for legal review/i }));

    await waitFor(() => expect(service.submitTitleVerification).toHaveBeenCalledWith(expect.objectContaining({
      propertyId: 'prop1',
      documentId: 'doc1',
      metadata: { source: 'landlord_dashboard' },
    })));
    expect(await screen.findByText('A matching title-document fingerprint already exists and requires legal review.')).toBeInTheDocument();
    expect(screen.getAllByText(/requires legal review/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/fraud/i)).not.toBeInTheDocument();
  });
});
