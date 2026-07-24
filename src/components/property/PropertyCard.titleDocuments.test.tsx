import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { titleDocumentService } from '../../services/titleDocumentService';
import type { Property } from '../../types';
import PropertyCard from './PropertyCard';

vi.mock('../../services/titleDocumentService', () => ({
  titleDocumentService: { listPublic: vi.fn() },
}));

const property: Property = {
  _id: 'property-1',
  publicReference: 'RTQ-PROP-1',
  title: 'Three-document home',
  price: 75_000_000,
  paymentTypes: ['outright', 'installment'],
  location: 'Lekki, Lagos',
  propertyType: 'house',
  bedrooms: 4,
  bathrooms: 4,
  description: 'A property with independently reviewed title documents.',
  squareFeet: 3000,
  media: [],
  status: 'available',
  titleVerification: { status: 'pending' },
  titleDocumentReferences: [
    { documentType: 'survey_plan', verificationStatus: 'published' },
    { documentType: 'certificate_of_occupancy', verificationStatus: 'approved' },
    { documentType: 'deed_of_assignment', verificationStatus: 'pending' },
  ],
};

describe('PropertyCard title-document summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the verified document count for mixed statuses', () => {
    render(
      <MemoryRouter>
        <PropertyCard property={property} />
      </MemoryRouter>,
    );

    expect(screen.getByText('2 of 3 Title Documents Verified')).toBeInTheDocument();
    expect(screen.queryByText('Title Document Not Verified')).not.toBeInTheDocument();
  });

  it('loads safe document metadata when the property list omits document references', async () => {
    vi.mocked(titleDocumentService.listPublic).mockResolvedValue([
      {
        id: 'doc-1',
        documentType: 'survey_plan',
        title: 'Survey Plan',
        verificationStatus: 'published',
        verified: true,
        accessMode: 'paid_view_once',
        price: 5000,
      },
      {
        id: 'doc-2',
        documentType: 'certificate_of_occupancy',
        title: 'Certificate of Occupancy',
        verificationStatus: 'approved',
        verified: true,
        accessMode: 'paid_view_multiple',
        price: 5000,
      },
      {
        id: 'doc-3',
        documentType: 'deed_of_assignment',
        title: 'Deed of Assignment',
        verificationStatus: 'pending',
        verified: false,
        accessMode: 'private',
        price: null,
      },
    ]);

    render(
      <MemoryRouter>
        <PropertyCard property={{ ...property, titleDocumentReferences: undefined }} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('2 of 3 Title Documents Verified')).toBeInTheDocument();
    expect(titleDocumentService.listPublic).toHaveBeenCalledWith('RTQ-PROP-1');
  });
});
