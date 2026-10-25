import { describe, expect, it } from 'vitest';
import { projectPublicationReadinessView } from './projectPublicationReadiness';

describe('project publication readiness response', () => {
  it('keeps only backend-returned project and unit blocker fields and codes', () => {
    expect(projectPublicationReadinessView({
      projectBlockers: [{ field: 'developerProfile', code: 'PROFILE_NOT_VERIFIED' }],
      units: [{ unitId: 'unit-1', blockers: [{ field: 'bedrooms', code: 'REQUIRED' }] }],
    })).toEqual({
      projectBlockers: [{ field: 'developerProfile', code: 'PROFILE_NOT_VERIFIED' }],
      units: [{ unitId: 'unit-1', blockers: [{ field: 'bedrooms', code: 'REQUIRED' }] }],
    });
  });
});
