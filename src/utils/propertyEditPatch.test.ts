import { describe, expect, it } from 'vitest';
import type { Property } from '../types';
import { propertyEditPatch } from './propertyEditPatch';

const property = {
  _id: 'listing-1', title: 'Existing', price: 0, paymentTypes: [], location: 'Lagos', propertyType: 'house',
  bedrooms: 0, bathrooms: 0, squareFeet: 0, description: 'Draft', media: [], status: 'not_released',
  canonicalFields: { gatedEstate: false, houseNumber: '2' },
} as Property;

describe('property edit patch', () => {
  it('omits unchanged fields and empty optional collections', () => {
    expect(propertyEditPatch(property, {
      title: 'Existing', price: 0,
      amenities: [], canonicalFields: {},
    })).toEqual({});
  });

  it('keeps explicit zero, false, and only changed canonical paths', () => {
    expect(propertyEditPatch(property, {
      bedrooms: 0, price: 10,
      canonicalFields: { gatedEstate: false, commercialFrontage: 0 },
    })).toEqual({ price: 10, canonicalFields: { gatedEstate: false, commercialFrontage: 0 } });
  });

  it('never sends form status as an ordinary field edit', () => {
    expect(propertyEditPatch(property, { status: 'sold', title: 'Changed' })).toEqual({ title: 'Changed' });
  });
});
