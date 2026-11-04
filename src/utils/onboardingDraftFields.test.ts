import { describe, expect, it } from 'vitest';
import { onboardingDraftFields, updateOnboardingDraftField } from './onboardingDraftFields';

describe('onboarding draft fields', () => {
  it('creates labeled input fields from server values and readiness paths', () => {
    expect(onboardingDraftFields({ companyName: 'RealtiQ', directors: [{ name: 'Amina' }], active: true }, ['countryOfResidence'])).toEqual([
      { path: 'companyName', label: 'Company Name', value: 'RealtiQ', inputType: 'text', required: false },
      { path: 'directors[0].name', label: 'Directors 0 Name', value: 'Amina', inputType: 'text', required: false },
      { path: 'active', label: 'Active', value: true, inputType: 'checkbox', required: false },
      { path: 'countryOfResidence', label: 'Country Of Residence', value: undefined, inputType: 'text', required: true },
    ]);
  });

  it('updates a missing nested path without losing existing values or changing scalar types', () => {
    const current = { companyName: 'RealtiQ', directors: [{ name: 'Amina' }], seats: 2, active: true };
    const updated = updateOnboardingDraftField(current, 'countryOfResidence', 'NG');
    const updatedDirector = updateOnboardingDraftField(updated, 'directors[0].name', 'Ada');
    const updatedCount = updateOnboardingDraftField(updatedDirector, 'seats', 3);

    expect(updatedCount).toEqual({ companyName: 'RealtiQ', directors: [{ name: 'Ada' }], seats: 3, active: true, countryOfResidence: 'NG' });
    expect(current.directors[0].name).toBe('Amina');
  });
});
