import type { CanonicalFieldDictionary, RuntimeCanonicalField } from '../services/canonicalFieldService';

export interface CanonicalSearchControl {
  field: RuntimeCanonicalField;
  label: string;
  kind: 'boolean' | 'enum' | 'multi_enum' | 'numeric';
  options: string[];
  minKey?: string;
  maxKey?: string;
}

const explicitSearchKeys = new Set([
  'search', 'sort', 'minPrice', 'maxPrice', 'priceBand', 'includeUnpriced', 'withPhotosOnly',
  'propertyType', 'status', 'buildStage', 'completionStage', 'state', 'lga', 'area',
  'gatedEstate', 'estateName', 'bedrooms', 'minBedrooms', 'maxBedrooms', 'fullBathrooms',
  'bathrooms', 'minBathrooms', 'maxBathrooms', 'powderRooms', 'minPowderRooms', 'maxPowderRooms',
  'internalFloorArea', 'minInternalFloorArea', 'maxInternalFloorArea', 'unitFootprint',
  'minBuiltUpArea', 'maxBuiltUpArea', 'plotSize', 'minPlotArea', 'maxPlotArea', 'numberOfFloors',
  'serviceCharge', 'annualServiceCharge', 'paymentOptions', 'instalmentDuration', 'initialDepositCap',
  'escrowAvailable', 'reducedSinceListing', 'negotiable', 'readyToMoveIn', 'furnishing',
  'servicedStatus', 'parkingSpaces', 'occupancy', 'publishedWithin', 'videoTour', 'has3dTour',
  'hasFloorPlan', 'hasDroneFlyThrough', 'openHouse', 'openHouseThisWeekend',
  'privateShowingsByAppointment', 'hasShowHome', 'distressSaleOnly', 'allBedroomsEnSuite',
  'platformVerifiedTitleOnly', 'platformVerifiedListingOnly', 'constructionMilestone', 'amenities',
  'handoverFrom', 'handoverBy', 'reference', 'exactReference', 'currency', 'featured',
  'fromAccountsIFollow', 'commuteFrom', 'commuteMinutes', 'nearbyLat', 'nearbyLng', 'nearbyRadiusKm',
  'north', 'south', 'east', 'west', 'mapActive', 'mapZoom', 'zoom', 'page', 'limit', 'queryVersion',
]);

const titleCaseKey = (key: string) => key.length ? `${key[0].toUpperCase()}${key.slice(1)}` : key;

const optionsFor = (field: RuntimeCanonicalField, dictionary: CanonicalFieldDictionary): string[] => {
  if (Array.isArray(field.allowedValues)) return field.allowedValues.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number').map(String);
  if (typeof field.catalogue !== 'string') return [];
  const catalogue = dictionary.catalogues[field.catalogue];
  if (Array.isArray(catalogue)) return catalogue.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number').map(String);
  if (catalogue && typeof catalogue === 'object' && !Array.isArray(catalogue)) {
    const record = catalogue as Record<string, unknown>;
    const values = Array.isArray(record.values) ? record.values : Array.isArray(record.options) ? record.options : null;
    return values ? values.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number').map(String) : [];
  }
  return [];
};

export const canonicalFieldOptions = (field: RuntimeCanonicalField | undefined, dictionary: CanonicalFieldDictionary | null): string[] =>
  field && dictionary ? optionsFor(field, dictionary) : [];

const isPublicSearchValue = (field: RuntimeCanonicalField) => {
  const visibility = (field.visibility ?? '').toLowerCase();
  const searchUse = (field.searchUse ?? '').toLowerCase();
  return field.searchable === true && visibility.includes('public') && !visibility.includes('private') &&
    !visibility.includes('staff') && !searchUse.includes('not a buyer search atom');
};

export const canonicalSearchControls = (dictionary: CanonicalFieldDictionary | null): CanonicalSearchControl[] => {
  if (!dictionary) return [];
  const controls: CanonicalSearchControl[] = [];
  for (const field of dictionary.fields) {
    if (!isPublicSearchValue(field) || field.systemOwned || field.transitionManaged || field.readOnly || explicitSearchKeys.has(field.key)) continue;
    const dataType = field.dataType.toLowerCase();
    const label = typeof field.label === 'string' ? field.label : field.key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
    if (dataType === 'boolean') {
      controls.push({ field, label, kind: 'boolean', options: [] });
      continue;
    }
    if (['integer', 'decimal', 'number', 'numeric', 'money', 'money_or_none', 'percentage', 'count'].includes(dataType)) {
      const prefix = titleCaseKey(field.key);
      controls.push({ field, label, kind: 'numeric', options: [], minKey: `min${prefix}`, maxKey: `max${prefix}` });
      continue;
    }
    const options = optionsFor(field, dictionary);
    if (!options.length) continue;
    if (['multi_enum', 'multi_select', 'multi_enum_list', 'amenity_key_list', 'title_declaration_list'].includes(dataType)) {
      controls.push({ field, label, kind: 'multi_enum', options });
    } else if (dataType === 'enum' || dataType === 'console_enum' || dataType === 'architectural_style') {
      controls.push({ field, label, kind: 'enum', options });
    }
  }
  return controls;
};

export const canonicalSearchValueFromUrl = (control: CanonicalSearchControl, params: URLSearchParams): string | string[] => {
  if (control.kind === 'numeric') return [params.get(control.minKey ?? '') ?? '', params.get(control.maxKey ?? '') ?? ''];
  if (control.kind === 'multi_enum') return params.getAll(control.field.key);
  return params.get(control.field.key) ?? '';
};

export const canonicalSearchQueryValue = (control: CanonicalSearchControl, value: string | string[]): Record<string, string | number | boolean | string[] | undefined> => {
  if (control.kind === 'numeric') {
    const [min = '', max = ''] = Array.isArray(value) ? value : [value, ''];
    return {
      [control.minKey ?? '']: min === '' ? undefined : Number(min),
      [control.maxKey ?? '']: max === '' ? undefined : Number(max),
    };
  }
  if (control.kind === 'multi_enum') return { [control.field.key]: Array.isArray(value) && value.length ? value : undefined };
  if (value === '') return { [control.field.key]: undefined };
  if (control.kind === 'boolean') return { [control.field.key]: value === 'true' };
  return { [control.field.key]: value };
};

export const displayCanonicalSearchValue = (control: CanonicalSearchControl, value: string | string[]): string => {
  if (Array.isArray(value)) return value.join(', ');
  if (control.kind === 'boolean') return value === 'true' ? 'Yes' : value === 'false' ? 'No' : value;
  return value;
};
