import type { VerificationCasePersonRoute } from '../services/verificationCaseService';

const declaredArrayFields = [
  'directors',
  'beneficialOwners',
  'executiveMembers',
  'authorizedSignatories',
] as const;

export const declaredVerificationPersonPaths = (values: Record<string, unknown>): string[] => {
  const paths: string[] = [];
  for (const field of declaredArrayFields) {
    const declared = values[field];
    if (!Array.isArray(declared)) continue;
    declared.forEach((person, index) => {
      if (person !== null && person !== undefined && person !== '') paths.push(`${field}[${index}]`);
    });
  }
  const principalAgent = values.principalAgent;
  if (principalAgent !== null && principalAgent !== undefined && principalAgent !== '') {
    paths.push('principalAgent');
  }
  return paths;
};

export const validateVerificationPersonRoutes = (people: VerificationCasePersonRoute[]): string | null => {
  const paths = new Set<string>();
  for (const person of people) {
    if (!person.path || paths.has(person.path)) return 'Each declared person must have a unique draft path.';
    paths.add(person.path);
    if (!/^[A-Z]{2}$/.test(person.country)) return `Enter a two-letter country code for ${person.path}.`;
    if (person.route === 'nigerian' && person.country !== 'NG') return `The Nigerian evidence route for ${person.path} requires country NG.`;
  }
  return null;
};
