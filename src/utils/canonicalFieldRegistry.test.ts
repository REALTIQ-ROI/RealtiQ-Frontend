import { describe, expect, it } from 'vitest';
import { canonicalFieldRegistry, getCanonicalFields, inspectCanonicalPresence, parseCanonicalInput, serializeCanonicalChanges } from './canonicalFieldRegistry';

describe('canonical field registry', () => {
  it('keeps documented entity applicability and inheritance rules', () => {
    expect(canonicalFieldRegistry.find((field) => field.key === 'developerProfile')).toBeUndefined();
    expect(getCanonicalFields('unit').find((field) => field.key === 'bedrooms')).toMatchObject({ entities: ['unit'], inherits: true, min: 0 });
    expect(getCanonicalFields('project').find((field) => field.key === 'gatedEstate')?.condition).toBeUndefined();
    expect(getCanonicalFields('project').find((field) => field.key === 'streetAddress')).toMatchObject({ kind: 'text', condition: 'Standard address path' });
    expect(getCanonicalFields('property').find((field) => field.key === 'estateName')?.condition).toContain('gatedEstate');
    expect(getCanonicalFields('project').find((field) => field.key === 'servicedStatus')?.options).toEqual(['Serviced', 'Not Serviced']);
    expect(getCanonicalFields('unit').find((field) => field.key === 'parkingSpaces')).toMatchObject({ kind: 'integer', inherits: true, min: 0 });
    expect(new Set(canonicalFieldRegistry.map((field) => field.key)).size).toBe(canonicalFieldRegistry.length);
  });

  it('validates exact enums, conditional numeric limits, month values, zero, and explicit false', () => {
    const bedrooms = canonicalFieldRegistry.find((field) => field.key === 'bedrooms')!;
    const furnishing = canonicalFieldRegistry.find((field) => field.key === 'furnishing')!;
    const month = canonicalFieldRegistry.find((field) => field.key === 'projectedHandoverMonth')!;
    const date = canonicalFieldRegistry.find((field) => field.key === 'launchDate')!;
    const gated = canonicalFieldRegistry.find((field) => field.key === 'gatedEstate')!;
    expect(parseCanonicalInput(bedrooms, '0')).toEqual({ ok: true, value: 0 });
    expect(parseCanonicalInput(bedrooms, '1.5').ok).toBe(false);
    expect(parseCanonicalInput(furnishing, 'Furnished')).toEqual({ ok: true, value: 'Furnished' });
    expect(parseCanonicalInput(furnishing, 'Unknown').ok).toBe(false);
    expect(parseCanonicalInput(month, '2027-11')).toEqual({ ok: true, value: '2027-11' });
    expect(parseCanonicalInput(month, '2027-13').ok).toBe(false);
    expect(parseCanonicalInput(month, '0000-01').ok).toBe(false);
    expect(parseCanonicalInput(date, '2027-02-31').ok).toBe(false);
    expect(parseCanonicalInput(date, '0000-01-01').ok).toBe(false);
    expect(parseCanonicalInput(date, '2028-02-29')).toEqual({ ok: true, value: '2028-02-29' });
    expect(parseCanonicalInput(gated, 'false')).toEqual({ ok: true, value: false });
    expect(parseCanonicalInput(bedrooms, '   ').ok).toBe(false);
  });

  it('serializes only changed fields while preserving null, empty, zero, false, and empty arrays', () => {
    const current = { nullValue: null, empty: '', zero: 0, flag: true, items: ['x'], unchanged: 'same' };
    expect(serializeCanonicalChanges(current, {
      nullValue: null,
      empty: '',
      zero: 0,
      flag: false,
      items: [],
      unchanged: 'same',
      omitted: undefined,
    })).toEqual({ flag: false, items: [] });
    expect(serializeCanonicalChanges(undefined, { empty: '', nullValue: null, zero: 0, flag: false })).toEqual({ empty: '', nullValue: null, zero: 0, flag: false });
    expect(inspectCanonicalPresence({ explicitNull: null, empty: '', zero: 0, flag: false }, 'absent')).toEqual({ state: 'missing' });
    expect(inspectCanonicalPresence({ explicitNull: null }, 'explicitNull')).toEqual({ state: 'null' });
    expect(inspectCanonicalPresence({ empty: '', zero: 0, flag: false }, 'zero')).toEqual({ state: 'value', value: 0 });
  });
});
