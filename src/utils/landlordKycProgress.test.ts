import { describe, expect, it } from 'vitest';
import { buildLandlordKycProgress } from './landlordKycProgress';

const input = (overrides: Partial<Parameters<typeof buildLandlordKycProgress>[0]> = {}) => ({
  verificationStatus: 'not_submitted',
  cases: [],
  availableEvidenceCount: 0,
  hasOnboardingDraft: true,
  ...overrides,
});

describe('buildLandlordKycProgress', () => {
  it('advances in order when profile details and evidence are available', () => {
    const progress = buildLandlordKycProgress(input({ availableEvidenceCount: 2 }));

    expect(progress.approved).toBe(false);
    expect(progress.percent).toBe(50);
    expect(progress.steps.map(({ state }) => state)).toEqual(['complete', 'complete', 'current', 'upcoming']);
    expect(progress.summary).toContain('Profile review is complete');
    expect(progress.nextAction).toContain('submit a verification case');
  });

  it('keeps later steps upcoming when evidence is missing', () => {
    const progress = buildLandlordKycProgress(input());

    expect(progress.percent).toBe(25);
    expect(progress.steps.map(({ state }) => state)).toEqual(['complete', 'current', 'upcoming', 'upcoming']);
    expect(progress.steps[2].detail).toContain('opens after profile review and private evidence');
  });

  it('does not advance to evidence until all server-required profile details are complete', () => {
    const progress = buildLandlordKycProgress(input({ availableEvidenceCount: 4, intakeMissingCount: 2 }));

    expect(progress.percent).toBe(0);
    expect(progress.steps.map(({ state }) => state)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);
    expect(progress.steps[0].detail).toContain('Complete 2 required profile details');
    expect(progress.nextAction).toContain('before moving to evidence');
  });

  it('does not advance past profile review when the onboarding draft is unavailable', () => {
    const progress = buildLandlordKycProgress(input({ hasOnboardingDraft: false, availableEvidenceCount: 2 }));

    expect(progress.percent).toBe(0);
    expect(progress.steps.map(({ state }) => state)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);
    expect(progress.steps[1].detail).toContain('this step follows profile review');
  });

  it('shows submitted cases as waiting for an authorized decision', () => {
    const progress = buildLandlordKycProgress(input({
      cases: [{ id: 'case-1', state: 'under_review', submittedAt: '2026-10-30T12:00:00.000Z' }],
    }));

    expect(progress.percent).toBe(75);
    expect(progress.steps.map(({ state }) => state)).toEqual(['complete', 'complete', 'complete', 'waiting']);
    expect(progress.summary).toContain('under review');
    expect(progress.steps[2].detail).toContain('case-1');
  });

  it('uses the most recently submitted case when the loaded history includes older cases', () => {
    const progress = buildLandlordKycProgress(input({
      cases: [
        { id: 'older-case', state: 'rejected', submittedAt: '2026-10-29T10:00:00.000Z' },
        { id: 'newer-case', state: 'under_review', submittedAt: '2026-10-30T10:00:00.000Z' },
      ],
    }));

    expect(progress.summary).toContain('under review');
    expect(progress.steps[2].detail).toContain('newer-case');
  });

  it('shows completion only when the server reports approval', () => {
    const fromProfile = buildLandlordKycProgress(input({ verificationStatus: 'approved', hasOnboardingDraft: false }));
    const fromCase = buildLandlordKycProgress(input({
      verificationStatus: undefined,
      cases: [{ id: 'case-2', state: 'approved', submittedAt: '2026-10-30T12:00:00.000Z' }],
    }));

    expect(fromProfile.percent).toBe(100);
    expect(fromProfile.approved).toBe(true);
    expect(fromProfile.steps.map(({ state }) => state)).toEqual(['complete', 'complete', 'complete', 'complete']);
    expect(fromCase.percent).toBe(100);
    expect(fromCase.summary).toContain('KYC has been approved');
  });

  it('keeps a rejected case incomplete and directs the landlord to its decision', () => {
    const progress = buildLandlordKycProgress(input({
      cases: [{ id: 'case-3', state: 'rejected', submittedAt: '2026-10-30T12:00:00.000Z' }],
    }));

    expect(progress.approved).toBe(false);
    expect(progress.percent).toBe(75);
    expect(progress.steps[3].state).toBe('needs_action');
    expect(progress.nextAction).toContain('rejection codes');
  });

  it('does not treat an unknown case state as approval or as a pending state', () => {
    const progress = buildLandlordKycProgress(input({
      cases: [{ id: 'case-4', state: 'future_state', submittedAt: null }],
    }));

    expect(progress.approved).toBe(false);
    expect(progress.percent).toBe(25);
    expect(progress.steps[3].state).toBe('upcoming');
    expect(progress.steps.map(({ state }) => state)).toEqual(['complete', 'current', 'upcoming', 'upcoming']);
    expect(progress.summary).toContain('future state');
    expect(progress.nextAction).toContain('authoritative status');
  });
});
