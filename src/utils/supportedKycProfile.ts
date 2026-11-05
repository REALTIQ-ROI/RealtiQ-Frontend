const supportedStructures: Readonly<Record<string, readonly string[]>> = {
  buyer: ['individual', 'company', 'cooperative'],
  owner: ['individual'],
  agency: ['individual', 'company'],
  developer: ['company'],
  legal_partner: ['individual', 'company'],
  engineering_survey_partner: ['individual', 'company'],
  inspection_partner: ['individual', 'company'],
  valuation_partner: ['individual', 'company'],
  buyers_agent: ['individual', 'company'],
  sellers_agent: ['individual', 'company'],
};

/**
 * KYC routing follows the server-selected profile kind and structure. Account roles
 * are deliberately not used here because one account can hold different profiles.
 */
export const isSupportedApplicantKycProfile = (kind: string, structure: string): boolean =>
  supportedStructures[kind]?.includes(structure) ?? false;

export const isStaffKycProfile = (kind: string): boolean => kind === 'staff';
