import type { ProjectDetail } from '../types';
import type { CreateProjectRequest, UpdateProjectRequest } from '../services/projectService';

const editableProjectFields = [
  'name', 'projectType', 'description', 'shortDescription', 'address', 'country', 'state', 'city', 'area',
  'coordinates', 'amenities', 'features', 'nearbyLandmarks', 'completionDate', 'launchDate', 'media',
] as const satisfies readonly (keyof CreateProjectRequest)[];

type EditableProjectField = (typeof editableProjectFields)[number];

const comparable = (field: EditableProjectField, value: unknown): unknown => {
  if (field === 'completionDate' || field === 'launchDate') {
    return typeof value === 'string' ? value.slice(0, 10) : value ?? '';
  }
  if (field === 'coordinates' && (value === undefined || value === null)) return null;
  if (['amenities', 'features', 'nearbyLandmarks'].includes(field) && value === undefined) return [];
  if (typeof value === 'string' && value.length === 0) return '';
  return value;
};

const sameValue = (field: EditableProjectField, left: unknown, right: unknown): boolean =>
  JSON.stringify(comparable(field, left ?? (field === 'amenities' || field === 'features' || field === 'nearbyLandmarks' ? [] : '')))
    === JSON.stringify(comparable(field, right ?? (field === 'amenities' || field === 'features' || field === 'nearbyLandmarks' ? [] : '')));

const sameCanonicalValue = (left: unknown, right: unknown): boolean => {
  if (left === undefined && right === '') return true;
  if (right === undefined && left === '') return true;
  if (left === undefined && Array.isArray(right) && right.length === 0) return true;
  if (right === undefined && Array.isArray(left) && left.length === 0) return true;
  return JSON.stringify(left) === JSON.stringify(right);
};

/** Builds a changed-only project PATCH using the documented canonical mutation envelope. */
export const buildProjectEditPatch = (
  current: ProjectDetail,
  draft: CreateProjectRequest,
  expectedVersion: number,
): UpdateProjectRequest => {
  const patch: UpdateProjectRequest = { expectedVersion };
  for (const field of editableProjectFields) {
    const value = draft[field];
    if (value === undefined || sameValue(field, current[field], value)) continue;
    (patch as Record<string, unknown>)[field] = value;
  }
  const canonicalDraft = draft.canonicalFields ?? {};
  const canonicalCurrent = current.canonicalFields ?? {};
  const canonicalChanges = Object.fromEntries(Object.entries(canonicalDraft).filter(([field, value]) =>
    !sameCanonicalValue(canonicalCurrent[field], value),
  ));
  const mutations = [
    ...Object.entries(canonicalChanges).map(([field, value]) => ({ field, operation: 'set' as const, value })),
    ...(draft.canonicalFieldMutations ?? []),
  ];
  if (mutations.length) patch.canonicalFieldMutations = mutations;
  return patch;
};

