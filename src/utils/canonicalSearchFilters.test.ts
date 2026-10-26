import { describe, expect, it } from 'vitest';
import type { CanonicalFieldDictionary } from '../services/canonicalFieldService';
import { canonicalSearchControls, canonicalSearchQueryValue, canonicalSearchValueFromUrl } from './canonicalSearchFilters';

const field = (key: string, dataType: string, extra: Record<string, unknown> = {}) => ({
  key, kind: dataType, dataType, searchable: true, visibility: 'public only through the eligible projection',
  entityApplicability: { mutationTargets: [] }, validationConstraints: {}, editableTargets: [],
  mutationOperations: {}, systemOwned: false, transitionManaged: false, workflowOperations: [], readOnly: false,
  ...extra,
});

const dictionary = (fields: ReturnType<typeof field>[], catalogues: Record<string, unknown> = {}): CanonicalFieldDictionary => ({ version: 1, fields, configuration: {}, catalogues });

describe('canonical search controls', () => {
  it('exposes only public searchable, non-system fields and respects dictionary catalogues', () => {
    const fields = [
      field('architecturalStyle', 'architectural_style', { catalogue: 'architecturalStyles' }),
      field('unitFeatures', 'multi_enum', { catalogue: 'amenities' }),
      field('rootTitleDeclarations', 'title_declaration_list', { catalogue: 'rootTitleDeclarations' }),
      field('accessRoadConditions', 'multi_enum', { catalogue: 'accessRoadConditions' }),
      field('garageCount', 'integer', { minimum: 0 }),
      field('isFurnished', 'boolean'),
      field('secretEvidence', 'enum', { visibility: 'private vault' }),
      field('derivedRank', 'integer', { readOnly: true }),
      field('listedBy', 'enum', { systemOwned: true }),
      field('notSearchable', 'enum', { searchable: false }),
      field('propertyType', 'enum', { catalogue: 'propertyTypes' }),
    ];
    const controls = canonicalSearchControls(dictionary(fields, { architecturalStyles: ['Modern', 'Classic'], amenities: ['Pool', 'Lift'], rootTitleDeclarations: ['C of O', 'Governor Consent'], accessRoadConditions: ['Tarred', 'Untarred'], propertyTypes: ['house'] }));
    expect(controls.map((control) => control.field.key)).toEqual(['unitFeatures', 'rootTitleDeclarations', 'accessRoadConditions', 'architecturalStyle', 'garageCount', 'isFurnished']);
    expect(controls[0]?.options).toEqual(['Pool', 'Lift']);
    expect(controls[3]?.options).toEqual(['Modern', 'Classic']);
  });

  it('round-trips repeated enum values, zero numeric ranges, and explicit false', () => {
    const controls = canonicalSearchControls(dictionary([
      field('garageCount', 'integer'),
      field('unitFeatures', 'multi_enum', { allowedValues: ['Pool', 'Lift'] }),
      field('isFurnished', 'boolean'),
    ]));
    const params = new URLSearchParams('minGarageCount=0&maxGarageCount=4&unitFeatures=Pool&unitFeatures=Lift&isFurnished=false');
    const byKey = new Map(controls.map((control) => [control.field.key, control]));
    expect(canonicalSearchValueFromUrl(byKey.get('garageCount')!, params)).toEqual(['0', '4']);
    expect(canonicalSearchQueryValue(byKey.get('garageCount')!, ['0', '4'])).toEqual({ minGarageCount: 0, maxGarageCount: 4 });
    expect(canonicalSearchValueFromUrl(byKey.get('unitFeatures')!, params)).toEqual(['Pool', 'Lift']);
    expect(canonicalSearchQueryValue(byKey.get('unitFeatures')!, ['Pool', 'Lift'])).toEqual({ unitFeatures: ['Pool', 'Lift'] });
    expect(canonicalSearchQueryValue(byKey.get('isFurnished')!, 'false')).toEqual({ isFurnished: false });
  });
});
