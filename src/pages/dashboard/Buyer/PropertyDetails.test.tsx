import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ownershipService } from '../../../services/ownershipService';
import { propertyService } from '../../../services/propertyService';
import { titleDocumentService } from '../../../services/titleDocumentService';
import type { ViewerSession } from '../../../types';
import PropertyDetails from './PropertyDetails';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('../../../components/layout/BuyerPortalLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../../services/ownershipService', () => ({
  ownershipService: { getMyOwnedProperties: vi.fn() },
}));
vi.mock('../../../services/propertyService', () => ({
  propertyService: { getPropertyOwnerDetail: vi.fn() },
}));
vi.mock('../../../services/titleDocumentService', () => ({
  titleDocumentService: {
    openViewer: vi.fn(),
    accessStatus: vi.fn(),
    initializePayment: vi.fn(),
  },
}));

const session: ViewerSession = {
  sessionToken: 'opaque',
  contentUrl: '/api/title-document-viewer/opaque/content',
  expiresAt: '2026-07-24T12:10:00.000Z',
  watermark: {
    heading: 'REALTIQ VERIFIED DOCUMENT',
    viewer: 'Owner',
    access: 'PROPERTY OWNER',
    property: 'RTQ-PROP-1',
    timestamp: '2026-07-24T12:00:00.000Z',
  },
  controls: { download: false, print: false },
};

const ViewerDestination = () => {
  const location = useLocation();
  const state = location.state as { returnPath?: string };
  return <div>Viewer destination {state.returnPath}</div>;
};

describe('purchased property title documents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ownershipService.getMyOwnedProperties).mockResolvedValue([]);
    vi.mocked(propertyService.getPropertyOwnerDetail).mockResolvedValue({
      property: {
        _id: 'prop1',
        publicReference: 'RTQ-PROP-1',
        title: 'Purchased Home',
        price: 100000000,
        location: 'Lekki',
        propertyType: 'house',
        bedrooms: 3,
        bathrooms: 3,
        description: 'Owned property',
        squareFeet: 2500,
        media: [],
        status: 'sold',
      },
      titleDocuments: [{
        _id: 'doc1',
        publicReference: 'RTQ-DOC-1',
        title: 'Survey Plan',
        documentType: 'survey_plan',
        category: 'title_document',
      }],
    });
    vi.mocked(titleDocumentService.openViewer).mockResolvedValue(session);
  });

  it('opens an owned title document directly without access checks or payment', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/buyer/property-details/RTQ-PROP-1']}>
        <Routes>
          <Route path="/dashboard/buyer/property-details/:id" element={<PropertyDetails />} />
          <Route path="/protected-title-viewer" element={<ViewerDestination />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Survey Plan')).toBeInTheDocument();
    expect(screen.getByText(/without another payment/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View title document' }));

    expect(titleDocumentService.openViewer).toHaveBeenCalledWith('doc1');
    expect(titleDocumentService.accessStatus).not.toHaveBeenCalled();
    expect(titleDocumentService.initializePayment).not.toHaveBeenCalled();
    expect(await screen.findByText(/Viewer destination.*dashboard\/buyer\/property-details\/RTQ-PROP-1/i)).toBeInTheDocument();
  });
});
