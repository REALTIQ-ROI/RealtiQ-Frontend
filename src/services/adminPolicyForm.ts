import type { AdminPolicyField, AdminPolicyKey } from './adminPolicyRegistry';
import type { AdminPolicyJsonValue } from './adminPolicyService';

export type PolicyDraftValue = unknown;
export type PolicyDraftPath = Array<string | number>;
export const POLICY_NULL_SENTINEL = '__realtIQ_policy_null__';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
const asArray = (value: unknown): unknown[] | null => Array.isArray(value) ? value : null;

const blankField = (field: AdminPolicyField): unknown => {
  if (field.type === 'object') return Object.fromEntries((field.fields ?? []).filter((child) => child.required !== false).map((child) => [child.key, blankField(child)]));
  if (field.type === 'array') return [];
  return '';
};

export const createPolicyFieldDraft = (field: AdminPolicyField): unknown => blankField(field);

const draftField = (field: AdminPolicyField, source: unknown, hasSource: boolean): unknown => {
  if (!hasSource) return blankField(field);
  if (field.type === 'object') {
    const sourceRecord = asRecord(source) ?? {};
    return Object.fromEntries((field.fields ?? [])
      .filter((child) => child.required !== false || Object.prototype.hasOwnProperty.call(sourceRecord, child.key))
      .map((child) => [child.key, draftField(child, sourceRecord[child.key], Object.prototype.hasOwnProperty.call(sourceRecord, child.key))]));
  }
  if (field.type === 'array') {
    const sourceArray = asArray(source) ?? [];
    return sourceArray.map((item) => draftField(field.item!, item, true));
  }
  if (field.type === 'nullable') {
    if (source === null) return POLICY_NULL_SENTINEL;
    return source === undefined ? '' : String(source);
  }
  if (field.type === 'number') return typeof source === 'number' ? String(source) : '';
  if (field.type === 'boolean') return typeof source === 'boolean' ? String(source) : '';
  return typeof source === 'string' ? source : '';
};

export const createPolicyDraft = (fields: readonly AdminPolicyField[], currentValue: AdminPolicyJsonValue | null): Record<string, unknown> => {
  const current = asRecord(currentValue);
  return Object.fromEntries(fields
    .filter((field) => field.required !== false || Boolean(current && Object.prototype.hasOwnProperty.call(current, field.key)))
    .map((field) => [field.key, draftField(field, current?.[field.key], Boolean(current && Object.prototype.hasOwnProperty.call(current, field.key)))]));
};

export const updatePolicyDraftAtPath = (value: unknown, path: PolicyDraftPath, replacement: unknown): unknown => {
  if (!path.length) return replacement;
  const [head, ...tail] = path;
  if (Array.isArray(value) && typeof head === 'number') {
    return value.map((item, index) => index === head ? updatePolicyDraftAtPath(item, tail, replacement) : item);
  }
  const record = asRecord(value);
  if (record && typeof head === 'string') return { ...record, [head]: updatePolicyDraftAtPath(record[head], tail, replacement) };
  return value;
};

export const appendPolicyDraftItem = (value: unknown, path: PolicyDraftPath, item: AdminPolicyField): unknown => {
  const current = path.reduce<unknown>((node, segment) => Array.isArray(node) && typeof segment === 'number'
    ? node[segment]
    : asRecord(node)?.[String(segment)], value);
  return Array.isArray(current) ? updatePolicyDraftAtPath(value, path, [...current, blankField(item)]) : value;
};

export const removePolicyDraftItem = (value: unknown, path: PolicyDraftPath, index: number): unknown => {
  const current = path.reduce<unknown>((node, segment) => Array.isArray(node) && typeof segment === 'number'
    ? node[segment]
    : asRecord(node)?.[String(segment)], value);
  return Array.isArray(current) ? updatePolicyDraftAtPath(value, path, current.filter((_, itemIndex) => itemIndex !== index)) : value;
};

export const resizePolicyArraysForCount = (
  fields: readonly AdminPolicyField[],
  current: Record<string, unknown>,
  countField: string,
  countDraft: unknown,
): Record<string, unknown> => {
  const next = { ...current, [countField]: countDraft };
  const rawCount = typeof countDraft === 'string' ? countDraft.trim() : countDraft;
  const count = typeof rawCount === 'number' ? rawCount : rawCount === '' ? NaN : Number(rawCount);
  if (!Number.isSafeInteger(count) || count < 0) return next;
  for (const field of fields) {
    if (field.type !== 'array' || field.lengthFrom !== countField || !field.item) continue;
    const existing = asArray(current[field.key]) ?? [];
    const countMaximum = fields.find((candidate) => candidate.key === countField)?.max ?? count;
    const targetCount = Math.min(count, countMaximum, field.maxItems ?? count);
    const resized = existing.slice(0, targetCount);
    while (resized.length < targetCount) resized.push(blankField(field.item));
    next[field.key] = resized;
  }
  return next;
};

export const findPolicySchemaDrift = (fields: readonly AdminPolicyField[], value: AdminPolicyJsonValue | null, prefix = 'value'): string[] => {
  if (value === null) return [];
  const drift: string[] = [];
  const inspect = (field: AdminPolicyField, current: unknown, path: string) => {
    if (field.type === 'object') {
      const record = asRecord(current);
      if (!record) { drift.push(`${path} (expected object)`); return; }
      const known = new Set((field.fields ?? []).map((child) => child.key));
      for (const key of Object.keys(record)) if (!known.has(key)) drift.push(`${path}.${key}`);
      for (const child of field.fields ?? []) if (Object.prototype.hasOwnProperty.call(record, child.key)) inspect(child, record[child.key], `${path}.${child.key}`);
    } else if (field.type === 'array') {
      if (!Array.isArray(current)) { drift.push(`${path} (expected array)`); return; }
      if (field.item) current.forEach((item, index) => inspect(field.item!, item, `${path}[${index}]`));
    } else if (field.type === 'nullable') {
      if (current !== null && (field.nullableType === 'number' ? typeof current !== 'number' : typeof current !== 'string')) drift.push(`${path} (type changed)`);
    } else if (field.type === 'number' && typeof current !== 'number') {
      drift.push(`${path} (type changed)`);
    } else if (field.type === 'boolean' && typeof current !== 'boolean') {
      drift.push(`${path} (type changed)`);
    } else if (field.type === 'string' || field.type === 'enum') {
      if (typeof current !== 'string') drift.push(`${path} (type changed)`);
      else if (field.type === 'enum' && field.options && !field.options.includes(current)) drift.push(`${path} (new enum value)`);
    }
  };
  const record = asRecord(value);
  if (!record) return [`${prefix} (expected an object)`];
  const known = new Set(fields.map((field) => field.key));
  for (const key of Object.keys(record)) if (!known.has(key)) drift.push(`${prefix}.${key}`);
  for (const field of fields) if (Object.prototype.hasOwnProperty.call(record, field.key)) inspect(field, record[field.key], `${prefix}.${field.key}`);
  return drift;
};

interface SerializeContext { errors: string[] }

const serializeField = (field: AdminPolicyField, draft: unknown, path: string, context: SerializeContext): AdminPolicyJsonValue | undefined => {
  const missing = draft === undefined || draft === '';
  if (field.required === false && missing) return undefined;
  if (field.type === 'object') {
    const source = asRecord(draft) ?? {};
    const output: Record<string, AdminPolicyJsonValue> = {};
    for (const child of field.fields ?? []) {
      const serialized = serializeField(child, source[child.key], `${path}.${child.key}`, context);
      if (serialized !== undefined) output[child.key] = serialized;
    }
    return output;
  }
  if (field.type === 'array') {
    const list = asArray(draft) ?? [];
    if (field.minItems !== undefined && list.length < field.minItems) context.errors.push(`${path}: add at least ${field.minItems} item${field.minItems === 1 ? '' : 's'}.`);
    if (field.maxItems !== undefined && list.length > field.maxItems) context.errors.push(`${path}: no more than ${field.maxItems} items are allowed.`);
    const result = list.map((item, index) => serializeField(field.item!, item, `${path}[${index}]`, context) ?? null);
    if (field.unique) {
      const uniqueKeys = result.map((item) => JSON.stringify(item));
      if (new Set(uniqueKeys).size !== uniqueKeys.length) context.errors.push(`${path}: values must be unique.`);
    }
    return result;
  }
  if (field.type === 'nullable') {
    if (draft === POLICY_NULL_SENTINEL || draft === null) return null;
    if (missing) {
      context.errors.push(`${path}: choose null or enter a value.`);
      return null;
    }
    if (field.nullableType === 'number') {
      const number = Number(draft);
      if (!Number.isFinite(number)) context.errors.push(`${path}: enter a valid number or choose null.`);
      else if (field.min !== undefined && number < field.min || field.max !== undefined && number > field.max) context.errors.push(`${path}: value is outside the allowed range.`);
      return Number.isFinite(number) ? number : null;
    }
    const text = String(draft).trim();
    if (field.pattern && !new RegExp(field.pattern).test(text)) context.errors.push(`${path}: value has an invalid format.`);
    return text;
  }
  if (field.type === 'number') {
    const number = typeof draft === 'number' ? draft : Number(draft);
    if (missing || !Number.isFinite(number)) {
      context.errors.push(`${path}: enter a valid number.`);
      return null;
    }
    if (field.integer && !Number.isInteger(number)) context.errors.push(`${path}: enter a whole number.`);
    if (field.min !== undefined && number < field.min || field.max !== undefined && number > field.max) context.errors.push(`${path}: enter a value from ${field.min ?? '−∞'} to ${field.max ?? '∞'}.`);
    return number;
  }
  if (field.type === 'boolean') {
    if (draft === true || draft === 'true') return true;
    if (draft === false || draft === 'false') return false;
    context.errors.push(`${path}: choose enabled or disabled.`);
    return false;
  }
  const text = typeof draft === 'string' ? draft : '';
  if (missing || !text.trim()) context.errors.push(`${path}: enter a value.`);
  if (field.minLength !== undefined && text.length < field.minLength) context.errors.push(`${path}: use at least ${field.minLength} character${field.minLength === 1 ? '' : 's'}.`);
  if (field.maxLength !== undefined && text.length > field.maxLength) context.errors.push(`${path}: use no more than ${field.maxLength} characters.`);
  if (field.pattern && text && !new RegExp(field.pattern).test(text)) context.errors.push(`${path}: value has an invalid format.`);
  if (field.type === 'enum' && field.options && text && !field.options.includes(text)) context.errors.push(`${path}: choose a supported value.`);
  if (field.label.includes('ISO-8601') && text && Number.isNaN(Date.parse(text))) context.errors.push(`${path}: enter a valid ISO-8601 timestamp.`);
  if (field.label.includes('IANA time zone') && text) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: text }); } catch { context.errors.push(`${path}: enter a valid IANA time zone.`); }
  }
  return text;
};

const asNumber = (record: Record<string, unknown>, key: string) => typeof record[key] === 'number' ? record[key] as number : NaN;
const asStringArray = (record: Record<string, unknown>, key: string) => Array.isArray(record[key]) ? record[key] as string[] : [];
const isNondecreasing = (values: number[]) => values.every((value, index) => index === 0 || value >= values[index - 1]);
const isUniqueBy = <T,>(values: T[], selector: (value: T) => string) => new Set(values.map(selector)).size === values.length;

export const validatePolicyCrossFields = (key: AdminPolicyKey, value: Record<string, AdminPolicyJsonValue>): string[] => {
  const errors: string[] = [];
  const numbers = (field: string) => asNumber(value, field);
  const countCheck = (countField: string, delayField = 'retrySeconds') => {
    const count = numbers(countField);
    const delays = Array.isArray(value[delayField]) ? value[delayField] as number[] : [];
    if (delays.length !== count) errors.push(`${delayField}: enter exactly ${countField} delay values.`);
    if (!isNondecreasing(delays)) errors.push(`${delayField}: delays must be nondecreasing.`);
  };

  if (key === 'identity_email') {
    if (numbers('cooldownSeconds') > Math.min(numbers('verificationTtlSeconds'), numbers('resetTtlSeconds'))) errors.push('cooldownSeconds: must not exceed either TTL.');
    countCheck('deliveryAttempts');
  }
  if (key === 'contact_verification') {
    if (numbers('windowSeconds') < numbers('cooldownSeconds')) errors.push('windowSeconds: must be at least cooldownSeconds.');
    countCheck('deliveryAttempts');
    if (Array.isArray(value.retrySeconds) && (value.retrySeconds as number[]).some((delay) => delay > numbers('ttlSeconds'))) errors.push('retrySeconds: delays cannot exceed ttlSeconds.');
  }
  if (key === 'profile_invitations') {
    countCheck('deliveryAttempts');
    if (Array.isArray(value.retrySeconds) && (value.retrySeconds as number[]).some((delay) => delay > numbers('ttlSeconds'))) errors.push('retrySeconds: delays cannot exceed ttlSeconds.');
  }
  if (key === 'profile_seats' || key === 'profile_publication_plans') {
    const plans = (value.plans as Array<Record<string, AdminPolicyJsonValue>> | undefined) ?? [];
    if (!isUniqueBy(plans, (plan) => String(plan.key))) errors.push('plans: plan keys must be unique.');
    if (key === 'profile_publication_plans' && plans.some((plan) => Array.isArray(plan.categories) && new Set(plan.categories).size !== plan.categories.length)) errors.push('plans.categories: each category must be unique.');
  }
  if (key === 'company_verification') {
    const ids = (value.internationalIds as Array<Record<string, AdminPolicyJsonValue>> | undefined) ?? [];
    if (!isUniqueBy(ids, (entry) => `${entry.country}:${entry.key}`)) errors.push('internationalIds: country and key pairs must be unique.');
  }
  if (key === 'partner_credential_requirements') {
    const rows = (value.requirements as Array<Record<string, AdminPolicyJsonValue>> | undefined) ?? [];
    for (const [index, row] of rows.entries()) {
      const proxyVisitor = row.specialty === 'proxy_visitor';
      if (proxyVisitor && (row.proxyVettingRequired !== true || (Array.isArray(row.requiredLicenseKinds) && row.requiredLicenseKinds.length > 0))) errors.push(`requirements[${index}]: proxy_visitor requires proxy vetting and no required licenses.`);
      if (!proxyVisitor && row.proxyVettingRequired === true) errors.push(`requirements[${index}]: proxy vetting is only allowed for proxy_visitor.`);
    }
  }
  if (key === 'private_evidence') {
    countCheck('scanAttempts');
    const scanner = value.scanner as Record<string, AdminPolicyJsonValue>;
    if (Array.isArray(scanner.allowedEngineVersions) && !isUniqueBy(scanner.allowedEngineVersions as string[], (version) => version)) errors.push('scanner.allowedEngineVersions: versions must be unique.');
  }
  if (key === 'trust_tier_thresholds') {
    if (!(numbers('platinumMinimumScore') > numbers('goldMinimumScore') && numbers('goldMinimumScore') > numbers('silverMinimumScore') && numbers('silverMinimumScore') > numbers('bronzeMinimumScore'))) errors.push('Thresholds must strictly descend from platinum to bronze.');
  }
  if (key === 'title_verification_disclosure') {
    const disclosure = String(value.warrantyDisclosure ?? '').toLowerCase();
    if (!disclosure.includes('administrative validation') || !disclosure.includes('not a statutory title warranty')) errors.push('warrantyDisclosure: state that the process is administrative validation and not a statutory title warranty.');
    for (const group of ['sources', 'checks']) {
      const entries = (value[group] as Array<Record<string, AdminPolicyJsonValue>> | undefined) ?? [];
      if (!isUniqueBy(entries, (entry) => String(entry.key))) errors.push(`${group}: keys must be unique.`);
    }
  }
  if (key === 'legacy_custody_movement') {
    countCheck('attempts');
    const reasons = asStringArray(value, 'allowedReasons');
    if (new Set(reasons).size !== reasons.length) errors.push('allowedReasons: reasons must be unique.');
  }
  if (key === 'legacy_file_custody') {
    const reasons = asStringArray(value, 'allowedReasons');
    if (new Set(reasons).size !== reasons.length) errors.push('allowedReasons: reasons must be unique.');
  }
  if (key === 'private_file_migration') countCheck('attempts');
  if (key === 'legacy_bound_media') {
    const entries = (value.entries as Array<Record<string, AdminPolicyJsonValue>> | undefined) ?? [];
    if (!isUniqueBy(entries, (entry) => `${entry.purpose}:${entry.mimeType}`)) errors.push('entries: purpose and MIME-type pairs must be unique.');
    for (const [index, entry] of entries.entries()) {
      const isVideo = typeof entry.mimeType === 'string' && entry.mimeType.startsWith('video/');
      const videoCodecs = Array.isArray(entry.allowedVideoCodecs) ? entry.allowedVideoCodecs : [];
      const audioCodecs = Array.isArray(entry.allowedAudioCodecs) ? entry.allowedAudioCodecs : [];
      if (isVideo && (entry.maxDurationSeconds === null || videoCodecs.length === 0)) errors.push(`entries[${index}]: video entries require a duration and at least one video codec.`);
      if (!isVideo && (entry.maxDurationSeconds !== null || videoCodecs.length || audioCodecs.length)) errors.push(`entries[${index}]: non-video entries require null duration and empty codec lists.`);
      if (entry.purpose === 'cad_bim') {
        const signature = String(entry.signatureHex ?? '');
        if (!/^(?:[A-Fa-f0-9]{2}){4,64}$/.test(signature)) errors.push(`entries[${index}].signatureHex: cad_bim requires a 4–64 byte hexadecimal signature.`);
      }
    }
  }
  if (key === 'recommended_weights') {
    const sum = ['verification', 'media', 'freshness', 'profileCompleteness', 'sponsored'].reduce((total, field) => total + numbers(field), 0);
    if (Math.abs(sum - 1) > 1e-6) errors.push('Weights must sum to 1.');
  }
  if (key === 'profile_completeness_criteria') {
    const rows = (value.criteria as Array<Record<string, AdminPolicyJsonValue>> | undefined) ?? [];
    if (!isUniqueBy(rows, (row) => String(row.field))) errors.push('criteria: fields must be unique.');
    if (rows.some((row) => typeof row.weight !== 'number' || row.weight <= 0)) errors.push('criteria.weight: each weight must be greater than 0.');
    const sum = rows.reduce((total, row) => total + (typeof row.weight === 'number' ? row.weight : 0), 0);
    if (Math.abs(sum - 1) > 1e-6) errors.push('criteria weights must sum to 1.');
  }
  if (key === 'sponsored_placements') {
    const rows = (value.placements as Array<Record<string, AdminPolicyJsonValue>> | undefined) ?? [];
    if (!isUniqueBy(rows, (row) => String(row.placementId))) errors.push('placements: placement IDs must be unique.');
    for (const [index, row] of rows.entries()) if (Date.parse(String(row.expiresAt)) <= Date.parse(String(row.startsAt))) errors.push(`placements[${index}]: expiresAt must be later than startsAt.`);
  }
  if (key === 'freshness' && !(numbers('reminderDays') < numbers('needsConfirmationDays') && numbers('needsConfirmationDays') < numbers('checkoutPauseDays'))) errors.push('Freshness thresholds must strictly ascend.');
  if (key === 'profile_payout_setup') {
    if (!(numbers('defaultSplitPercentage') > 0)) errors.push('defaultSplitPercentage: value must be greater than 0.');
    if (Math.abs(numbers('defaultSplitPercentage') * 100 - Math.round(numbers('defaultSplitPercentage') * 100)) > 1e-6) errors.push('defaultSplitPercentage: use no more than two decimal places.');
  }
  if (key === 'commercial_uses') {
    const entries = (value.entries as Array<Record<string, AdminPolicyJsonValue>> | undefined) ?? [];
    if (!isUniqueBy(entries, (entry) => String(entry.key))) errors.push('entries: keys must be unique.');
  }
  if (key === 'power_capacity_units') {
    const units = asStringArray(value, 'units');
    if (new Set(units).size !== units.length) errors.push('units: values must be unique.');
  }
  return errors;
};

export const serializePolicyDraft = (key: AdminPolicyKey, fields: readonly AdminPolicyField[], draft: unknown): { value: AdminPolicyJsonValue | null; errors: string[] } => {
  const context: SerializeContext = { errors: [] };
  const source = asRecord(draft) ?? {};
  const result: Record<string, AdminPolicyJsonValue> = {};
  for (const field of fields) {
    const serialized = serializeField(field, source[field.key], `value.${field.key}`, context);
    if (serialized !== undefined) result[field.key] = serialized;
  }
  context.errors.push(...validatePolicyCrossFields(key, result));
  return { value: context.errors.length ? null : result, errors: context.errors };
};
