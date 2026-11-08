import { describe, expect, it } from 'vitest';
import { parseCanonicalFieldDictionary } from '../services/canonicalFieldService';
import { amenityGroups, amenityGroupsForField, dictionaryVocabularyOptions, fieldVocabularyOptions, groupedFieldVocabularyOptions, propertyTypesForCategory } from './propertyVocabulary';

const field = (key: string, allowedValues: unknown) => ({
  key, kind: 'enum', dataType: 'enum', level: 'property', requiredness: 'optional', condition: null,
  allowedValues, catalogue: null, entityApplicability: { sourceLevel: 'property', mutationTargets: ['property'] },
  validationConstraints: {}, editableTargets: ['property'], mutationOperations: { property: { set: true } },
  systemOwned: false, transitionManaged: false, workflowOperations: [], readOnly: false,
});

const dictionary = parseCanonicalFieldDictionary({
  version: 3,
  categories: [{ key: 'flats_apartments', label: 'Flats & Apartments' }, { key: 'houses', label: 'Houses' }],
  propertyTypes: [
    { key: 'flat_standard_apartment', label: 'Flat / Standard Apartment', definition: 'A flat.', category: 'flats_apartments' },
    { key: 'detached_duplex', label: 'Detached Duplex', definition: 'A house.', category: 'houses' },
  ],
  amenities: [{ key: 'swimming_pool', label: 'Swimming Pool', group: 'Leisure', priority: true }],
  fields: [field('category', [{ key: 'flats_apartments', label: 'Flats & Apartments' }, { key: 'houses', label: 'Houses' }]), field('propertyType', ['flat_standard_apartment', 'detached_duplex'])],
  configuration: {},
});

describe('shared property vocabulary', () => {
  it('uses field accepted values while showing source labels and helper descriptions', () => {
    const categories = dictionaryVocabularyOptions(dictionary, 'categories', dictionary.fields.find((item) => item.key === 'category'));
    const types = dictionaryVocabularyOptions(dictionary, 'propertyTypes', dictionary.fields.find((item) => item.key === 'propertyType'));
    expect(categories).toEqual([{ value: 'flats_apartments', key: 'flats_apartments', label: 'Flats & Apartments' }, { value: 'houses', key: 'houses', label: 'Houses' }]);
    expect(propertyTypesForCategory(types, 'flats_apartments')).toMatchObject([{ value: 'flat_standard_apartment', label: 'Flat / Standard Apartment', definition: 'A flat.' }]);
    expect(fieldVocabularyOptions(dictionary.fields[1], dictionary).map(({ value, label }) => [value, label])).toEqual([
      ['flat_standard_apartment', 'Flat / Standard Apartment'], ['detached_duplex', 'Detached Duplex'],
    ]);
  });

  it('preserves exact raw-string accepted values even when a dictionary key has another label', () => {
    const exact = parseCanonicalFieldDictionary({
      version: 3,
      buildStages: [{ key: 'off_plan', label: 'Off-plan' }],
      fields: [field('buildStage', ['Off-plan'])],
      configuration: {},
    });
    expect(fieldVocabularyOptions(exact.fields[0], exact)).toEqual([{ value: 'Off-plan', label: 'Off-plan' }]);
  });

  it('retains API amenity group order and priority flags', () => {
    const grouped = parseCanonicalFieldDictionary({
      version: 3,
      amenities: [
        { key: 'boys_quarters', label: 'Boys’ Quarters (BQ)', group: 'Space & Layout', priority: true },
        { key: 'swimming_pool', label: 'Swimming Pool', group: 'Estate Security, Leisure & Site', priority: false },
      ],
      amenityGroups: [
        { label: 'Space & Layout', entries: [{ key: 'boys_quarters', label: 'Boys’ Quarters (BQ)', priority: true }] },
        { label: 'Estate Security, Leisure & Site', entries: [{ key: 'swimming_pool', label: 'Swimming Pool', priority: false }] },
      ],
      fields: [field('amenityKeys', ['boys_quarters', 'swimming_pool'])],
      configuration: {},
    });
    expect(amenityGroups(grouped).map((group) => [group.label, group.entries[0]?.label, group.entries[0]?.priority])).toEqual([
      ['Space & Layout', 'Boys’ Quarters (BQ)', true],
      ['Estate Security, Leisure & Site', 'Swimming Pool', false],
    ]);
    expect(groupedFieldVocabularyOptions(grouped, grouped.fields[0])).toEqual([
      { label: 'Space & Layout', values: [{ value: 'boys_quarters', key: 'boys_quarters', label: 'Boys’ Quarters (BQ)', group: 'Space & Layout', priority: true }] },
      { label: 'Estate Security, Leisure & Site', values: [{ value: 'swimming_pool', key: 'swimming_pool', label: 'Swimming Pool', group: 'Estate Security, Leisure & Site', priority: false }] },
    ]);
  });

  it('limits entity amenity selectors to values accepted by that field', () => {
    const restricted = parseCanonicalFieldDictionary({
      version: 3,
      amenities: [
        { key: 'boys_quarters', label: 'Boys’ Quarters (BQ)', group: 'Space & Layout', priority: true },
        { key: 'swimming_pool', label: 'Swimming Pool', group: 'Leisure', priority: false },
      ],
      amenityGroups: [
        { label: 'Space & Layout', entries: [{ key: 'boys_quarters', label: 'Boys’ Quarters (BQ)', priority: true }] },
        { label: 'Leisure', entries: [{ key: 'swimming_pool', label: 'Swimming Pool', priority: false }] },
      ],
      fields: [field('amenities', ['swimming_pool'])],
      configuration: {},
    });
    expect(amenityGroupsForField(restricted, restricted.fields[0])).toEqual([
      { label: 'Leisure', entries: [{ value: 'swimming_pool', key: 'swimming_pool', label: 'Swimming Pool', group: 'Leisure', priority: false }] },
    ]);
  });

  it('groups milestones in the source phase order and submits exact field values', () => {
    const grouped = parseCanonicalFieldDictionary({
      version: 3,
      milestones: [
        { key: 'foundation_footing', label: 'Foundation Footing', phase: 'Site Preparation & Substructure' },
        { key: 'handover', label: 'Handover', phase: 'Commissioning, External Works & Handover' },
      ],
      milestonePhases: [
        { label: 'Site Preparation & Substructure', entries: [{ key: 'foundation_footing', label: 'Foundation Footing' }] },
        { label: 'Commissioning, External Works & Handover', entries: [{ key: 'handover', label: 'Handover' }] },
      ],
      fields: [field('projectMilestones', ['foundation_footing', 'handover'])],
      configuration: {},
    });
    expect(groupedFieldVocabularyOptions(grouped, grouped.fields[0])).toEqual([
      { label: 'Site Preparation & Substructure', values: [{ value: 'foundation_footing', key: 'foundation_footing', label: 'Foundation Footing' }] },
      { label: 'Commissioning, External Works & Handover', values: [{ value: 'handover', key: 'handover', label: 'Handover' }] },
    ]);
  });
});
