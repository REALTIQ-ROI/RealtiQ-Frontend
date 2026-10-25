import api from '../lib/axios';

export type CanonicalMutationTarget = 'property' | 'project' | 'unit_type' | 'project_unit';
export type CanonicalMutationOperation = 'set' | 'set_null' | 'unset' | 'reset_to_inherit';

export interface CanonicalMutationAvailability {
  set?: boolean;
  setNull?: boolean;
  unset?: boolean;
  resetToInherit?: boolean;
}

export interface RuntimeCanonicalField {
  key: string;
  kind: string;
  dataType: string;
  level?: string;
  requiredness?: string;
  condition?: string | null;
  allowedValues?: unknown;
  catalogue?: unknown;
  minimum?: number | null;
  maximum?: number | null;
  nullableWhen?: unknown;
  unit?: string | null;
  nullMeaning?: string;
  zeroMeaning?: string;
  unsetMeaning?: string;
  inheritance?: string;
  publication?: string;
  searchable?: boolean;
  searchUse?: string | null;
  visibility?: string;
  importable?: boolean;
  entityApplicability: { sourceLevel?: string; mutationTargets: CanonicalMutationTarget[] };
  validationConstraints: Record<string, unknown>;
  editableTargets: CanonicalMutationTarget[];
  mutationOperations: Partial<Record<CanonicalMutationTarget, CanonicalMutationAvailability>>;
  systemOwned: boolean;
  transitionManaged: boolean;
  workflowOperations: string[];
  readOnly: boolean;
  sourceRefs?: unknown[];
  [key: string]: unknown;
}

export interface CanonicalFieldDictionary {
  version: string | number;
  fields: RuntimeCanonicalField[];
  configuration: Record<string, { state: string; [key: string]: unknown }>;
  catalogues: Record<string, unknown>;
  [key: string]: unknown;
}

const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const targetNames = new Set<CanonicalMutationTarget>(['property', 'project', 'unit_type', 'project_unit']);

const asTargets = (value: unknown, fieldKey: string): CanonicalMutationTarget[] => {
  if (!Array.isArray(value) || value.some((target) => typeof target !== 'string' || !targetNames.has(target as CanonicalMutationTarget))) {
    throw new Error(`Canonical field ${fieldKey} has invalid mutation targets.`);
  }
  return value as CanonicalMutationTarget[];
};

const parseField = (value: unknown): RuntimeCanonicalField => {
  if (!record(value) || typeof value.key !== 'string' || typeof value.kind !== 'string' || typeof value.dataType !== 'string') {
    throw new Error('The canonical field dictionary contains a malformed field entry.');
  }
  const applicability = record(value.entityApplicability) ? value.entityApplicability : null;
  const targets = asTargets(value.editableTargets, value.key);
  const mutationTargets = asTargets(applicability?.mutationTargets, value.key);
  if (!record(value.mutationOperations) || !record(value.validationConstraints)) {
    throw new Error(`Canonical field ${value.key} is missing mutation or validation metadata.`);
  }
  const operations: Partial<Record<CanonicalMutationTarget, CanonicalMutationAvailability>> = {};
  for (const target of targetNames) {
    const targetOps = value.mutationOperations[target];
    if (targetOps === undefined) continue;
    if (!record(targetOps) || Object.values(targetOps).some((allowed) => typeof allowed !== 'boolean')) {
      throw new Error(`Canonical field ${value.key} has invalid ${target} mutation operations.`);
    }
    operations[target] = targetOps as CanonicalMutationAvailability;
  }
  if (typeof value.systemOwned !== 'boolean' || typeof value.transitionManaged !== 'boolean' ||
      typeof value.readOnly !== 'boolean' || !Array.isArray(value.workflowOperations) ||
      value.workflowOperations.some((operation) => typeof operation !== 'string')) {
    throw new Error(`Canonical field ${value.key} has invalid ownership metadata.`);
  }
  return {
    ...value,
    key: value.key,
    kind: value.kind,
    dataType: value.dataType,
    entityApplicability: { sourceLevel: typeof applicability?.sourceLevel === 'string' ? applicability.sourceLevel : undefined, mutationTargets },
    validationConstraints: value.validationConstraints,
    editableTargets: targets,
    mutationOperations: operations,
    systemOwned: value.systemOwned,
    transitionManaged: value.transitionManaged,
    workflowOperations: value.workflowOperations as string[],
    readOnly: value.readOnly,
  };
};

export const parseCanonicalFieldDictionary = (value: unknown): CanonicalFieldDictionary => {
  if (!record(value) || !(typeof value.version === 'string' || typeof value.version === 'number') || !Array.isArray(value.fields) || !record(value.configuration)) {
    throw new Error('The canonical field dictionary response is invalid.');
  }
  const fields = value.fields.map(parseField);
  const seen = new Set<string>();
  for (const field of fields) {
    if (seen.has(field.key)) throw new Error(`The canonical field dictionary repeats ${field.key}.`);
    seen.add(field.key);
  }
  const configuration: CanonicalFieldDictionary['configuration'] = {};
  for (const [key, item] of Object.entries(value.configuration)) {
    if (!record(item) || typeof item.state !== 'string') throw new Error(`Canonical configuration ${key} has no state.`);
    configuration[key] = item as CanonicalFieldDictionary['configuration'][string];
  }
  const { version, fields: _fields, configuration: _configuration, ...catalogues } = value;
  return { version, fields, configuration, catalogues } as CanonicalFieldDictionary;
};

let cachedDictionary: CanonicalFieldDictionary | null = null;
let pendingDictionary: Promise<CanonicalFieldDictionary> | null = null;

export const canonicalFieldService = {
  async getDictionary(forceRefresh = false): Promise<CanonicalFieldDictionary> {
    if (forceRefresh) {
      cachedDictionary = null;
      pendingDictionary = null;
    }
    if (cachedDictionary) return cachedDictionary;
    if (!pendingDictionary) {
      pendingDictionary = api.get<unknown>('/properties/field-dictionary')
        .then(({ data }) => {
          const parsed = parseCanonicalFieldDictionary(data);
          cachedDictionary = parsed;
          return parsed;
        })
        .finally(() => { pendingDictionary = null; });
    }
    return pendingDictionary;
  },

  clearCache(): void {
    cachedDictionary = null;
    pendingDictionary = null;
  },
};
