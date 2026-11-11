import { describe, expect, it } from 'vitest';
import type { ProfileEvidence, ProfileEvidenceContract } from '../services/verificationCaseService';
import { availableIndividualEvidence, identityRouteContractIssue, internationalIdentityUnavailable } from './individualKycEvidence';

const contract: ProfileEvidenceContract = {
  version: 1,
  formats: ['application/pdf'],
  purposes: ['passport', 'residence_national_id', 'overseas_address_proof'],
  documentKinds: { residence_national_id: ['national_id_card'] },
  maxBytes: 1024,
  policies: { acceptedIdentity: { state: 'configured' } },
  acceptedInternationalIds: [],
  individualRoutes: {
    nigerian: ['bvn', 'nin', 'additional_government_id', 'proof_of_address'],
    international: ['passport', 'residence_national_id', 'overseas_address_proof'],
  },
  serviceAreaSource: { state: 'not_applicable' },
  subjects: { fixed: ['self'], personFields: [] },
};

const evidence = (overrides: Partial<ProfileEvidence>): ProfileEvidence => ({
  id: 'evidence-current', profileId: 'profile-1', purpose: 'nin', subject: 'self', documentKind: 'nin_slip', version: 2,
  previousEvidenceId: null, mimeType: 'application/pdf', size: 100, state: 'available', errorCode: null,
  contentValidatedAt: null, createdAt: '2026-11-01T00:00:00.000Z', ...overrides,
});

describe('individual buyer KYC evidence contract', () => {
  it('requires all backend contract purposes for the Nigerian route', () => {
    expect(identityRouteContractIssue(contract, 'nigerian')).toBeNull();
    expect(identityRouteContractIssue({ ...contract, individualRoutes: { ...contract.individualRoutes, nigerian: ['nin'] } }, 'nigerian'))
      .toMatch(/bvn, nin, additional government id, proof of address/i);
  });

  it('blocks international KYC when the accepted list is empty or its populated item schema is undocumented', () => {
    expect(internationalIdentityUnavailable({ ...contract, acceptedInternationalIds: [] }))
      .toMatch(/accepted international identity document list has not been configured/i);
    expect(internationalIdentityUnavailable({ ...contract, acceptedInternationalIds: undefined as unknown as unknown[] }))
      .toMatch(/accepted international identity document list has not been configured/i);
    expect(internationalIdentityUnavailable({ ...contract, acceptedInternationalIds: [null] }))
      .toMatch(/country and document format is not defined/i);
    expect(identityRouteContractIssue({ ...contract, acceptedInternationalIds: [null] }, 'international'))
      .toMatch(/international KYC is unavailable/i);
  });

  it('offers only available self evidence for the current profile and excludes replaced versions', () => {
    const items = [
      evidence({ id: 'old', version: 1 }),
      evidence({ id: 'new', version: 2, previousEvidenceId: 'old' }),
      evidence({ id: 'other-profile', profileId: 'profile-2' }),
      evidence({ id: 'other-person', subject: 'directors[0]' }),
      evidence({ id: 'pending', state: 'validating' }),
    ];
    expect(availableIndividualEvidence(items, 'profile-1', 'nin').map(({ id }) => id)).toEqual(['new']);
  });
});
