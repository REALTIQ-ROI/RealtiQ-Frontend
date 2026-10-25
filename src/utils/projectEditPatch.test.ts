import { describe, expect, it } from 'vitest';
import type { ProjectDetail } from '../types';
import { buildProjectEditPatch } from './projectEditPatch';

const current: ProjectDetail = {
  _id: 'project-1', name: 'Palm Court', slug: 'palm-court', projectType: 'estate', status: 'draft',
  description: 'A residential project', shortDescription: 'Palm homes', state: 'Lagos', city: 'Lekki',
  location: {}, totalUnits: 0, availableUnits: 0, isFeatured: false, virtualTourProviderOverride: null,
  amenities: ['Pool'], features: ['Gated'], coordinates: { lat: 6.4, lng: 3.5 }, version: 8,
};

describe('buildProjectEditPatch', () => {
  it('sends only changed fields with the required project version', () => {
    expect(buildProjectEditPatch(current, {
      name: 'Palm Court', projectType: 'estate', description: 'Updated description', shortDescription: 'Palm homes',
      state: 'Lagos', city: 'Lekki', amenities: ['Pool'], features: ['Gated'],
    }, 8)).toEqual({ expectedVersion: 8, description: 'Updated description' });
  });

  it('preserves explicit empty collections, empty strings and zero coordinates as changes', () => {
    expect(buildProjectEditPatch(current, {
      name: 'Palm Court', projectType: 'estate', description: 'A residential project', shortDescription: '',
      state: 'Lagos', city: 'Lekki', amenities: [], features: [], coordinates: { lat: 0, lng: 0 },
    }, 9)).toEqual({ expectedVersion: 9, shortDescription: '', amenities: [], features: [], coordinates: { lat: 0, lng: 0 } });
  });

  it('does not include system-derived developer identity or unchanged empty fields', () => {
    expect(buildProjectEditPatch({ ...current, amenities: undefined, features: undefined }, {
      name: 'Palm Court', developerName: 'Forged name', projectType: 'estate', description: 'A residential project',
      state: 'Lagos', city: 'Lekki', amenities: [], features: [],
    }, 8)).toEqual({ expectedVersion: 8 });
  });

  it('keeps canonical false, zero and empty collection overrides distinct from omission', () => {
    const currentWithCanonical = { ...current, canonicalFields: { gatedEstate: true, projectPin: { lat: 6.4, lng: 3.5 }, accessRoadConditions: ['Tarred'] } };
    expect(buildProjectEditPatch(currentWithCanonical, {
      name: 'Palm Court', projectType: 'estate', description: 'A residential project', state: 'Lagos', city: 'Lekki',
      canonicalFields: { gatedEstate: false, projectPin: { lat: 0, lng: 0 }, accessRoadConditions: [] },
    }, 10)).toEqual({
      expectedVersion: 10,
      canonicalFieldMutations: [
        { field: 'gatedEstate', operation: 'set', value: false },
        { field: 'projectPin', operation: 'set', value: { lat: 0, lng: 0 } },
        { field: 'accessRoadConditions', operation: 'set', value: [] },
      ],
    });
  });
});
