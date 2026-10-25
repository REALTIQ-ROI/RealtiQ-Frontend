import type { CanonicalFieldDictionary, CanonicalMutationOperation, CanonicalMutationTarget, RuntimeCanonicalField } from '../services/canonicalFieldService';

export type CanonicalEntity = 'property' | 'project' | 'unit';
export type CanonicalInputKind = 'text' | 'integer' | 'decimal' | 'boolean' | 'enum' | 'multi_enum' | 'coordinates' | 'date' | 'month' | 'json';

export interface CanonicalFieldDefinition {
  key: string;
  label: string;
  entities: readonly CanonicalEntity[];
  kind: CanonicalInputKind;
  inherits: boolean;
  options?: readonly string[];
  min?: number;
  max?: number;
  unit?: string;
  condition?: string;
  dataType?: string;
  runtime?: RuntimeCanonicalField;
}

const buildStages = ['Off-plan', 'Under construction', 'Uncompleted building', 'Semi-finished (Advanced Shell / Lock-up)', 'Newly built', 'Renovated', 'Previously owned', 'Old'] as const;
const furnishingOptions = ['Furnished', 'Semi-Furnished', 'Unfurnished'] as const;

/**
 * Frontend controls are intentionally a typed subset of the 156-field source dictionary.
 * Complex, private, workflow-owned, catalogue-backed, and unit-type CRUD fields stay out of
 * generic editing until their exact UI/source or endpoint contracts are available.
 */
export const canonicalFieldRegistry: readonly CanonicalFieldDefinition[] = [
  { key: 'projectName', label: 'Project name', entities: ['project'], kind: 'text', inherits: false },
  { key: 'developmentStructure', label: 'Development structure', entities: ['project'], kind: 'enum', inherits: false, options: ['Estate / gated community', 'Apartment building', 'Mixed-use development', 'Commercial complex', 'Other'] },
  { key: 'shortDescription', label: 'Short description', entities: ['project'], kind: 'text', inherits: false },
  { key: 'projectDescription', label: 'Project description', entities: ['project'], kind: 'text', inherits: false },
  { key: 'unitDisplayMode', label: 'Unit display mode', entities: ['project'], kind: 'enum', inherits: false, options: ['Grouped by unit type', 'Individual units'] },
  { key: 'state', label: 'State', entities: ['project', 'property'], kind: 'text', inherits: false },
  { key: 'lga', label: 'Local Government Area', entities: ['project', 'property'], kind: 'text', inherits: false, condition: 'Must be a child of state' },
  { key: 'area', label: 'Area', entities: ['project', 'property'], kind: 'text', inherits: false, condition: 'Must be a child of LGA' },
  { key: 'gatedEstate', label: 'Gated estate', entities: ['project', 'property'], kind: 'boolean', inherits: false },
  { key: 'estateName', label: 'Estate name', entities: ['project', 'property'], kind: 'text', inherits: false, condition: 'Required when gatedEstate is true' },
  { key: 'streetAddress', label: 'Street address', entities: ['project', 'property'], kind: 'text', inherits: false, condition: 'Standard address path' },
  { key: 'houseNumber', label: 'House number', entities: ['property'], kind: 'text', inherits: false, condition: 'Standard address path' },
  { key: 'unitOrFlatNumber', label: 'Unit or flat number', entities: ['property'], kind: 'text', inherits: false },
  { key: 'estateAccessStreet', label: 'Estate access street', entities: ['property'], kind: 'text', inherits: false, condition: 'Estate address path' },
  { key: 'estateInternalStreet', label: 'Estate internal street', entities: ['property'], kind: 'text', inherits: false },
  { key: 'estateHouseUnitNumber', label: 'Estate house or unit number', entities: ['property'], kind: 'text', inherits: false, condition: 'Estate address path' },
  { key: 'projectPin', label: 'Map pin', entities: ['project', 'property'], kind: 'coordinates', inherits: false, condition: 'Coordinates must resolve within Nigeria' },
  { key: 'accessRoadConditions', label: 'Access road conditions', entities: ['project', 'property'], kind: 'multi_enum', inherits: false, options: ['Tarred', 'Untarred', 'Flood-prone', 'Sand-filled area'] },
  { key: 'buildStage', label: 'Build stage', entities: ['project', 'unit'], kind: 'enum', inherits: true, options: buildStages },
  { key: 'launchDate', label: 'Launch date', entities: ['project'], kind: 'date', inherits: false },
  { key: 'approximateUnitCount', label: 'Approximate unit count', entities: ['project'], kind: 'integer', inherits: false, min: 1 },
  { key: 'servicedStatus', label: 'Serviced status', entities: ['project'], kind: 'enum', inherits: false, options: ['Serviced', 'Not Serviced'] },
  { key: 'paymentOptions', label: 'Payment options', entities: ['project'], kind: 'multi_enum', inherits: false, options: ['Outright Purchase', 'Instalment Plan', 'Mortgage Accepted'] },
  { key: 'maximumInstallmentMonths', label: 'Maximum instalment months', entities: ['project'], kind: 'integer', inherits: false, min: 1, condition: 'Required when Instalment Plan is selected' },
  { key: 'initialDepositPercent', label: 'Initial deposit', entities: ['project'], kind: 'decimal', inherits: false, min: 0, max: 100, unit: '%', condition: 'Required when Instalment Plan is selected' },
  { key: 'transactionFeePayer', label: 'Transaction fee payer', entities: ['project'], kind: 'enum', inherits: false, options: ['buyer', 'seller', 'split'], condition: 'Required on publication' },
  { key: 'privateShowingsByAppointment', label: 'Private showings by appointment', entities: ['project'], kind: 'boolean', inherits: false },
  { key: 'liveVideoTourAvailable', label: 'Live video tour available', entities: ['project'], kind: 'boolean', inherits: false },
  { key: 'headline', label: 'Listing headline', entities: ['property'], kind: 'text', inherits: false },
  { key: 'description', label: 'Listing description', entities: ['property'], kind: 'text', inherits: false },
  { key: 'otherAmenity', label: 'Other amenity', entities: ['property'], kind: 'text', inherits: false },
  { key: 'listingKind', label: 'Listing kind', entities: ['property'], kind: 'enum', inherits: false, options: ['Single Property', 'Development'] },
  { key: 'advertiserDisplay', label: 'Advertiser display', entities: ['property'], kind: 'enum', inherits: false, options: ['type only', 'type and name'] },
  { key: 'propertyLiveVideo', label: 'Live video available', entities: ['property'], kind: 'boolean', inherits: false },
  { key: 'commercialFrontage', label: 'Commercial frontage', entities: ['property', 'unit'], kind: 'decimal', inherits: true, min: 0, unit: 'm' },
  { key: 'commercialFloorsOrUnits', label: 'Commercial floors or units', entities: ['property', 'unit'], kind: 'integer', inherits: true, min: 0 },
  { key: 'loadingVehicleAccess', label: 'Loading vehicle access', entities: ['property', 'unit'], kind: 'boolean', inherits: true },
  { key: 'loadingVehicleAccessType', label: 'Loading access type', entities: ['property', 'unit'], kind: 'text', inherits: true, condition: 'Required when loading vehicle access is true' },
  { key: 'liftCount', label: 'Lift count', entities: ['property', 'unit'], kind: 'integer', inherits: true, min: 0 },
  { key: 'fitOut', label: 'Fit-out', entities: ['property', 'unit'], kind: 'enum', inherits: true, options: ['Shell & core', 'Partly fitted', 'Fully fitted'] },
  { key: 'unitIdentifier', label: 'Unit identifier', entities: ['unit'], kind: 'text', inherits: false },
  { key: 'bedrooms', label: 'Bedrooms', entities: ['unit'], kind: 'integer', inherits: true, min: 0 },
  { key: 'fullBathrooms', label: 'Full bathrooms', entities: ['unit'], kind: 'integer', inherits: true, min: 0 },
  { key: 'powderRooms', label: 'Powder rooms', entities: ['unit'], kind: 'integer', inherits: true, min: 0 },
  { key: 'parkingSpaces', label: 'Parking spaces', entities: ['unit'], kind: 'integer', inherits: true, min: 0 },
  { key: 'negotiable', label: 'Price negotiable', entities: ['unit'], kind: 'boolean', inherits: true },
  { key: 'allBedroomsEnSuite', label: 'All bedrooms en suite', entities: ['unit'], kind: 'boolean', inherits: true },
  { key: 'internalFloorArea', label: 'Internal floor area', entities: ['unit'], kind: 'decimal', inherits: true, min: 0, unit: 'm²' },
  { key: 'unitFootprint', label: 'Unit footprint', entities: ['unit'], kind: 'decimal', inherits: true, min: 0, unit: 'm²' },
  { key: 'wholeBuildingFootprint', label: 'Whole building footprint', entities: ['unit'], kind: 'decimal', inherits: true, min: 0, unit: 'm²' },
  { key: 'plotSize', label: 'Plot size', entities: ['unit'], kind: 'decimal', inherits: true, min: 0, unit: 'm²' },
  { key: 'terraceFloors', label: 'Terrace floors', entities: ['unit'], kind: 'integer', inherits: true, min: 1, condition: 'Terraced House or Townhouse' },
  { key: 'furnishing', label: 'Furnishing', entities: ['unit'], kind: 'enum', inherits: true, options: furnishingOptions },
  { key: 'occupancy', label: 'Occupancy', entities: ['unit'], kind: 'enum', inherits: false, options: ['Vacant possession', 'Sold with occupiers'] },
  { key: 'completedBeforeHandover', label: 'Completed before handover', entities: ['unit'], kind: 'boolean', inherits: true },
  { key: 'projectedHandoverMonth', label: 'Projected handover month', entities: ['unit'], kind: 'month', inherits: true },
];

export const getCanonicalFields = (entity: CanonicalEntity): readonly CanonicalFieldDefinition[] =>
  canonicalFieldRegistry.filter((field) => field.entities.includes(entity));

export const getCanonicalField = (key: string): CanonicalFieldDefinition | undefined =>
  canonicalFieldRegistry.find((field) => field.key === key);

const toInputKind = (kind: string): CanonicalInputKind => {
  const normalized = kind.toLowerCase();
  if (normalized.includes('bool')) return 'boolean';
  if (normalized.includes('integer') || normalized === 'int') return 'integer';
  if (normalized.includes('decimal') || normalized.includes('number') || normalized.startsWith('money')) return 'decimal';
  if (normalized === 'month' || normalized.endsWith('_month') || (normalized.includes('date') && normalized.includes('month'))) return 'month';
  if (normalized === 'date' || normalized.includes('datetime')) return 'date';
  if (normalized.includes('coordinate') || normalized.includes('pin') || normalized.includes('position')) return 'coordinates';
  if (normalized.includes('enum') && (normalized.includes('list') || normalized.includes('multiple') || normalized.includes('multi'))) return 'multi_enum';
  if (normalized === 'enum' || normalized.endsWith('_enum')) return 'enum';
  if (normalized === 'text' || normalized === 'long_text' || normalized === 'address_text' || normalized === 'private_text') return 'text';
  return 'json';
};

const stringOptions = (value: unknown): readonly string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const values = value.map((item) => typeof item === 'string' ? item :
    item && typeof item === 'object' && 'value' in item && typeof item.value === 'string' ? item.value : undefined);
  return values.every((item): item is string => typeof item === 'string') ? values : undefined;
};

const runtimeOptions = (field: RuntimeCanonicalField, dictionary: CanonicalFieldDictionary): readonly string[] | undefined => {
  const direct = stringOptions(field.allowedValues);
  if (direct) return direct;
  if (typeof field.catalogue === 'string') {
    const catalogue = dictionary.catalogues[field.catalogue];
    return stringOptions(catalogue);
  }
  return undefined;
};

const targetsToEntities = (targets: readonly CanonicalMutationTarget[]): readonly CanonicalEntity[] => targets
  .flatMap((target): CanonicalEntity[] => target === 'unit_type' ? [] : target === 'project_unit' ? ['unit'] : [target]);

/** Runtime policy/shape metadata replaces static guesses; static fields only supply friendly labels when needed. */
export const reconcileCanonicalFieldRegistry = (dictionary: CanonicalFieldDictionary): readonly CanonicalFieldDefinition[] => {
  const staticByKey = new Map(canonicalFieldRegistry.map((field) => [field.key, field]));
  return dictionary.fields.map((runtime) => {
    const fallback = staticByKey.get(runtime.key);
    const mutationTargets = runtime.entityApplicability.mutationTargets;
    const dataType = runtime.dataType || runtime.kind;
    const inferredKind = toInputKind(dataType);
    const options = runtimeOptions(runtime, dictionary);
    const kind = inferredKind === 'json' && options?.length && !/(list|array|map|pair|template|schedule|media)/i.test(dataType)
      ? 'enum'
      : inferredKind;
    const constraints = runtime.validationConstraints;
    return {
      ...fallback,
      key: runtime.key,
      label: typeof runtime.label === 'string' ? runtime.label : fallback?.label ?? runtime.key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (first) => first.toUpperCase()),
      entities: targetsToEntities(mutationTargets),
      kind,
      dataType: runtime.dataType,
      inherits: typeof runtime.inheritance === 'string' && runtime.inheritance.includes('>'),
      options,
      min: typeof constraints.minimum === 'number' ? constraints.minimum : typeof runtime.minimum === 'number' ? runtime.minimum : undefined,
      max: typeof constraints.maximum === 'number' ? constraints.maximum : typeof runtime.maximum === 'number' ? runtime.maximum : undefined,
      unit: typeof constraints.unit === 'string' ? constraints.unit : runtime.unit ?? fallback?.unit,
      condition: typeof runtime.condition === 'string' ? runtime.condition : fallback?.condition,
      runtime,
    };
  });
};

export const runtimeCanonicalField = (
  registry: readonly CanonicalFieldDefinition[],
  key: string,
): CanonicalFieldDefinition | undefined => registry.find((field) => field.key === key);

export const canonicalMutationAllowed = (
  field: CanonicalFieldDefinition | undefined,
  target: CanonicalMutationTarget,
  operation: CanonicalMutationOperation,
): boolean => {
  const runtime = field?.runtime;
  if (!runtime || runtime.readOnly || runtime.systemOwned || runtime.transitionManaged || !runtime.editableTargets.includes(target)) return false;
  const operations = runtime.mutationOperations[target];
  if (!operations) return false;
  if (operation === 'set') return operations.set === true;
  if (operation === 'set_null') return operations.setNull === true;
  if (operation === 'unset') return operations.unset === true;
  return operations.resetToInherit === true;
};

export type CanonicalInputResult = { ok: true; value: unknown } | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const isObjectId = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean => Object.keys(value).every((key) => allowed.includes(key));
const validMonth = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) > 0;
const validDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year > 0 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const boundedJsonError = (value: unknown, depth = 0): string | null => {
  if (depth > 5) return 'Nested payment-template values cannot exceed five levels.';
  if (Array.isArray(value)) {
    if (value.length > 50) return 'Payment-template arrays cannot contain more than 50 entries.';
    for (const item of value) { const error = boundedJsonError(item, depth + 1); if (error) return error; }
  } else if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length > 50) return 'Payment-template objects cannot contain more than 50 entries.';
    for (const [key, item] of entries) {
      if (/https?:\/\//i.test(key)) return 'Payment-template values cannot contain URLs.';
      const error = boundedJsonError(item, depth + 1); if (error) return error;
    }
  } else if (typeof value === 'string' && /https?:\/\//i.test(value)) return 'Payment-template values cannot contain URLs.';
  return null;
};

/** Validate the source-defined JSON shapes documented for canonical specialized values. */
const validateSpecializedValue = (field: CanonicalFieldDefinition, value: unknown): string | null => {
  const type = field.runtime?.dataType ?? field.runtime?.kind;
  if (!type) return null;
  if (type === 'image_media') {
    if (!isRecord(value) || !hasOnlyKeys(value, ['assetId', 'versionId']) || !isObjectId(value.assetId) ||
      (value.versionId !== undefined && !isObjectId(value.versionId))) return `${field.label} must reference an authorized asset using assetId and optional versionId.`;
  } else if (type === 'media_list') {
    if (!Array.isArray(value)) return `${field.label} must be a JSON array of authorized media references.`;
    const allowed = ['assetId', 'versionId', 'caption', 'altText', 'cover', 'source', 'attribution', 'date', 'milestone'];
    for (const item of value) {
      if (!isRecord(item) || !hasOnlyKeys(item, allowed) || !isObjectId(item.assetId) ||
        (item.versionId !== undefined && !isObjectId(item.versionId))) return `${field.label} contains a media reference with an unsupported shape.`;
      for (const key of ['caption', 'altText', 'source', 'attribution', 'milestone']) if (item[key] !== undefined && typeof item[key] !== 'string') return `${field.label} ${key} values must be text.`;
      if (item.cover !== undefined && typeof item.cover !== 'boolean') return `${field.label} cover values must be true or false.`;
      if (item.date !== undefined && !validDate(item.date)) return `${field.label} dates must use a valid YYYY-MM-DD date.`;
      if (/progressmedia$/i.test(field.key) && (!validDate(item.date) || typeof item.milestone !== 'string' || !item.milestone)) return `${field.label} entries need a valid date and source milestone.`;
      if (/aerialphotographs|aerialmedia/i.test(field.key) && (typeof item.source !== 'string' || !item.source || typeof item.attribution !== 'string' || !item.attribution)) return `${field.label} entries need a source and attribution.`;
      if (/renders$/i.test(field.key) && (typeof item.caption !== 'string' || !item.caption.trim())) return `${field.label} entries need the source-defined artist-impression caption.`;
    }
    if (/projectphotos$/i.test(field.key) && value.length && value.filter((item) => isRecord(item) && item.cover === true).length !== 1) return 'A non-empty project photo list needs exactly one cover image.';
  } else if (type === 'question_answer_list') {
    if (!Array.isArray(value) || value.length > 50 || value.some((item) => !isRecord(item) || !hasOnlyKeys(item, ['question', 'answer']) || typeof item.question !== 'string' || item.question.length < 1 || item.question.length > 500 || typeof item.answer !== 'string' || item.answer.length < 1 || item.answer.length > 5000)) return `${field.label} must contain up to 50 question/answer rows within the documented text limits.`;
  } else if (type === 'milestone_target_list') {
    if (!Array.isArray(value)) return `${field.label} must be a milestone target array.`;
    const keys = new Set<string>();
    for (const item of value) {
      if (!isRecord(item) || !hasOnlyKeys(item, ['milestone', 'targetMonth', 'originalTargetMonth']) || typeof item.milestone !== 'string' || !item.milestone || !validMonth(item.targetMonth) || (item.originalTargetMonth !== undefined && !validMonth(item.originalTargetMonth)) || keys.has(item.milestone)) return `${field.label} requires unique milestones and YYYY-MM target dates.`;
      keys.add(item.milestone);
    }
  } else if (type === 'fee_payer_template') {
    const validPayers = ['buyer', 'seller', 'split'];
    if (typeof value === 'string') {
      if (!validPayers.includes(value)) return `${field.label} must be buyer, seller, split, or the documented payer object.`;
    } else if (!isRecord(value) || !hasOnlyKeys(value, ['payer', 'buyerPercent']) || !validPayers.includes(String(value.payer)) ||
      (value.payer === 'split' && (typeof value.buyerPercent !== 'number' || value.buyerPercent < 0 || value.buyerPercent > 100)) ||
      (value.buyerPercent !== undefined && (typeof value.buyerPercent !== 'number' || value.buyerPercent < 0 || value.buyerPercent > 100))) return `${field.label} has an invalid payer or split percentage.`;
  } else if (type === 'payment_option_boolean_map') {
    if (!isRecord(value) || !hasOnlyKeys(value, ['outright_purchase', 'instalment_plan']) || Object.values(value).some((item) => typeof item !== 'boolean')) return `${field.label} accepts only outright_purchase and instalment_plan booleans.`;
  } else if (type === 'master_survey_pair') {
    if (!isRecord(value) || !hasOnlyKeys(value, ['publicMasterPlan', 'privateRegisteredSurvey']) || Object.values(value).some((item) => item !== undefined && !isObjectId(item))) return `${field.label} must use authorized public/private survey references.`;
  } else if (type === 'viewing_schedule') {
    if (!Array.isArray(value)) return `${field.label} must be a schedule array.`;
    for (const item of value) {
      if (!isRecord(item) || typeof item.timeZone !== 'string') return `${field.label} needs a documented schedule kind and time zone.`;
      try { new Intl.DateTimeFormat('en-US', { timeZone: item.timeZone }); } catch { return `${field.label} needs a valid IANA time zone.`; }
      if (item.kind === 'specific') {
        if (!hasOnlyKeys(item, ['kind', 'startsAt', 'endsAt', 'timeZone']) || typeof item.startsAt !== 'string' || typeof item.endsAt !== 'string' || !Number.isFinite(Date.parse(item.startsAt)) || !Number.isFinite(Date.parse(item.endsAt)) || Date.parse(item.endsAt) <= Date.parse(item.startsAt)) return `${field.label} specific intervals need ordered start and end timestamps.`;
      } else if (item.kind === 'recurring_weekly') {
        const time = (candidate: unknown): candidate is string => typeof candidate === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate);
        if (!hasOnlyKeys(item, ['kind', 'dayOfWeek', 'startsAtLocal', 'endsAtLocal', 'timeZone', 'startsOn', 'endsOn']) || !Number.isInteger(item.dayOfWeek) || Number(item.dayOfWeek) < 0 || Number(item.dayOfWeek) > 6 || !time(item.startsAtLocal) || !time(item.endsAtLocal) || item.endsAtLocal <= item.startsAtLocal || (item.startsOn !== undefined && !validDate(item.startsOn)) || (item.endsOn !== undefined && !validDate(item.endsOn)) || (typeof item.startsOn === 'string' && typeof item.endsOn === 'string' && item.endsOn < item.startsOn)) return `${field.label} recurring intervals need valid weekday, local times and optional ordered dates.`;
      } else return `${field.label} supports only specific and recurring_weekly schedule entries.`;
    }
  } else if (type === 'payment_template_value') {
    return boundedJsonError(value);
  }
  return null;
};

export const parseCanonicalInput = (field: CanonicalFieldDefinition, raw: string): CanonicalInputResult => {
  if (field.kind === 'text') {
    const value = raw;
    const constraints = field.runtime?.validationConstraints;
    const minimumLength = constraints && typeof constraints.minLength === 'number' ? constraints.minLength : undefined;
    const maximumLength = constraints && typeof constraints.maxLength === 'number' ? constraints.maxLength : constraints && typeof constraints.maximumLength === 'number' ? constraints.maximumLength : undefined;
    if (minimumLength !== undefined && value.length < minimumLength) return { ok: false, error: `${field.label} must contain at least ${minimumLength} characters.` };
    if (maximumLength !== undefined && value.length > maximumLength) return { ok: false, error: `${field.label} must contain no more than ${maximumLength} characters.` };
    return { ok: true, value };
  }
  if (raw.trim() === '') return { ok: false, error: `${field.label} is unanswered.` };
  if (field.kind === 'boolean') {
    if (raw === 'true') return { ok: true, value: true };
    if (raw === 'false') return { ok: true, value: false };
    return { ok: false, error: `Choose Yes or No for ${field.label.toLowerCase()}.` };
  }
  if (field.kind === 'enum') {
    if (field.options?.includes(raw)) return { ok: true, value: raw };
    return { ok: false, error: `Choose a documented ${field.label.toLowerCase()} value.` };
  }
  if (field.kind === 'multi_enum' || field.kind === 'coordinates') {
    try {
      const value = JSON.parse(raw) as unknown;
      if (field.kind === 'multi_enum' && Array.isArray(value) && value.every((item) => typeof item === 'string') &&
          (!field.options || value.every((item) => field.options?.includes(item)))) {
        const constraints = field.runtime?.validationConstraints;
        if (typeof constraints?.minItems === 'number' && value.length < constraints.minItems) return { ok: false, error: `${field.label} needs at least ${constraints.minItems} selected value(s).` };
        if (typeof constraints?.maxItems === 'number' && value.length > constraints.maxItems) return { ok: false, error: `${field.label} accepts no more than ${constraints.maxItems} selected value(s).` };
        return { ok: true, value };
      }
      if (field.kind === 'coordinates' && value && typeof value === 'object' &&
          typeof (value as { lat?: unknown }).lat === 'number' && Number.isFinite((value as { lat: number }).lat) &&
          typeof (value as { lng?: unknown }).lng === 'number' && Number.isFinite((value as { lng: number }).lng)) return { ok: true, value };
    } catch { /* Return the same field-specific validation below. */ }
    return { ok: false, error: `${field.label} must use the documented structured value.` };
  }
  if (field.kind === 'month') {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(raw) && Number(raw.slice(0, 4)) > 0) return { ok: true, value: raw };
    return { ok: false, error: `${field.label} must use year and month.` };
  }
  if (field.kind === 'date') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (year > 0 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) return { ok: true, value: raw };
    }
    return { ok: false, error: `${field.label} must be a valid date.` };
  }
  if (field.kind === 'json') {
    try {
      const value = JSON.parse(raw) as unknown;
      const error = validateSpecializedValue(field, value);
      return error ? { ok: false, error } : { ok: true, value };
    }
    catch { return { ok: false, error: `${field.label} must be valid JSON.` }; }
  }

  const value = Number(raw.trim());
  if (!Number.isFinite(value)) return { ok: false, error: `Enter a valid ${field.label.toLowerCase()}.` };
  if (field.kind === 'integer' && !Number.isInteger(value)) return { ok: false, error: `${field.label} must be a whole number.` };
  const constraints = field.runtime?.validationConstraints;
  const min = field.min ?? (typeof constraints?.minimum === 'number' ? constraints.minimum : undefined);
  const max = field.max ?? (typeof constraints?.maximum === 'number' ? constraints.maximum : undefined);
  if (min !== undefined && value < min) return { ok: false, error: `${field.label} must be at least ${min}.` };
  if (max !== undefined && value > max) return { ok: false, error: `${field.label} must be no more than ${max}.` };
  return { ok: true, value };
};

export const canonicalValueForInput = (fields: Record<string, unknown> | undefined, key: string): string => {
  if (!fields || !Object.prototype.hasOwnProperty.call(fields, key) || fields[key] === null || fields[key] === undefined) return '';
  const value = fields[key];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

export type CanonicalPresence = { state: 'missing' } | { state: 'null' } | { state: 'value'; value: unknown };

export const inspectCanonicalPresence = (fields: Record<string, unknown> | undefined, key: string): CanonicalPresence => {
  if (!fields || !Object.prototype.hasOwnProperty.call(fields, key)) return { state: 'missing' };
  if (fields[key] === null) return { state: 'null' };
  return { state: 'value', value: fields[key] };
};

const sameCanonicalValue = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return false;
};

/** Omit undefined (no mutation), but preserve null, empty strings, zero, false and empty arrays. */
export const serializeCanonicalChanges = (
  current: Record<string, unknown> | undefined,
  draft: Record<string, unknown>,
): Record<string, unknown> => Object.fromEntries(
  Object.entries(draft).filter(([key, value]) => value !== undefined &&
    (!current || !Object.prototype.hasOwnProperty.call(current, key) || !sameCanonicalValue(current[key], value))),
);

export interface CanonicalMutationDraft {
  field: string;
  operation: CanonicalMutationOperation;
  rawValue: string;
}

export interface CanonicalMutation {
  field: string;
  operation: CanonicalMutationOperation;
  value?: unknown;
}

export const serializeCanonicalMutationDrafts = (
  drafts: readonly CanonicalMutationDraft[],
  registry: readonly CanonicalFieldDefinition[],
  target: CanonicalMutationTarget,
): { mutations: CanonicalMutation[]; errors: Record<string, string> } => {
  const mutations: CanonicalMutation[] = [];
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  for (const draft of drafts) {
    if (seen.has(draft.field)) {
      errors[draft.field] = 'A field can appear only once in a request.';
      continue;
    }
    seen.add(draft.field);
    const definition = runtimeCanonicalField(registry, draft.field);
    if (!canonicalMutationAllowed(definition, target, draft.operation)) {
      errors[draft.field] = 'This operation is not allowed for the current field and entity.';
      continue;
    }
    if (draft.operation !== 'set') {
      mutations.push({ field: draft.field, operation: draft.operation });
      continue;
    }
    const parsed = definition ? parseCanonicalInput(definition, draft.rawValue) : null;
    if (!parsed || !parsed.ok) {
      errors[draft.field] = parsed && !parsed.ok ? parsed.error : 'This field is not available in the current dictionary.';
      continue;
    }
    mutations.push({ field: draft.field, operation: 'set', value: parsed.value });
  }
  return { mutations, errors };
};

