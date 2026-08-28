import { describe, expect, it } from 'vitest';
import { sellerStructuredFacts, validateStructuredFacts } from './structuredFacts';
describe('structured property facts', () => {
  it('forces ordinary seller provenance without converting legacy area', () => { const result = sellerStructuredFacts({ areas: { buildingSquareMetres: 185.8 }, verification: { status: 'admin_verified', source: 'admin' } }); expect(result.verification).toEqual({ status: 'seller_asserted', source: 'seller' }); expect(result.areas?.buildingSquareMetres).toBe(185.8); });
  it('validates backend numeric limits and renovation chronology', () => { expect(validateStructuredFacts({ yearBuilt: 1700, renovationYear: 1600, floors: 201, parkingSpaces: -1 })).toEqual(expect.objectContaining({ yearBuilt: expect.any(String), renovationYear: expect.any(String), floors: expect.any(String), parkingSpaces: expect.any(String) })); });
  it('accepts explicit unknown enum values', () => { expect(validateStructuredFacts({ condition: 'unknown', roadAccess: 'unknown', tenureClassification: 'unknown' })).toEqual({}); });
});
