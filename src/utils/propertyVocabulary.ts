import type { CanonicalFieldDictionary, RuntimeCanonicalField } from '../services/canonicalFieldService';

export interface VocabularyOption {
  value: string;
  label: string;
  key?: string;
  definition?: string;
  category?: string;
  group?: string;
  priority?: boolean;
}

export interface VocabularyGroup {
  label: string;
  values: VocabularyOption[];
}

export const effectiveCanonicalValue = (
  entity: { effectiveCanonicalFields?: Record<string, unknown>; canonicalFields?: Record<string, unknown> } | null | undefined,
  key: string,
): unknown => {
  if (Object.prototype.hasOwnProperty.call(entity?.effectiveCanonicalFields ?? {}, key)) return entity?.effectiveCanonicalFields?.[key];
  if (Object.prototype.hasOwnProperty.call(entity?.canonicalFields ?? {}, key)) return entity?.canonicalFields?.[key];
  return undefined;
};

export const formatCanonicalArea = (value: unknown): string => {
  if (value === undefined) return 'Not provided';
  if (value === null) return 'Null (explicit)';
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString()} m²` : 'Unavailable';
};

type DictionaryRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is DictionaryRecord =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const asEntries = (value: unknown): DictionaryRecord[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

/** Read dictionary arrays without supplying a local option fallback. */
export const dictionaryEntries = (dictionary: CanonicalFieldDictionary | null | undefined, key: string): DictionaryRecord[] =>
  dictionary ? asEntries(dictionary.catalogues[key]) : [];

const catalogueLabel = (dictionary: CanonicalFieldDictionary, value: string): string | undefined => {
  for (const candidate of Object.values(dictionary.catalogues)) {
    for (const item of asEntries(candidate)) {
      if ((item.key === value || item.value === value || item.label === value) && typeof item.label === 'string') return item.label;
    }
  }
  return undefined;
};

const optionSource = (field: RuntimeCanonicalField, dictionary: CanonicalFieldDictionary): unknown => {
  if (field.allowedValues !== undefined && field.allowedValues !== null) return field.allowedValues;
  if (typeof field.catalogue === 'string') {
    const catalogue = dictionary.catalogues[field.catalogue];
    if (Array.isArray(catalogue)) return catalogue;
    if (isRecord(catalogue)) {
      if (Array.isArray(catalogue.values)) return catalogue.values;
      if (Array.isArray(catalogue.options)) return catalogue.options;
      if (Array.isArray(catalogue.entries)) return catalogue.entries;
    }
  }
  return [];
};

/**
 * Return only values accepted by this field. For `{key,label}` declarations, the stable key
 * is submitted; raw strings remain byte-for-byte the request value even when a catalogue
 * supplies a friendlier label for them.
 */
export const fieldVocabularyOptions = (
  field: RuntimeCanonicalField | undefined,
  dictionary: CanonicalFieldDictionary | null | undefined,
): VocabularyOption[] => {
  if (!field || !dictionary) return [];
  const source = optionSource(field, dictionary);
  if (!Array.isArray(source)) return [];
  return source.flatMap((item): VocabularyOption[] => {
    if (typeof item === 'string' || typeof item === 'number') {
      const value = String(item);
      return [{ value, label: catalogueLabel(dictionary, value) ?? value }];
    }
    if (!isRecord(item)) return [];
    const value = typeof item.key === 'string' ? item.key : typeof item.value === 'string' ? item.value : undefined;
    if (!value) return [];
    const label = typeof item.label === 'string' ? item.label : catalogueLabel(dictionary, value) ?? value;
    return [{ value, label }];
  });
};

/** Top-level key/label arrays are the source vocabulary; field metadata constrains which values may be submitted. */
export const dictionaryVocabularyOptions = (
  dictionary: CanonicalFieldDictionary | null | undefined,
  listKey: string,
  field?: RuntimeCanonicalField,
): VocabularyOption[] => {
  if (!dictionary) return [];
  const entries = dictionaryEntries(dictionary, listKey);
  if (!field) return entries.flatMap((entry): VocabularyOption[] => {
    if (typeof entry.key !== 'string' || typeof entry.label !== 'string') return [];
    return [{
      value: entry.key,
      key: entry.key,
      label: entry.label,
      ...(typeof entry.definition === 'string' ? { definition: entry.definition } : {}),
      ...(typeof entry.category === 'string' ? { category: entry.category } : {}),
      ...(typeof entry.group === 'string' ? { group: entry.group } : {}),
      ...(typeof entry.priority === 'boolean' ? { priority: entry.priority } : {}),
    }];
  });

  const accepted = fieldVocabularyOptions(field, dictionary);
  return entries.flatMap((entry): VocabularyOption[] => {
    if (typeof entry.key !== 'string' || typeof entry.label !== 'string') return [];
    const requestOption = accepted.find((option) => option.value === entry.key || option.value === entry.label);
    if (!requestOption) return [];
    return [{
      value: requestOption.value,
      key: entry.key,
      label: entry.label,
      ...(typeof entry.definition === 'string' ? { definition: entry.definition } : {}),
      ...(typeof entry.category === 'string' ? { category: entry.category } : {}),
      ...(typeof entry.group === 'string' ? { group: entry.group } : {}),
      ...(typeof entry.priority === 'boolean' ? { priority: entry.priority } : {}),
    }];
  });
};

export const propertyTypesForCategory = (options: readonly VocabularyOption[], categoryKey: string): VocabularyOption[] =>
  options.filter((option) => option.category === categoryKey);

export const vocabularyLabel = (
  dictionary: CanonicalFieldDictionary | null | undefined,
  listKey: string,
  value: unknown,
): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const match = dictionaryEntries(dictionary, listKey).find((item) => item.key === value || item.label === value);
  return typeof match?.label === 'string' ? match.label : undefined;
};

export const fieldVocabularyLabel = (
  dictionary: CanonicalFieldDictionary | null | undefined,
  fieldKey: string,
  value: unknown,
): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const field = dictionary?.fields.find((item) => item.key === fieldKey);
  return fieldVocabularyOptions(field, dictionary).find((option) => option.value === value)?.label;
};

export const amenityGroups = (dictionary: CanonicalFieldDictionary | null | undefined): Array<{
  label: string;
  entries: VocabularyOption[];
}> => groupAmenityCatalogue(dictionary, dictionary ? dictionaryVocabularyOptions(dictionary, 'amenities') : []);

/** Group catalogue labels while enforcing the exact accepted keys for an entity field. */
export const amenityGroupsForField = (
  dictionary: CanonicalFieldDictionary | null | undefined,
  field: RuntimeCanonicalField | null = null,
): Array<{ label: string; entries: VocabularyOption[] }> => {
  if (!dictionary) return [];
  if (!field) return [];
  return groupAmenityCatalogue(dictionary, dictionaryVocabularyOptions(dictionary, 'amenities', field));
};

const groupAmenityCatalogue = (
  dictionary: CanonicalFieldDictionary | null | undefined,
  amenities: VocabularyOption[],
): Array<{ label: string; entries: VocabularyOption[] }> => {
  if (!dictionary) return [];
  return dictionaryEntries(dictionary, 'amenityGroups').flatMap((group) => {
    if (typeof group.label !== 'string' || !Array.isArray(group.entries)) return [];
    const entries = (group.entries as unknown[]).flatMap((entry): VocabularyOption[] => {
      if (!isRecord(entry) || typeof entry.key !== 'string' || typeof entry.label !== 'string') return [];
      const amenity = amenities.find((option) => option.key === entry.key);
      if (!amenity) return [];
      return [{ ...amenity, group: group.label as string, priority: entry.priority === true }];
    });
    return entries.length ? [{ label: group.label, entries }] : [];
  });
};

/** Group field-accepted array values using the current API amenity and milestone groupings. */
export const groupedFieldVocabularyOptions = (
  dictionary: CanonicalFieldDictionary | null | undefined,
  field: RuntimeCanonicalField | undefined,
): VocabularyGroup[] => {
  const options = fieldVocabularyOptions(field, dictionary);
  if (!dictionary || !options.length) return [];
  const milestones = dictionaryEntries(dictionary, 'milestones');
  const milestoneKeys = new Set(milestones.flatMap((item) => typeof item.key === 'string' ? [item.key] : []));
  const milestoneOptions = options.filter((option) => milestoneKeys.has(option.value) || milestoneKeys.has(option.key ?? ''));
  if (milestoneOptions.length) {
    const phases = dictionaryEntries(dictionary, 'milestonePhases').flatMap((phase): VocabularyGroup[] => {
      if (typeof phase.label !== 'string' || !Array.isArray(phase.entries)) return [];
      const values = (phase.entries as unknown[]).flatMap((entry): VocabularyOption[] => {
        if (!isRecord(entry)) return [];
        const option = options.find((candidate) => candidate.value === entry.key || candidate.value === entry.label || candidate.key === entry.key);
        return option ? [{
          ...option,
          ...(typeof entry.key === 'string' ? { key: entry.key } : {}),
          ...(typeof entry.group === 'string' ? { group: entry.group } : {}),
          label: typeof entry.label === 'string' ? entry.label : option.label,
        }] : [];
      });
      return values.length ? [{ label: phase.label, values }] : [];
    });
    const included = new Set(phases.flatMap((group) => group.values.map((item) => item.value)));
    const remaining = options.filter((item) => !included.has(item.value));
    return [...phases, ...(remaining.length ? [{ label: 'Other current choices', values: remaining }] : [])];
  }
  const groups = amenityGroups(dictionary).flatMap((group): VocabularyGroup[] => {
    const values = group.entries.flatMap((entry) => {
      const option = options.find((candidate) => candidate.value === entry.key || candidate.value === entry.label || candidate.key === entry.key);
      return option ? [{ ...option, key: entry.key, label: entry.label, group: group.label, priority: entry.priority === true }] : [];
    });
    return values.length ? [{ label: group.label, values }] : [];
  });
  const included = new Set(groups.flatMap((group) => group.values.map((item) => item.value)));
  const remaining = options.filter((item) => !included.has(item.value));
  return [...groups, ...(remaining.length ? [{ label: 'Other current choices', values: remaining }] : [])];
};

