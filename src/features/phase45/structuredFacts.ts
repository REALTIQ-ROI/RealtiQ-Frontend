import type { StructuredPropertyFacts } from '../../types/phase45';
export const sellerStructuredFacts = (facts: StructuredPropertyFacts): StructuredPropertyFacts => ({ ...facts, verification: { status: 'seller_asserted', source: 'seller' } });
export const validateStructuredFacts = (facts?: StructuredPropertyFacts) => {
  const errors: Record<string, string> = {}; if (!facts) return errors;
  const check = (key: string, value: number | undefined, min: number, max: number) => { if (value !== undefined && (!Number.isFinite(value) || value < min || value > max)) errors[key] = `Must be between ${min} and ${max}`; };
  check('buildingSquareMetres', facts.areas?.buildingSquareMetres, 1, 1_000_000); check('landSquareMetres', facts.areas?.landSquareMetres, 1, 10_000_000);
  check('yearBuilt', facts.yearBuilt, 1800, 2200); check('renovationYear', facts.renovationYear, 1800, 2200); check('floors', facts.floors, 1, 200); check('parkingSpaces', facts.parkingSpaces, 0, 1000);
  if (facts.yearBuilt && facts.renovationYear && facts.renovationYear < facts.yearBuilt) errors.renovationYear = 'Renovation year cannot be before year built';
  return errors;
};
