import { describe, expect, it } from 'vitest';
import { verificationDecisionSources } from './verificationCaseService';
import {
  buildVerificationDecisionCheck,
  isScumlDecisionCheck,
  verificationSourcesForCheck,
} from './verificationDecisionForm';

describe('staff verification decision form contracts', () => {
  it('uses the fixed decision-source enum and narrows registration and professional evidence sources', () => {
    expect(verificationDecisionSources).toEqual(['original_document', 'official_registry', 'approved_provider']);
    expect(verificationSourcesForCheck('profile.name')).toEqual(verificationDecisionSources);
    expect(verificationSourcesForCheck('evidence.company_registration')).toEqual(['official_registry', 'approved_provider']);
    expect(verificationSourcesForCheck('evidence.professional_coren')).toEqual(['official_registry', 'approved_provider']);
  });

  it('omits expiry fields when the document has no expiry date and never sends a non-expiring exception', () => {
    const result = buildVerificationDecisionCheck('evidence.nin', {
      source: 'original_document', reference: 'private-evidence-reference', expiresAt: '',
    }, Date.parse('2026-11-01T00:00:00.000Z'));
    expect(result).toEqual({ check: {
      field: 'evidence.nin', source: 'original_document', reference: 'private-evidence-reference',
    } });
    expect(result.check).not.toHaveProperty('expiresAt');
    expect(result.check).not.toHaveProperty('nonExpiring');
  });

  it('sends only a valid future document expiry as ISO and rejects invalid or past dates', () => {
    const now = Date.parse('2026-11-01T00:00:00.000Z');
    expect(buildVerificationDecisionCheck('evidence.nin', {
      source: 'original_document', reference: 'evidence-reference', expiresAt: '2027-02-03T12:00',
    }, now)).toEqual({ check: {
      field: 'evidence.nin', source: 'original_document', reference: 'evidence-reference', expiresAt: '2027-02-03T11:00:00.000Z',
    } });
    expect(buildVerificationDecisionCheck('evidence.nin', {
      source: 'original_document', reference: 'evidence-reference', expiresAt: '2026-10-30T12:00',
    }, now).error).toMatch(/future expiry date/);
  });

  it('requires an applicability choice and private supporting reference for server-required SCUML checks', () => {
    expect(isScumlDecisionCheck('companyBuyer.scuml')).toBe(true);
    expect(buildVerificationDecisionCheck('companyBuyer.scuml', {
      source: 'official_registry', reference: 'case-private-reference',
    }).error).toMatch(/SCUML applicability/);
    expect(buildVerificationDecisionCheck('companyBuyer.scuml', {
      source: 'official_registry', reference: 'current-signed-certificate-reference', applicability: 'required',
    })).toEqual({ check: {
      field: 'companyBuyer.scuml', source: 'official_registry', reference: 'current-signed-certificate-reference', applicability: 'required',
    } });
    expect(buildVerificationDecisionCheck('companyBuyer.scuml', {
      source: 'official_registry', reference: 'not-applicable-reference', applicability: 'not_applicable',
    }).check?.applicability).toBe('not_applicable');
  });

  it('rejects source values outside the fixed enum and requires a supporting reference', () => {
    expect(buildVerificationDecisionCheck('identity.name', { source: 'policy-defined', reference: 'ref' }).error).toMatch(/supported source/);
    expect(buildVerificationDecisionCheck('identity.name', { source: 'original_document', reference: ' ' }).error).toMatch(/private supporting reference/);
    expect(buildVerificationDecisionCheck('evidence.company_registration', { source: 'original_document', reference: 'ref' }).error).toMatch(/supported source/);
  });
});
