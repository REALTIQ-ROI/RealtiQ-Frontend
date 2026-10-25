import { describe, expect, it } from 'vitest';
import type { CanonicalPropertyMapResponse } from '../services/propertyService';
import { canonicalMapMarkers } from './canonicalMapMarkers';

const common = { bounds: { north: 6.7, south: 6.2, east: 3.7, west: 3.1 }, zoom: 13, total: 1,
  facets: { categories: {} }, sort: 'recommended', page: 1, limit: 50,
  normalization: { queryVersion: 'canonical-v1', query: {}, notices: [] } };

describe('canonical map markers', () => {
  it('uses the public reference and location point without manufacturing a property DTO', () => {
    const response: CanonicalPropertyMapResponse = { ...common, mode: 'properties', truncated: false,
      properties: [{ _id: 'one', publicReference: 'RTQ-ONE', title: 'Home', locationPoint: { type: 'Point', coordinates: [3.35, 6.45] }, canonicalEffectiveFields: { askingPrice: 0, currency: 'NGN' } }] };
    expect(canonicalMapMarkers(response)).toEqual({ skipped: 0, markers: [{ kind: 'property', id: 'one', reference: 'RTQ-ONE', title: 'Home', lat: 6.45, lng: 3.35, label: 'View' }] });
  });

  it('retains server cluster counts and skips unsafe coordinates', () => {
    const response: CanonicalPropertyMapResponse = { ...common, mode: 'clusters', clusters: [
      { clusterId: 'good', lat: 6.4, lng: 3.2, propertyCount: 18 },
      { clusterId: 'bad', lat: 999, lng: 3.2, propertyCount: 2 },
    ] };
    expect(canonicalMapMarkers(response)).toEqual({ skipped: 1, markers: [{ kind: 'cluster', id: 'good', lat: 6.4, lng: 3.2, count: 18 }] });
  });

  it('does not fall back to legacy coordinate fields when canonical locationPoint is missing', () => {
    const response: CanonicalPropertyMapResponse = { ...common, mode: 'properties', truncated: false,
      properties: [{ _id: 'legacy', publicReference: 'RTQ-LEGACY' }] };
    expect(canonicalMapMarkers(response)).toEqual({ skipped: 1, markers: [] });
  });
});
