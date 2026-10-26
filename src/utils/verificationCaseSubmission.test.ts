import { describe, expect, it } from 'vitest';
import { declaredVerificationPersonPaths, validateVerificationPersonRoutes } from './verificationCaseSubmission';

describe('verification case submission helpers', () => {
  it('derives only declared paths from the current onboarding draft', () => {
    expect(declaredVerificationPersonPaths({ directors: [{ name: 'A' }, null], beneficialOwners: [{ name: 'B' }], principalAgent: null }))
      .toEqual(['directors[0]', 'beneficialOwners[0]']);
  });

  it('requires unique paths, two-letter countries, and NG for the Nigerian route', () => {
    expect(validateVerificationPersonRoutes([{ path: 'directors[0]', route: 'nigerian', country: 'US' }])).toMatch(/requires country NG/);
    expect(validateVerificationPersonRoutes([{ path: 'directors[0]', route: 'international', country: 'USA' }])).toMatch(/two-letter country/);
    expect(validateVerificationPersonRoutes([{ path: 'directors[0]', route: 'international', country: 'US' }, { path: 'directors[0]', route: 'international', country: 'US' }])).toMatch(/unique draft path/);
  });
});
