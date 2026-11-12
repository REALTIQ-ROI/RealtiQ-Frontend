import { describe, expect, it } from 'vitest';
import type { ProfileEvidence } from '../services/verificationCaseService';
import { latestProfileEvidence, profileEvidenceFor } from './profileEvidenceVersions';

const item = (overrides: Partial<ProfileEvidence>): ProfileEvidence => ({
  id: 'record-1', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'nin_slip', version: 1,
  previousEvidenceId: null, mimeType: 'application/pdf', size: 100, state: 'available', errorCode: null,
  contentValidatedAt: null, createdAt: '2026-11-11T10:00:00.000Z', ...overrides,
});

describe('latest profile evidence version', () => {
  it('returns the highest-version record even when it is a deleted tombstone', () => {
    const records = [
      item({ id: 'first', version: 1 }),
      item({ id: 'second', version: 2, previousEvidenceId: 'first', state: 'deleted' }),
      item({ id: 'other-profile', profileId: 'profile-2', version: 20 }),
    ];
    expect(latestProfileEvidence(records, 'profile-1', 'nin', 'self')?.id).toBe('second');
  });

  it('does not borrow IDs from another purpose or subject and returns null for a first upload', () => {
    const records = [
      item({ id: 'bvn', purpose: 'bvn' }),
      item({ id: 'director-nin', subject: 'directors[0]' }),
    ];
    expect(latestProfileEvidence(records, 'profile-1', 'nin', 'self')).toBeNull();
  });

  it('keeps evidence list state scoped to the selected profile', () => {
    const records = [item({ id: 'same-profile' }), item({ id: 'other-profile', profileId: 'profile-2' })];
    expect(profileEvidenceFor(records, 'profile-1').map(({ id }) => id)).toEqual(['same-profile']);
  });
});
