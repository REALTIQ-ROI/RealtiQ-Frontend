import { describe, expect, it } from 'vitest';
import { propertyRouteReference, type Property } from './index';

describe('propertyRouteReference', () => {
  it('prefers the public reference for stable landlord routes', () => {
    expect(propertyRouteReference({
      _id: 'mongo1',
      id: 'serialized1',
      publicReference: 'RTQ-PROP-1',
    })).toBe('RTQ-PROP-1');
  });

  it('supports API serializers that return id instead of _id', () => {
    const serialized = { id: 'serialized1' } as Property;
    expect(propertyRouteReference(serialized)).toBe('serialized1');
    expect(`/dashboard/landlord/property-details/${propertyRouteReference(serialized)}`).not.toContain('undefined');
  });
});
