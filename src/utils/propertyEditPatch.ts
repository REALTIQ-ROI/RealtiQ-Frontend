import type { UpdatePropertyPayload } from '../services/propertyService';
import type { Property } from '../types';

export const propertyEditPatch = (property: Property, payload: UpdatePropertyPayload): UpdatePropertyPayload => {
  const changed: UpdatePropertyPayload = {};
  for (const [key, value] of Object.entries(payload) as Array<[keyof UpdatePropertyPayload, unknown]>) {
    if (value === undefined || key === 'expectedVersion' || key === 'status') continue;
    if (key === 'canonicalFields') {
      if (value && Object.keys(value).length) {
        const mutations = Object.entries(value as Record<string, unknown>)
          .filter(([field, fieldValue]) => JSON.stringify(property.canonicalFields?.[field]) !== JSON.stringify(fieldValue))
          .map(([field, fieldValue]) => ({ field, operation: 'set' as const, value: fieldValue }));
        changed.canonicalFieldMutations = [...(changed.canonicalFieldMutations ?? []), ...mutations];
      }
      continue;
    }
    if (key === 'canonicalFieldMutations') {
      if (Array.isArray(value) && value.length) changed.canonicalFieldMutations = [...(changed.canonicalFieldMutations ?? []), ...(value as NonNullable<UpdatePropertyPayload['canonicalFieldMutations']>)];
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
