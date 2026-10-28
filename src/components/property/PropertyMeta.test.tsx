import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Property } from '../../types';
import PropertyMeta from './PropertyMeta';

describe('PropertyMeta', () => {
  it('renders a safe placeholder when square footage is omitted', () => {
    const property = {
      _id: 'property-1',
      title: 'Example property',
      price: 100,
      location: 'Lagos',
      propertyType: 'house',
      bedrooms: 2,
      bathrooms: 1,
      description: 'Example',
      paymentTypes: [],
      media: [],
      status: 'available',
    } as Property;

    render(<PropertyMeta property={property} />);

    expect(screen.getByText('— sq ft')).toBeInTheDocument();
  });
});
