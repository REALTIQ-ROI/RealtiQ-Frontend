export type CanonicalEntity = 'property' | 'project' | 'unit';
export type CanonicalInputKind = 'text' | 'integer' | 'decimal' | 'boolean' | 'enum' | 'multi_enum' | 'coordinates' | 'date' | 'month';

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

export type CanonicalInputResult = { ok: true; value: string | number | boolean } | { ok: false; error: string };

export const parseCanonicalInput = (field: CanonicalFieldDefinition, raw: string): CanonicalInputResult => {
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
    return { ok: false, error: `${field.label} requires its structured control.` };
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
  if (field.kind === 'text') return { ok: true, value: raw.trim() };

  const value = Number(raw.trim());
  if (!Number.isFinite(value)) return { ok: false, error: `Enter a valid ${field.label.toLowerCase()}.` };
  if (field.kind === 'integer' && !Number.isInteger(value)) return { ok: false, error: `${field.label} must be a whole number.` };
  if (field.min !== undefined && value < field.min) return { ok: false, error: `${field.label} must be at least ${field.min}.` };
  if (field.max !== undefined && value > field.max) return { ok: false, error: `${field.label} must be no more than ${field.max}.` };
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

