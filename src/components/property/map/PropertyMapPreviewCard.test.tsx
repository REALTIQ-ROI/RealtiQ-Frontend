import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PropertyMapPreviewCard from './PropertyMapPreviewCard';
import type { Property } from '../../../types';

vi.mock('../../../hooks/useCanonicalFieldDictionary', () => ({
  useCanonicalFieldDictionary: () => ({ dictionary: { fields: [], catalogues: {}, configuration: {} } }),
}));
vi.mock('../MediaPreview', () => ({ default: () => <div aria-hidden="true" /> }));

const makeProperty = (canonicalFields: Record<string, unknown> = {}): Property => ({
  _id: 'property-1', title: 'Map listing', price: 0, currency: 'NGN', location: 'Lagos', propertyType: 'unknown-type',
  bedrooms: 0, bathrooms: 0, description: '', paymentTypes: [], media: [], status: 'available', canonicalFields,
});

const renderPreview = (property: Property) => render(
  <MemoryRouter>
    <PropertyMapPreviewCard property={property} detailsPath={() => '/properties/property-1'} onClose={vi.fn()} />
  </MemoryRouter>,
);

describe('PropertyMapPreviewCard canonical display semantics', () => {
  it('shows POA instead of the numeric amount and preserves explicit zero room counts', () => {
    renderPreview(makeProperty({ priceOnApplication: true }));

    expect(screen.getByText('Price on application')).toBeInTheDocument();
    expect(screen.getByText('0 beds · 0 baths')).toBeInTheDocument();
  });

  it('shows a numeric zero price when POA is explicitly false', () => {
    renderPreview(makeProperty({ priceOnApplication: false }));
    expect(screen.getByText(/₦\s?0/)).toBeInTheDocument();
  });
});
