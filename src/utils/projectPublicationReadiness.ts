import type { ApiRequestError } from '../lib/axios';

export type ProjectPublicationReadiness = NonNullable<ApiRequestError['publicationReadiness']>;

export const projectPublicationReadinessView = (readiness: ProjectPublicationReadiness) => ({
  projectBlockers: (readiness.projectBlockers ?? []).map((item) => ({ field: item.field, code: item.code })),
  units: (readiness.units ?? []).map((unit) => ({
    unitId: unit.unitId,
    blockers: unit.blockers.map((item) => ({ field: item.field, code: item.code })),
  })),
});
