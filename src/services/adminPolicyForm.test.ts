import { describe, expect, it } from 'vitest';
import { adminPolicyKeys, adminPolicyRegistry, getAdminPolicyMetadata } from './adminPolicyRegistry';
import {
  createPolicyDraft,
  findPolicySchemaDrift,
  POLICY_NULL_SENTINEL,
  resizePolicyArraysForCount,
  serializePolicyDraft,
} from './adminPolicyForm';

describe('admin policy schemas and form serialization', () => {
  it('defines editable schemas for all 31 registered backend policy keys', () => {
    expect(adminPolicyKeys).toHaveLength(31);
    expect(adminPolicyRegistry).toHaveLength(31);
    for (const key of adminPolicyKeys) {
      expect(getAdminPolicyMetadata(key).fields.length, `${key} fields`).toBeGreaterThan(0);
    }
  });

  it('creates blank fields for an unconfigured policy without seeding sample values', () => {
    const metadata = getAdminPolicyMetadata('identity_email');
    const draft = createPolicyDraft(metadata.fields, null);
    expect(draft).toEqual({
      verificationTtlSeconds: '', resetTtlSeconds: '', cooldownSeconds: '', deliveryAttempts: '', retrySeconds: [],
    });
    const result = serializePolicyDraft('identity_email', metadata.fields, draft);
    expect(result.value).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('keeps the retry list in sync with an attempt count while preserving existing delays', () => {
    const fields = getAdminPolicyMetadata('identity_email').fields;
    const existing = { deliveryAttempts: '2', retrySeconds: ['30', '90'] };
    expect(resizePolicyArraysForCount(fields, existing, 'deliveryAttempts', '3')).toEqual({
      deliveryAttempts: '3', retrySeconds: ['30', '90', ''],
    });
    expect(resizePolicyArraysForCount(fields, existing, 'deliveryAttempts', '1')).toEqual({
      deliveryAttempts: '1', retrySeconds: ['30'],
    });
  });

  it('converts typed field input to the exact policy DTO and checks cross-field rules', () => {
    const fields = getAdminPolicyMetadata('identity_email').fields;
    const draft = {
      verificationTtlSeconds: '7200', resetTtlSeconds: '1800', cooldownSeconds: '300',
      deliveryAttempts: '2', retrySeconds: ['60', '300'],
    };
    expect(serializePolicyDraft('identity_email', fields, draft)).toEqual({
      value: {
        verificationTtlSeconds: 7200, resetTtlSeconds: 1800, cooldownSeconds: 300,
        deliveryAttempts: 2, retrySeconds: [60, 300],
      },
      errors: [],
    });
    expect(serializePolicyDraft('identity_email', fields, { ...draft, cooldownSeconds: '2000' }).errors)
      .toContain('cooldownSeconds: must not exceed either TTL.');
  });

  it('turns selected channel inputs into booleans and retains the backend retry array shape', () => {
    const fields = getAdminPolicyMetadata('notification_delivery').fields;
    const draft = createPolicyDraft(fields, {
      email: true, sms: false, whatsapp: false, push: true, maxAttempts: 2, retrySeconds: [60, 300],
    });
    expect(serializePolicyDraft('notification_delivery', fields, draft)).toEqual({
      value: { email: true, sms: false, whatsapp: false, push: true, maxAttempts: 2, retrySeconds: [60, 300] },
      errors: [],
    });
  });

  it('defines neutral editable schemas for evidence and current identity-verification policies', () => {
    const evidence = getAdminPolicyMetadata('private_evidence');
    const identity = getAdminPolicyMetadata('company_verification');
    const reminders = getAdminPolicyMetadata('verification_expiry_reminders');
    expect(evidence.label).toBe('Evidence upload policy');
    expect(evidence.department).toBe('technical');
    expect(identity.label).toBe('Identity verification policy');
    expect(identity.department).toBe('compliance_data_protection');
    expect(evidence.fields.map((field) => field.key)).toEqual(['maxBytes']);
    expect(createPolicyDraft(evidence.fields, null)).toEqual({ maxBytes: '' });
    expect(identity.fields.map((field) => field.key)).toEqual(['internationalIds']);
    expect(createPolicyDraft(identity.fields, null)).toEqual({ internationalIds: [] });
    expect(reminders.fields.map((field) => field.key)).toEqual(['reminderDays']);
    expect(createPolicyDraft(reminders.fields, null)).toEqual({ reminderDays: '' });
    expect(serializePolicyDraft('private_evidence', evidence.fields, createPolicyDraft(evidence.fields, null)).value).toBeNull();
    expect(serializePolicyDraft('company_verification', identity.fields, createPolicyDraft(identity.fields, null))).toEqual({ value: { internationalIds: [] }, errors: [] });
  });

  it('loads and serializes only the current private evidence upload-limit field', () => {
    const fields = getAdminPolicyMetadata('private_evidence').fields;
    const value = { maxBytes: 10485760 };
    const draft = createPolicyDraft(fields, value);
    expect(serializePolicyDraft('private_evidence', fields, draft)).toEqual({ value, errors: [] });
    expect(serializePolicyDraft('private_evidence', fields, { maxBytes: '10485760', futureSetting: 'ignored' })).toEqual({
      value: { maxBytes: 10485760 }, errors: [],
    });
    expect(findPolicySchemaDrift(fields, { maxBytes: 10485760, futureSetting: 'ignored' })).toContain('value.futureSetting');
  });

  it('converts company verification to the exact internationalIds DTO and validates entries', () => {
    const fields = getAdminPolicyMetadata('company_verification').fields;
    const value = { internationalIds: [{ country: 'GB', key: 'residence_card', label: 'Residence card' }] };
    const draft = createPolicyDraft(fields, value);
    expect(serializePolicyDraft('company_verification', fields, draft)).toEqual({ value, errors: [] });
    expect(serializePolicyDraft('company_verification', fields, {
      ...draft,
      internationalIds: [
        { country: 'GB', key: 'residence_card', label: 'Residence card' },
        { country: 'GB', key: 'residence_card', label: 'Duplicate key' },
      ],
    }).errors).toEqual(expect.arrayContaining([
      'internationalIds: country and key pairs must be unique.',
    ]));
    expect(serializePolicyDraft('company_verification', fields, {
      ...draft,
      internationalIds: [{ country: 'gb', key: '9_bad', label: 'Bad country and key' }],
    }).errors).toEqual(expect.arrayContaining([
      'value.internationalIds[0].country: value has an invalid format.',
      'value.internationalIds[0].key: value has an invalid format.',
    ]));
    expect(findPolicySchemaDrift(fields, { internationalIds: [], manualSources: ['legacy-only'] })).toContain('value.manualSources');
    expect(serializePolicyDraft('verification_expiry_reminders', getAdminPolicyMetadata('verification_expiry_reminders').fields, { reminderDays: '366' }).errors).toContain('value.reminderDays: enter a value from 1 to 365.');
  });

  it('preserves booleans, numeric values, explicit nulls, and nested array objects', () => {
    const fields = getAdminPolicyMetadata('legacy_bound_media').fields;
    const value = {
      legalPolicyReference: 'LEGAL-1', providerCapabilityReference: 'PROVIDER-1', videoInspectorSha256: null,
      entries: [{
        purpose: 'document', mimeType: 'application/pdf', maxBytes: 2048, maxDurationSeconds: null,
        maxSequencePages: 1, allowedVideoCodecs: [], allowedAudioCodecs: [], signatureHex: null,
      }],
      transferTimeoutSeconds: 30, approvedUntil: '2026-12-01T00:00:00.000Z',
    };
    const draft = createPolicyDraft(fields, value);
    expect(draft.videoInspectorSha256).toBe(POLICY_NULL_SENTINEL);
    const result = serializePolicyDraft('legacy_bound_media', fields, draft);
    expect(result.value).toEqual(value);
    expect(result.errors).toEqual([]);
  });

  it('fails closed when the current value contains an unknown or incompatible field', () => {
    const fields = getAdminPolicyMetadata('notification_delivery').fields;
    expect(findPolicySchemaDrift(fields, { email: true, sms: false, whatsapp: false, push: false, maxAttempts: 1, retrySeconds: [60], futureSetting: true }))
      .toContain('value.futureSetting');
    expect(findPolicySchemaDrift(fields, { email: 'yes', sms: false, whatsapp: false, push: false, maxAttempts: 1, retrySeconds: [60] }))
      .toContain('value.email (type changed)');
  });
});
