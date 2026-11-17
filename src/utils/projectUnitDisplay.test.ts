import { describe, expect, it } from 'vitest';
import type { Property } from '../types';
import { groupProjectUnits, readProjectUnitDisplayMode } from './projectUnitDisplay';

const property = (id: string, unitTypeName?: string): Property => ({
  _id: id,
  title: `Unit ${id}`,
  price: 0,
  location: 'Lagos',
  propertyType: 'two_bedroom_flat',
  bedrooms: 2,
  bathrooms: 2,
  description: '',
  paymentTypes: [],
  media: [],
  status: 'available',
  ...(unitTypeName ? { canonicalEffectiveFields: { unitTypeName } } : {}),
});

describe('public project unit display', () => {
  it('reads only the documented developer-selected display keys', () => {
    expect(readProjectUnitDisplayMode({ canonicalFields: { unitDisplayMode: 'grouped_by_unit_type' } })).toBe('grouped_by_unit_type');
    expect(readProjectUnitDisplayMode({ canonicalFields: { unitDisplayMode: 'Grouped by unit type' } })).toBeNull();
    expect(readProjectUnitDisplayMode(null)).toBeNull();
  });

  it('groups public units by the returned effective unit type name', () => {
    const groups = groupProjectUnits([
      property('a', 'Two-bedroom apartments'),
      property('b', 'Two-bedroom apartments'),
      property('c', 'Penthouses'),
    ], 'grouped_by_unit_type');

    expect(groups.map(({ label, properties: rows }) => [label, rows.map((row) => row._id)])).toEqual([
      ['Two-bedroom apartments', ['a', 'b']],
      ['Penthouses', ['c']],
    ]);
  });

  it('keeps units individual when that is the returned mode or the type label is absent', () => {
    expect(groupProjectUnits([property('a'), property('b')], 'individual_units')).toEqual([
      { key: 'individual-units', label: null, properties: [property('a'), property('b')] },
    ]);
    expect(groupProjectUnits([property('a')], 'grouped_by_unit_type')[0]).toMatchObject({ label: 'Unit type details unavailable' });
  });
});
