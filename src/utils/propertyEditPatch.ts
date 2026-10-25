import type { UpdatePropertyPayload } from '../services/propertyService';
import type { Property } from '../types';

export const propertyEditPatch = (property: Property, payload: UpdatePropertyPayload): UpdatePropertyPayload => {
  const changed: UpdatePropertyPayload = {};
  for (const [key, value] of Object.entries(payload) as Array<[keyof UpdatePropertyPayload, unknown]>) {
    if (value === undefined || key === 'expectedVersion' || key === 'status') continue;
    if (key === 'canonicalFields') {
      if (value && Object.keys(value).length) changed.canonicalFields = value as Record<string, unknown>;
      continue;
    }
    if (key === 'amenities' && property.amenities === undefined && Array.isArray(value) && value.length === 0) continue;
    if (key === 'media' && property.media === undefined && Array.isArray(value) && value.length === 0) continue;
    if (key === 'paymentTypes' && property.paymentTypes === undefined && Array.isArray(value) && value.length === 0) continue;
    if (JSON.stringify(value) !== JSON.stringify(property[key as keyof Property])) {
      (changed as Record<string, unknown>)[key] = value;
    }
  }
  return changed;
};
