import { describe, expect, it } from 'vitest';
import { isStaffKycProfile, isSupportedApplicantKycProfile } from './supportedKycProfile';

describe('KYC profile routing', () => {
  it('accepts only the documented kind and structure combinations', () => {
    expect(isSupportedApplicantKycProfile('buyer', 'individual')).toBe(true);
    expect(isSupportedApplicantKycProfile('buyer', 'company')).toBe(true);
    expect(isSupportedApplicantKycProfile('buyer', 'cooperative')).toBe(true);
    expect(isSupportedApplicantKycProfile('owner', 'individual')).toBe(true);
    expect(isSupportedApplicantKycProfile('developer', 'company')).toBe(true);
    expect(isSupportedApplicantKycProfile('inspection_partner', 'company')).toBe(true);
  });

  it('does not improvise unsupported profile combinations or applicant KYC for staff', () => {
    expect(isSupportedApplicantKycProfile('owner', 'company')).toBe(false);
    expect(isSupportedApplicantKycProfile('developer', 'individual')).toBe(false);
    expect(isSupportedApplicantKycProfile('inspection_partner', 'cooperative')).toBe(false);
    expect(isStaffKycProfile('staff')).toBe(true);
    expect(isStaffKycProfile('buyer')).toBe(false);
  });
});
