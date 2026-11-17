import type { ProjectDetail, Property } from '../types';

export type ProjectUnitDisplayMode = 'grouped_by_unit_type' | 'individual_units';
export type ProjectUnitView = 'cards' | 'list' | 'table';

export interface ProjectUnitGroup {
  key: string;
  label: string | null;
  properties: Property[];
}

export const readProjectUnitDisplayMode = (project?: Pick<ProjectDetail, 'canonicalFields'> | null): ProjectUnitDisplayMode | null => {
  const value = project?.canonicalFields?.unitDisplayMode;
  return value === 'grouped_by_unit_type' || value === 'individual_units' ? value : null;
};

const unitTypeName = (property: Property): string | null => {
  const candidates = [
    property.canonicalEffectiveFields?.unitTypeName,
    property.effectiveCanonicalFields?.unitTypeName,
    property.canonicalFields?.unitTypeName,
  ];
  const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
  return typeof value === 'string' ? value.trim() : null;
};

export const groupProjectUnits = (properties: Property[], mode: ProjectUnitDisplayMode | null): ProjectUnitGroup[] => {
  if (mode !== 'grouped_by_unit_type') {
    return properties.length ? [{ key: 'individual-units', label: null, properties }] : [];
  }

  const groups = new Map<string, ProjectUnitGroup>();
  properties.forEach((property, index) => {
    const name = unitTypeName(property);
    const key = name ? `unit-type:${name}` : `unit-type-unavailable:${index}`;
    const group = groups.get(key);
    if (group) group.properties.push(property);
    else groups.set(key, {
      key,
      label: name ?? 'Unit type details unavailable',
      properties: [property],
    });
  });
  return [...groups.values()];
};
