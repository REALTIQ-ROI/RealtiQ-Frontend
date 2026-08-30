import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { titleDocumentService } from '../../services/titleDocumentService';
import PublicTitleDocuments from './PublicTitleDocuments';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../../services/titleDocumentService', () => ({
  titleDocumentService: {
    listPublic: vi.fn(),
    accessStatus: vi.fn(),
    initializePayment: vi.fn(),
    persistPendingPayment: vi.fn(),
    openViewer: vi.fn(),
  },
}));

describe('PublicTitleDocuments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not offer checkout for private, unverified, or revoked documents', async () => {
    vi.mocked(titleDocumentService.listPublic).mockResolvedValue([
      { id: 'private', documentType: 'survey_plan', title: 'Private survey', verificationStatus: 'published', verified: true, accessMode: 'private', price: null },
      { id: 'pending', documentType: 'gazette', title: 'Pending gazette', verificationStatus: 'pending', verified: false, accessMode: 'paid_view_once', price: 5000 },
      { id: 'revoked', documentType: 'deed_of_assignment', title: 'Revoked deed', verificationStatus: 'revoked', verified: false, accessMode: 'paid_view_multiple', price: 5000 },
    ]);
    render(<MemoryRouter><PublicTitleDocuments propertyId="prop1" /></MemoryRouter>);
    expect(await screen.findByText('Private survey')).toBeInTheDocument();
    expect(screen.getAllByText('Not available for viewing.')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Pay .* to view/i })).not.toBeInTheDocument();
    expect(titleDocumentService.accessStatus).not.toHaveBeenCalled();
  });

  it('renders the backend price and keeps paid, unviewed access ready after reload', async () => {
    vi.mocked(titleDocumentService.listPublic).mockResolvedValue([
      { id: 'doc1', documentType: 'survey_plan', title: 'Survey', verificationStatus: 'published', verified: true, accessMode: 'paid_view_once', price: 5000 },
    ]);
    vi.mocked(titleDocumentService.accessStatus).mockResolvedValue({
      hasAccess: true,
      paymentRequired: false,
      price: 5000,
      mode: 'view_once',
      viewed: false,
      remainingViews: 1,
    });
    render(<MemoryRouter><PublicTitleDocuments propertyId="prop1" /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: 'Open protected viewer' })).toBeInTheDocument();
    expect(screen.getByText(/₦5,000 set by RealtIQ/i)).toBeInTheDocument();
    expect(titleDocumentService.initializePayment).not.toHaveBeenCalled();
    expect(titleDocumentService.openViewer).not.toHaveBeenCalled();
  });

  it('links a published document registry ID for visitors and buyers', async () => {
    vi.mocked(titleDocumentService.listPublic).mockResolvedValue([
      {
        id: 'doc1',
        publicReference: 'RTQ-DOC-1',
        documentType: 'survey_plan',
        title: 'Survey',
        verificationStatus: 'published',
        verified: true,
        accessMode: 'private',
        price: null,
      },
    ]);

    render(
      <MemoryRouter>
        <PublicTitleDocuments
          propertyId="prop1"
          registryReferences={[
            {
              publicReference: 'RTQ-DOC-1',
              documentType: 'survey_plan',
              verificationStatus: 'published',
              publicVerificationId: 'RTQ-TV-2026-000001',
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('link', { name: 'RTQ-TV-2026-000001' }),
    ).toHaveAttribute('href', '/title-verification/RTQ-TV-2026-000001');
  });
});
