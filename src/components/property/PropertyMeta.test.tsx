import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Property } from '../../types';
import PropertyMeta from './PropertyMeta';

vi.mock('../../services/canonicalFieldService', () => ({ canonicalFieldService: { getDictionary: vi.fn().mockResolvedValue(null), clearCache: vi.fn() } }));

describe('PropertyMeta', () => {
  it('uses only the canonical square-metre value and does not relabel legacy square footage', () => {
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

    const areaLabel = screen.getByText('Internal floor area');
    expect(areaLabel.nextElementSibling).toHaveTextContent('Not provided');
    expect(screen.queryByText(/sq ft/i)).not.toBeInTheDocument();
  });
});
