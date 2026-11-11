export type OnboardingDraftInputType = 'text' | 'number' | 'checkbox';

export interface OnboardingDraftField {
  path: string;
  label: string;
  value: string | number | boolean | null | undefined;
  inputType: OnboardingDraftInputType;
  required: boolean;
}

const declaredPersonCollections = ['directors', 'beneficialOwners', 'executiveMembers', 'authorizedSignatories'] as const;

/** The handoff names these declared-person arrays but does not define a row schema. */
export const isUndescribedDeclaredPersonPath = (path: string, values: Record<string, unknown>): boolean => {
  const collection = declaredPersonCollections.find((field) => path === field || path.startsWith(`${field}[`));
  if (!collection) return false;
  if (path === collection) return true;
  const rows = values[collection];
  if (!Array.isArray(rows)) return true;
  const index = Number(path.slice(collection.length).match(/^\[(\d+)\]/)?.[1]);
  return !Number.isInteger(index) || index < 0 || index >= rows.length;
};

const displayFieldPath = (path: string): string => path
  .replace(/\[(\d+)\]/g, ' $1')
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/[._]+/g, ' ')
  .trim()
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const inputTypeFor = (value: unknown): OnboardingDraftInputType => {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'checkbox';
  return 'text';
};

/**
 * Build ordinary form fields from the actual values and missing-field paths returned by
 * onboarding. The handoff does not define the `fields[]` descriptor shape, so this avoids
 * guessing types/options and uses the types already present in values.
 */
export const onboardingDraftFields = (
  values: Record<string, unknown>,
  requiredPaths: string[] = [],
): OnboardingDraftField[] => {
  const fields = new Map<string, OnboardingDraftField>();
  const visit = (value: unknown, path: string): void => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      fields.set(path, {
        path,
        label: displayFieldPath(path),
        value,
        inputType: inputTypeFor(value),
        required: requiredPaths.includes(path),
      });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => {
        const childPath = path ? `${path}.${key}` : key;
        visit(item, childPath);
      });
    }
  };

  Object.entries(values).forEach(([key, value]) => visit(value, key));
  requiredPaths.forEach((path) => {
    if (isUndescribedDeclaredPersonPath(path, values)) return;
    if (!fields.has(path)) fields.set(path, {
      path,
      label: displayFieldPath(path),
      value: undefined,
      inputType: 'text',
      required: true,
    });
  });
  return [...fields.values()];
};

const pathTokens = (path: string): Array<string | number> => {
  const tokens = [...path.matchAll(/([^.[\]]+)|\[(\d+)\]/g)].map((match) => match[1] ?? Number(match[2]));
  if (!tokens.length || tokens.some((token) => typeof token === 'string' && ['__proto__', 'prototype', 'constructor'].includes(token))) {
    throw new Error('The server returned an unsupported profile field path. Refresh the draft before editing.');
  }
  return tokens;
};

/** Update one scalar field while retaining all other server-returned object/array values. */
export const updateOnboardingDraftField = (
  values: Record<string, unknown>,
  path: string,
  value: string | number | boolean | null,
): Record<string, unknown> => {
  const next = JSON.parse(JSON.stringify(values)) as Record<string, unknown>;
  const tokens = pathTokens(path);
  let cursor: Record<string, unknown> | unknown[] = next;

  tokens.forEach((token, index) => {
    const final = index === tokens.length - 1;
    const current = cursor as Record<string | number, unknown>;
    if (final) {
      current[token] = value;
      return;
    }
    const nextToken = tokens[index + 1];
    const existing = current[token];
    if (!existing || typeof existing !== 'object') current[token] = typeof nextToken === 'number' ? [] : {};
    cursor = current[token] as Record<string, unknown> | unknown[];
  });
  return next;
};

export const onboardingDraftFieldDisplayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};
