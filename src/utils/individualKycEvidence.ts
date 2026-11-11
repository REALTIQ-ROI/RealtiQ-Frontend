import type { ProfileEvidence, ProfileEvidenceContract } from '../services/verificationCaseService';

const requiredPurposes: Record<'nigerian' | 'international', string[]> = {
  nigerian: ['bvn', 'nin', 'additional_government_id', 'proof_of_address'],
  international: ['passport', 'residence_national_id', 'overseas_address_proof'],
};

export const internationalIdentityUnavailable = (contract: ProfileEvidenceContract | null): string | null => {
  if (!contract || contract.policies.acceptedIdentity?.state !== 'configured' ||
    !Array.isArray(contract.acceptedInternationalIds) || !contract.acceptedInternationalIds.length) {
    return 'International KYC submission is unavailable because the accepted international identity document list has not been configured. Please contact support.';
  }
  return 'The backend returned accepted international identity entries, but their country and document format is not defined in the frontend contract. International KYC is unavailable until those choices can be safely shown.';
};

export const identityRouteContractIssue = (
  contract: ProfileEvidenceContract | null, route: 'nigerian' | 'international',
): string | null => {
  if (route === 'international') {
    const unavailable = internationalIdentityUnavailable(contract);
    if (unavailable) return unavailable;
  }
  const returnedPurposes = contract?.individualRoutes[route] ?? [];
  const missing = requiredPurposes[route].filter((purpose) => !returnedPurposes.includes(purpose));
  if (missing.length) {
    return `The backend evidence contract is incomplete for the ${route} identity route. Required evidence is ${requiredPurposes[route].map((purpose) => purpose.replaceAll('_', ' ')).join(', ')}. Refresh the requirements or contact support.`;
  }
  return null;
};

/** A file for another person or a replaced version cannot identify this applicant. */
export const availableIndividualEvidence = (
  evidence: readonly ProfileEvidence[], profileId: string, purpose: string,
): ProfileEvidence[] => {
  const profileEvidence = evidence.filter((item) => item.profileId === profileId);
  const replacedIds = new Set(profileEvidence.flatMap((item) => item.previousEvidenceId ? [item.previousEvidenceId] : []));
  return profileEvidence.filter((item) => item.subject === 'self' && item.purpose === purpose && item.state === 'available' && !replacedIds.has(item.id));
};
