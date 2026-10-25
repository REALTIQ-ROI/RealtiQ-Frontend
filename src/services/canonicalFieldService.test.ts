import { describe, expect, it, vi } from 'vitest';
import { canonicalFieldService, parseCanonicalFieldDictionary } from './canonicalFieldService';
import { canonicalMutationAllowed, reconcileCanonicalFieldRegistry, serializeCanonicalMutationDrafts } from '../utils/canonicalFieldRegistry';

const field = (key: string, dataType: string, target: string, operations: Record<string, boolean>, extra: Record<string, unknown> = {}) => ({
  key, kind: dataType, dataType, level: target, requiredness: 'optional', condition: null, allowedValues: null, catalogue: null,
  entityApplicability: { sourceLevel: target, mutationTargets: [target] }, validationConstraints: { minimum: null, maximum: null },
  editableTargets: [target], mutationOperations: { [target]: operations }, systemOwned: false, transitionManaged: false,
  workflowOperations: [], readOnly: false, visibility: 'owner', ...extra,
});

const fixture = () => parseCanonicalFieldDictionary({
  version: '2026-10-25', categories: ['residential'], propertyTypes: ['apartment'],
  fields: [
    field('gatedEstate', 'boolean', 'property', { set: true }),
    field('commercialFrontage', 'decimal', 'property', { set: true, setNull: true, unset: true }),
    field('availability', 'enum', 'property', { set: false }, { readOnly: true, transitionManaged: true, workflowOperations: ['availability_transition'] }),
  ],
  configuration: { location: { state: 'configured' } },
});

describe('runtime canonical dictionary integration', () => {
  it('parses source catalogues separately from the dictionary version', () => {
    const parsed = fixture();
    expect(parsed.version).toBe('2026-10-25');
    expect(parsed.catalogues).toEqual({ categories: ['residential'], propertyTypes: ['apartment'] });
    expect(parsed.fields).toHaveLength(3);
  });

  it('uses runtime permission metadata and preserves false and zero mutation values', () => {
    const registry = reconcileCanonicalFieldRegistry(fixture());
    expect(canonicalMutationAllowed(registry.find((item) => item.key === 'availability'), 'property', 'set')).toBe(false);
    expect(serializeCanonicalMutationDrafts([
      { field: 'gatedEstate', operation: 'set', rawValue: 'false' },
      { field: 'commercialFrontage', operation: 'set', rawValue: '0' },
    ], registry, 'property').mutations).toEqual([
      { field: 'gatedEstate', operation: 'set', value: false },
      { field: 'commercialFrontage', operation: 'set', value: 0 },
    ]);
    expect(serializeCanonicalMutationDrafts([
      { field: 'availability', operation: 'set', rawValue: 'sold' },
    ], registry, 'property').errors.availability).toContain('not allowed');
  });

  it('keeps set-null, unset, and reset-to-inherit distinct and enforces specialized source shapes', () => {
    const dictionary = parseCanonicalFieldDictionary({
      version: 2,
      fields: [
        field('projectFaqs', 'question_answer_list', 'project', { set: true }),
        field('paymentPlan', 'fee_payer_template', 'project', { set: true, setNull: true, unset: true }),
        field('bedrooms', 'integer', 'project_unit', { set: true, unset: true, resetToInherit: true }, { validationConstraints: { minimum: 0, maximum: 8 } }),
        field('floorLevel', 'floor_level', 'project_unit', { set: true }, { allowedValues: ['Ground', '1', '2'] }),
      ],
      configuration: {},
    });
    const registry = reconcileCanonicalFieldRegistry(dictionary);
    expect(serializeCanonicalMutationDrafts([
      { field: 'paymentPlan', operation: 'set_null', rawValue: '' },
      { field: 'projectFaqs', operation: 'unset', rawValue: '' },
      { field: 'bedrooms', operation: 'reset_to_inherit', rawValue: '' },
    ], registry, 'project').mutations).toEqual([
      { field: 'paymentPlan', operation: 'set_null' },
      { field: 'projectFaqs', operation: 'unset' },
    ]);
    expect(serializeCanonicalMutationDrafts([
      { field: 'bedrooms', operation: 'reset_to_inherit', rawValue: '' },
    ], registry, 'project_unit').mutations).toEqual([{ field: 'bedrooms', operation: 'reset_to_inherit' }]);
    expect(serializeCanonicalMutationDrafts([
      { field: 'projectFaqs', operation: 'set', rawValue: '[{"question":"Viewing hours?","answer":"Ask through the inquiry flow."}]' },
    ], registry, 'project').mutations).toEqual([{ field: 'projectFaqs', operation: 'set', value: [{ question: 'Viewing hours?', answer: 'Ask through the inquiry flow.' }] }]);
    expect(serializeCanonicalMutationDrafts([
      { field: 'projectFaqs', operation: 'set', rawValue: '[{"question":"","answer":"x"}]' },
    ], registry, 'project').errors.projectFaqs).toContain('question/answer');
    expect(serializeCanonicalMutationDrafts([
      { field: 'paymentPlan', operation: 'set', rawValue: '{"payer":"split","buyerPercent":101}' },
    ], registry, 'project').errors.paymentPlan).toContain('split percentage');
    expect(registry.find((item) => item.key === 'floorLevel')).toMatchObject({ kind: 'enum', options: ['Ground', '1', '2'] });
    expect(serializeCanonicalMutationDrafts([
      { field: 'floorLevel', operation: 'set', rawValue: '4' },
    ], registry, 'project_unit').errors.floorLevel).toContain('documented');
  });

  it('caches parsed metadata and clears the cache on request', async () => {
    const api = (await import('../lib/axios')).default;
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: {
      version: 1, fields: [field('gatedEstate', 'boolean', 'property', { set: true })], configuration: {},
    } } as never);
    canonicalFieldService.clearCache();
    await canonicalFieldService.getDictionary();
    await canonicalFieldService.getDictionary();
    expect(get).toHaveBeenCalledTimes(1);
    canonicalFieldService.clearCache();
  });
});
