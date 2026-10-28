/**
 * Single frontend schema registry for the mounted Console policy routes.
 * Field names and constraints are from the policy contracts supplied in the
 * local handoff. Values are never seeded as approved defaults.
 */
export interface AdminPolicyField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object' | 'nullable';
  help?: string;
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  options?: readonly string[];
  minItems?: number;
  maxItems?: number;
  /** Number of array rows follows another numeric field in the same object. */
  lengthFrom?: string;
  /** Item maximum is additionally limited by another numeric field in the same object. */
  itemMaxFrom?: string;
  unique?: boolean;
  item?: AdminPolicyField;
  fields?: readonly AdminPolicyField[];
  nullableType?: 'string' | 'number';
}

export interface AdminPolicyDefinition {
  label: string;
  category: string;
  department: string;
  fields: readonly AdminPolicyField[];
  note?: string;
}

const s = (key: string, label: string, options: Partial<AdminPolicyField> = {}): AdminPolicyField => ({ key, label, type: 'string', ...options });
const n = (key: string, label: string, min: number, max: number, options: Partial<AdminPolicyField> = {}): AdminPolicyField => ({ key, label, type: 'number', min, max, integer: true, ...options });
const b = (key: string, label: string, options: Partial<AdminPolicyField> = {}): AdminPolicyField => ({ key, label, type: 'boolean', ...options });
const e = (key: string, label: string, options: readonly string[], extra: Partial<AdminPolicyField> = {}): AdminPolicyField => ({ key, label, type: 'enum', options, ...extra });
const nullable = (key: string, label: string, nullableType: 'string' | 'number', options: Partial<AdminPolicyField> = {}): AdminPolicyField => ({ key, label, type: 'nullable', nullableType, ...options });
const obj = (key: string, label: string, fields: readonly AdminPolicyField[], options: Partial<AdminPolicyField> = {}): AdminPolicyField => ({ key, label, type: 'object', fields, ...options });
const arr = (key: string, label: string, item: AdminPolicyField, minItems = 0, maxItems = 1000, options: Partial<AdminPolicyField> = {}): AdminPolicyField => ({ key, label, type: 'array', item, minItems, maxItems, ...options });
const strItem = (options: Partial<AdminPolicyField> = {}): AdminPolicyField => s('_item', 'Value', options);
const numItem = (min: number, max: number, options: Partial<AdminPolicyField> = {}): AdminPolicyField => n('_item', 'Value', min, max, options);
const enumItem = (options: readonly string[]): AdminPolicyField => e('_item', 'Value', options);
const retrySeconds = (max: number, help?: string, lengthFrom?: string, itemMaxFrom?: string) => arr('retrySeconds', 'Retry delays (seconds)', numItem(1, max, { itemMaxFrom }), 0, 100, { help, lengthFrom });
const sourceOptions = ['original_document', 'official_registry', 'approved_provider'] as const;
const keyPattern = '^[a-z][a-z0-9_]{0,79}$';
const objectArray = (key: string, label: string, fields: readonly AdminPolicyField[], minItems: number, maxItems: number, help?: string) => arr(key, label, obj('_item', 'Entry', fields), minItems, maxItems, { help });

const definitions = {
  identity_email: {
    label: 'Identity email', category: 'Identity and profiles', department: 'technical',
    fields: [
      n('verificationTtlSeconds', 'Verification TTL (seconds)', 300, 604800),
      n('resetTtlSeconds', 'Reset TTL (seconds)', 300, 86400),
      n('cooldownSeconds', 'Cooldown (seconds)', 30, 86400, { help: 'Must not exceed either TTL.' }),
      n('deliveryAttempts', 'Delivery attempts', 1, 10),
      retrySeconds(86400, 'Enter exactly one nondecreasing delay per delivery attempt.', 'deliveryAttempts'),
    ],
  },
  contact_verification: {
    label: 'Contact verification', category: 'Identity and profiles', department: 'technical',
    fields: [
      n('codeLength', 'Code length', 6, 8), n('ttlSeconds', 'Code TTL (seconds)', 60, 900),
      n('cooldownSeconds', 'Cooldown (seconds)', 30, 3600), n('maxAttempts', 'Maximum code attempts', 1, 10),
      n('windowSeconds', 'Request window (seconds)', 30, 86400, { help: 'Must be at least the cooldown.' }),
      n('maxRequests', 'Maximum requests', 1, 20), n('deliveryAttempts', 'Delivery attempts', 1, 5),
      retrySeconds(900, 'Enter exactly one nondecreasing delay per delivery attempt; each delay cannot exceed the code TTL.', 'deliveryAttempts', 'ttlSeconds'),
    ],
  },
  profile_invitations: {
    label: 'Profile invitations', category: 'Identity and profiles', department: 'technical',
    fields: [n('ttlSeconds', 'Invitation TTL (seconds)', 300, 2592000), n('deliveryAttempts', 'Delivery attempts', 1, 10), retrySeconds(2592000, 'Enter exactly one nondecreasing delay per delivery attempt; each delay cannot exceed the invitation TTL.', 'deliveryAttempts', 'ttlSeconds')],
  },
  profile_seats: {
    label: 'Profile seats', category: 'Identity and profiles', department: 'sales_partnerships',
    fields: [e('currency', 'Currency', ['NGN']), objectArray('plans', 'Seat plans', [
      s('key', 'Plan key', { maxLength: 40, pattern: '^[a-z][a-z0-9_-]{0,39}$' }), s('label', 'Plan label', { minLength: 1, maxLength: 100 }),
      n('amountMinor', 'Amount (minor units)', 1, 100000000000), n('durationDays', 'Duration (days)', 1, 3650),
    ], 1, 50)],
  },
  notification_delivery: {
    label: 'Notification delivery', category: 'Notifications and delivery', department: 'technical',
    fields: [b('email', 'Email channel'), b('sms', 'SMS channel'), b('whatsapp', 'WhatsApp channel'), b('push', 'Push channel'), n('maxAttempts', 'Maximum delivery attempts', 1, 20), retrySeconds(604800, 'Enter exactly one nondecreasing delay per attempt.', 'maxAttempts')],
  },
  company_verification: {
    label: 'Company verification', category: 'Verification, trust, and credentials', department: 'compliance_data_protection',
    fields: [
      s('legalPolicyReference', 'Legal policy reference', { minLength: 1, maxLength: 300 }),
      arr('manualSources', 'Manual review sources', enumItem(sourceOptions), 1, 3, { unique: true }),
      objectArray('internationalIds', 'International ID definitions', [s('country', 'Country code', { pattern: '^[A-Z]{2}$' }), s('key', 'Identifier key', { pattern: '^[a-z][a-z0-9_]{0,79}$' }), s('label', 'Label', { minLength: 1, maxLength: 120 })], 0, 1000),
      arr('nonExpiringPurposes', 'Non-expiring evidence purposes', strItem({ help: 'Use a purpose from the backend profile-evidence purpose enum. The exact option list is not present in the local frontend handoff; the backend validates values.' }), 0, 1000, { unique: true, help: 'The backend validates profile-evidence purpose values; the exact enum list is not available in this frontend contract.' }),
      e('corporateBuyerScuml', 'Corporate buyer SCUML policy', ['required', 'case_review']), n('reminderDays', 'Reminder interval (days)', 1, 365),
    ],
    note: 'Legal-policy references are operator-supplied references validated by the backend; they do not prove external approval.',
  },
  verification_case_review: {
    label: 'Verification case review', category: 'Verification, trust, and credentials', department: 'trust_safety',
    fields: [n('reviewDeadlineMinutes', 'Review deadline (minutes)', 1, 525600), n('escalationDelayMinutes', 'Escalation delay (minutes)', 1, 525600), arr('seniorRecipientIds', 'Senior Trust & Safety recipient account IDs', strItem({ pattern: '^[a-fA-F0-9]{24}$', help: 'The backend revalidates senior Trust & Safety and Executive eligibility.' }), 1, 50, { unique: true })],
  },
  partner_credential_requirements: {
    label: 'Partner credential requirements', category: 'Verification, trust, and credentials', department: 'compliance_data_protection',
    fields: [s('legalPolicyReference', 'Legal policy reference', { minLength: 1, maxLength: 300 }), s('approvedUntil', 'Approved until (ISO-8601)', { pattern: '^\\d{4}-\\d{2}-\\d{2}T.*(?:Z|[+-]\\d{2}:?\\d{2})$' }), objectArray('requirements', 'Credential requirements', [
      s('profileKind', 'Profile kind', { help: 'Enter a backend SPECIALTIES profile-kind value; exact choices are not in the local frontend handoff.' }),
      s('specialty', 'Specialty', { help: 'Enter a backend SPECIALTIES value; exact choices are not in the local frontend handoff.' }),
      arr('requiredLicenseKinds', 'Required license kinds', strItem({ help: 'Enter backend LICENSE_KINDS values; exact choices are not in the local frontend handoff.' }), 0, 50, { unique: true }),
      b('insuranceRequired', 'Insurance required'), b('proxyVettingRequired', 'Proxy vetting required'),
    ], 0, 1000)],
    note: 'The backend requires a complete row for every supported profile-kind/specialty pair. The exact pair and license enums are not in the local frontend handoff; the server validates them.',
  },
  private_evidence: {
    label: 'Private evidence', category: 'Verification, trust, and credentials', department: 'technical',
    fields: [n('maxBytes', 'Maximum file size (bytes)', 1024, 52428800), n('scanAttempts', 'Scan attempts', 1, 10), arr('retrySeconds', 'Scan retry delays (seconds)', numItem(1, 86400), 0, 10, { lengthFrom: 'scanAttempts', help: 'Enter exactly one nondecreasing delay per scan attempt.' }), obj('scanner', 'Scanner configuration', [
      e('backend', 'Scanner backend', ['clamav_mtls']), s('serviceId', 'Scanner service ID', { minLength: 1, maxLength: 100 }), s('approvedUntil', 'Approved until (ISO-8601)', { pattern: '^\\d{4}-\\d{2}-\\d{2}T.*(?:Z|[+-]\\d{2}:?\\d{2})$' }),
      arr('allowedEngineVersions', 'Allowed engine versions', strItem({ pattern: '^\\d+\\.\\d+\\.\\d+$' }), 1, 20, { unique: true }), n('minimumDatabaseVersion', 'Minimum database version', 1, 1000000000), n('timeoutSeconds', 'Scanner timeout (seconds)', 5, 120),
    ])],
    note: 'This policy does not supply scanner service credentials or certificates. Runtime scanner readiness is a separate deployment dependency.',
  },
  listing_verification: {
    label: 'Listing verification', category: 'Verification, trust, and credentials', department: 'listings_quality',
    fields: [s('policyReference', 'Policy reference', { minLength: 1, maxLength: 160 }), s('policyPath', 'Policy path', { pattern: '^/verification-policy/[A-Za-z0-9_-]{1,80}$' }), n('minimumPhotos', 'Minimum photos', 1, 20), arr('completedShotTypes', 'Completed shot types', enumItem(['exterior', 'living_area', 'kitchen', 'bedroom_or_main_room']), 1, 4, { unique: true }), n('offPlanRenderMinimum', 'Off-plan render minimum', 1, 20), n('offPlanSitePhotoMinimum', 'Off-plan site-photo minimum', 1, 20), arr('approvedSources', 'Approved evidence sources', enumItem(sourceOptions), 1, 3, { unique: true })],
  },
  trust_tier_thresholds: {
    label: 'Trust tier thresholds', category: 'Verification, trust, and credentials', department: 'data_market_intelligence',
    fields: [n('platinumMinimumScore', 'Platinum minimum score', 0, 100), n('goldMinimumScore', 'Gold minimum score', 0, 100), n('silverMinimumScore', 'Silver minimum score', 0, 100), n('bronzeMinimumScore', 'Bronze minimum score', 0, 100)],
  },
  title_verification_disclosure: {
    label: 'Title verification disclosure', category: 'Verification, trust, and credentials', department: 'legal_verification',
    fields: [s('policyReference', 'Policy reference', { minLength: 1, maxLength: 160 }), s('policyPath', 'Policy path', { pattern: '^/verification-policy/[A-Za-z0-9_-]{1,80}$' }), s('counselApprovalReference', 'Counsel approval reference', { minLength: 1, maxLength: 300 }), s('warrantyDisclosure', 'Warranty disclosure', { minLength: 1, maxLength: 500, help: 'Must state that the process is administrative validation and is not a statutory title warranty.' }), objectArray('sources', 'Sources', [s('key', 'Source key', { pattern: keyPattern }), s('label', 'Source label', { minLength: 1, maxLength: 120 })], 1, 50), objectArray('checks', 'Checks', [s('key', 'Check key', { pattern: keyPattern }), s('label', 'Check label', { minLength: 1, maxLength: 120 })], 1, 50)],
  },
  legacy_custody_movement: {
    label: 'Legacy custody movement', category: 'Private files and custody', department: 'compliance_data_protection',
    fields: [e('strategy', 'Custody strategy', ['sealed_quarantine_no_release']), s('legalPolicyReference', 'Legal policy reference', { minLength: 1, maxLength: 300 }), s('custodianReference', 'Custodian reference', { minLength: 1, maxLength: 300 }), s('retentionPolicyReference', 'Retention policy reference', { minLength: 1, maxLength: 300 }), arr('allowedReasons', 'Allowed custody reasons', strItem({ help: 'The backend custodyReasons enum is not listed in the local frontend handoff; the backend validates these values.' }), 1, 100, { unique: true }), n('maxBytes', 'Maximum bytes', 1, 2147483648), n('transferTimeoutSeconds', 'Transfer timeout (seconds)', 1, 3600), n('attempts', 'Attempts', 1, 10), arr('retrySeconds', 'Retry delays (seconds)', numItem(1, 86400), 0, 10, { lengthFrom: 'attempts', help: 'Enter exactly one nondecreasing delay per attempt.' }), s('approvedUntil', 'Approved until (ISO-8601)', { pattern: '^\\d{4}-\\d{2}-\\d{2}T.*(?:Z|[+-]\\d{2}:?\\d{2})$' })],
  },
  legacy_file_custody: {
    label: 'Legacy file custody', category: 'Private files and custody', department: 'compliance_data_protection',
    fields: [e('strategy', 'Custody strategy', ['metadata_hold_only']), s('legalPolicyReference', 'Legal policy reference', { minLength: 1, maxLength: 300 }), arr('allowedReasons', 'Allowed custody reasons', strItem({ help: 'The backend custodyReasons enum is not listed in the local frontend handoff; the backend validates these values.' }), 1, 100, { unique: true }), s('approvedUntil', 'Approved until (ISO-8601)', { pattern: '^\\d{4}-\\d{2}-\\d{2}T.*(?:Z|[+-]\\d{2}:?\\d{2})$' })],
  },
  legacy_file_mapping: {
    label: 'Legacy file mapping', category: 'Private files and custody', department: 'compliance_data_protection',
    fields: [s('legalPolicyReference', 'Legal policy reference', { minLength: 1, maxLength: 300 }), arr('manualSources', 'Manual mapping sources', enumItem(sourceOptions), 1, 3, { unique: true }), s('approvedUntil', 'Approved until (ISO-8601)', { pattern: '^\\d{4}-\\d{2}-\\d{2}T.*(?:Z|[+-]\\d{2}:?\\d{2})$' })],
  },
  private_file_migration: {
    label: 'Private file migration', category: 'Private files and custody', department: 'technical',
    fields: [e('strategy', 'Migration strategy', ['cloudinary_provider_attestation']), s('legalPolicyReference', 'Legal policy reference', { minLength: 1, maxLength: 300 }), s('providerCapabilityReference', 'Provider capability reference', { minLength: 1, maxLength: 300 }), s('approvedUntil', 'Approved until (ISO-8601)', { pattern: '^\\d{4}-\\d{2}-\\d{2}T.*(?:Z|[+-]\\d{2}:?\\d{2})$' }), n('attempts', 'Attempts', 1, 10), arr('retrySeconds', 'Retry delays (seconds)', numItem(1, 86400), 0, 10, { lengthFrom: 'attempts', help: 'Enter exactly one nondecreasing delay per attempt.' })],
  },
  legacy_bound_media: {
    label: 'Legacy bound media', category: 'Private files and custody', department: 'technical',
    fields: [s('legalPolicyReference', 'Legal policy reference', { minLength: 1, maxLength: 300 }), s('providerCapabilityReference', 'Provider capability reference', { minLength: 1, maxLength: 300 }), nullable('videoInspectorSha256', 'Video inspector SHA-256', 'string', { pattern: '^[A-Fa-f0-9]{64}$', help: 'Choose null or enter exactly 64 hexadecimal characters.' }), objectArray('entries', 'Media policy entries', [
      s('purpose', 'Legacy media purpose', { help: 'Exact purpose enum is not present in the local frontend handoff; the backend validates purpose/MIME combinations.' }), s('mimeType', 'MIME type', { pattern: '^[a-zA-Z0-9!#$&^_.+-]+/[a-zA-Z0-9!#$&^_.+-]+$', help: 'Enter a syntactically valid MIME type. The allowed MIME values depend on the backend purpose.' }), n('maxBytes', 'Maximum bytes', 1, 2147483648), nullable('maxDurationSeconds', 'Maximum duration (seconds)', 'number', { min: 1, max: 86400 }), n('maxSequencePages', 'Maximum sequence pages', 1, 100), arr('allowedVideoCodecs', 'Allowed video codecs', strItem({ help: 'Enter backend-approved codec values.' }), 0, 50, { unique: true }), arr('allowedAudioCodecs', 'Allowed audio codecs', strItem({ help: 'Enter backend-approved codec values.' }), 0, 50, { unique: true }), nullable('signatureHex', 'File signature (hex)', 'string', { pattern: '^(?:[A-Fa-f0-9]{2}){4,64}$' }),
    ], 1, 100), n('transferTimeoutSeconds', 'Transfer timeout (seconds)', 1, 3600), s('approvedUntil', 'Approved until (ISO-8601)', { pattern: '^\\d{4}-\\d{2}-\\d{2}T.*(?:Z|[+-]\\d{2}:?\\d{2})$' })],
    note: 'Purpose/MIME compatibility, codec allowlists, video-specific combinations, and purpose-specific size limits remain backend-validated. Exact purpose enum values are not available here, so the frontend does not invent them.',
  },
  recommended_weights: {
    label: 'Recommended weights', category: 'Search and discovery', department: 'data_market_intelligence',
    fields: [n('verification', 'Verification weight', 0, 1, { integer: false }), n('media', 'Media weight', 0, 1, { integer: false }), n('freshness', 'Freshness weight', 0, 1, { integer: false }), n('profileCompleteness', 'Profile completeness weight', 0, 1, { integer: false }), n('sponsored', 'Sponsored weight', 0, 1, { integer: false })],
  },
  profile_completeness_criteria: {
    label: 'Profile completeness criteria', category: 'Search and discovery', department: 'data_market_intelligence',
    fields: [objectArray('criteria', 'Completeness criteria', [s('field', 'Public profile field', { help: 'Use only an approved public profile-card completeness field; the exact backend allowlist is not present in this local frontend.' }), n('weight', 'Weight', 0, 1, { integer: false }), s('sourceReference', 'Source reference', { minLength: 1, maxLength: 240, pattern: '^RQS-03.*' })], 1, 1000)],
    note: 'The backend public-field allowlist is not present in this local frontend. Do not include private KYC or non-public fields; the backend validates the submitted field names.',
  },
  sponsored_placements: {
    label: 'Sponsored placements', category: 'Search and discovery', department: 'data_market_intelligence',
    fields: [objectArray('placements', 'Sponsored placements', [s('placementId', 'Placement ID', { minLength: 1, maxLength: 100, pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$' }), s('propertyId', 'Property ID', { pattern: '^[a-fA-F0-9]{24}$' }), e('status', 'Placement status', ['active', 'suspended', 'revoked']), s('startsAt', 'Starts at (ISO-8601)', { pattern: '^\\d{4}-\\d{2}-\\d{2}T.*(?:Z|[+-]\\d{2}:?\\d{2})$' }), s('expiresAt', 'Expires at (ISO-8601)', { pattern: '^\\d{4}-\\d{2}-\\d{2}T.*(?:Z|[+-]\\d{2}:?\\d{2})$' })], 0, 10000)],
    note: 'An active record does not guarantee placement eligibility; publication, advertiser, time-window, and revocation checks remain backend-authoritative.',
  },
  fx_search_rates: {
    label: 'FX search rates', category: 'Search and discovery', department: 'finance',
    fields: [b('enabled', 'FX source enabled'), s('provider', 'Provider', { minLength: 1, maxLength: 80, pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$' }), s('series', 'Rate series', { minLength: 1, maxLength: 160, pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$' }), n('maximumAgeMinutes', 'Maximum rate age (minutes)', 1, 525600), s('approvalReference', 'Approval reference', { minLength: 1, maxLength: 300 })],
    note: 'This policy selects an approved source/series; it does not contain or fabricate FX rates.',
  },
  saved_search_cadence: {
    label: 'Saved-search cadence', category: 'Search and discovery', department: 'data_market_intelligence',
    fields: [s('defaultTimeZone', 'Default IANA time zone', { maxLength: 100, help: 'Enter a valid IANA time zone, for example a policy-owner-approved region identifier.' }), s('dailyLocalTime', 'Daily local time (HH:mm)', { pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' }), n('weeklyDayOfWeek', 'Weekly day of week (0–6)', 0, 6), s('weeklyLocalTime', 'Weekly local time (HH:mm)', { pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' })],
  },
  freshness: {
    label: 'Freshness', category: 'Search and discovery', department: 'listings_quality',
    fields: [n('reminderDays', 'Reminder after (days)', 1, 3650), n('needsConfirmationDays', 'Confirmation required after (days)', 1, 3650), n('checkoutPauseDays', 'Checkout pause after (days)', 1, 3650)],
  },
  owner_listing_cap: {
    label: 'Owner listing cap', category: 'Plans and payouts', department: 'trust_safety', fields: [n('activeListings', 'Maximum active listings', 1, 1000000)],
  },
  plan_publication_gates: {
    label: 'Plan publication gates', category: 'Plans and payouts', department: 'sales_partnerships',
    fields: [b('developer', 'Developer publication'), b('agency', 'Agency publication'), b('partner', 'Partner publication'), n('graceDays', 'Grace period (days)', 0, 365)],
  },
  profile_publication_plans: {
    label: 'Profile publication plans', category: 'Plans and payouts', department: 'sales_partnerships',
    fields: [e('currency', 'Currency', ['NGN']), objectArray('plans', 'Publication plans', [s('key', 'Plan key', { maxLength: 40, pattern: '^[a-z][a-z0-9_-]{0,39}$' }), s('label', 'Plan label', { minLength: 1, maxLength: 100 }), n('amountMinor', 'Amount (minor units)', 1, 100000000000), n('durationDays', 'Duration (days)', 1, 3650), arr('categories', 'Eligible profile categories', enumItem(['developer', 'agency', 'partner']), 1, 3, { unique: true })], 1, 50)],
    note: 'Plan presence does not establish payment-provider readiness or purchase availability.',
  },
  profile_payout_setup: {
    label: 'Profile payout setup', category: 'Plans and payouts', department: 'finance',
    fields: [e('provider', 'Payout provider', ['monnify']), e('currency', 'Currency', ['NGN']), n('defaultSplitPercentage', 'Default split percentage', 0, 100, { integer: false }), s('legalPolicyReference', 'Legal policy reference', { minLength: 1, maxLength: 300 }), s('splitPolicyReference', 'Split policy reference', { minLength: 1, maxLength: 300 }), s('approvedUntil', 'Approved until (ISO-8601)', { pattern: '^\\d{4}-\\d{2}-\\d{2}T.*(?:Z|[+-]\\d{2}:?\\d{2})$' })],
    note: 'The commercial split is policy-owner input. This policy does not supply provider credentials or establish payout readiness.',
  },
  commercial_uses: {
    label: 'Commercial uses', category: 'Listings and data', department: 'listings_quality',
    fields: [objectArray('entries', 'Commercial-use entries', [s('key', 'Use key', { pattern: keyPattern }), s('label', 'Label', { minLength: 1, maxLength: 100 })], 1, 500)],
  },
  power_capacity_units: {
    label: 'Power capacity units', category: 'Listings and data', department: 'listings_quality',
    fields: [arr('units', 'Power capacity units', strItem({ minLength: 1, maxLength: 20 }), 1, 20, { unique: true })],
  },
  retention: {
    label: 'Retention', category: 'Listings and data', department: 'compliance_data_protection',
    fields: [n('transactionYears', 'Transaction retention (years)', 1, 100), n('unusedPersonalDataDays', 'Unused personal-data retention (days)', 1, 36500), s('legalPolicyReference', 'Legal policy reference', { minLength: 1 }), s('retentionScheduleVersion', 'Retention schedule version', { required: false, maxLength: 80, pattern: '^[A-Za-z0-9._-]{1,80}$' })],
    note: 'Saving this policy does not immediately delete data or authorize deletion of financial evidence or permanent staff audit records.',
  },
} satisfies Record<string, AdminPolicyDefinition>;

export type AdminPolicyKey = keyof typeof definitions;
export type AdminPolicyCategory = (typeof definitions)[AdminPolicyKey]['category'];
export type AdminPolicyEditorKind = 'schema';

export const adminPolicyRegistry = Object.entries(definitions).map(([key, definition]) => ({ key: key as AdminPolicyKey, ...definition }));
export const adminPolicyKeys = adminPolicyRegistry.map(({ key }) => key);

export const getAdminPolicyMetadata = (key: AdminPolicyKey) => definitions[key];
export const getAdminPolicyCategories = () => [...new Set(adminPolicyRegistry.map(({ category }) => category))];
