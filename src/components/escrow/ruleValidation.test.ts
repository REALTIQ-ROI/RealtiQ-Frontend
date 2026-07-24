import { describe, expect, it } from 'vitest';
import type { EditableRule } from './ruleValidation';
import { milestoneAllocation, validateRules } from './ruleValidation';

const rule = (amount?: number, required = true): EditableRule => ({
  clientId: crypto.randomUUID(),
  type: 'inspection_completed',
  description: 'Inspection completed',
  required,
  amount,
  metadata: {},
});

describe('escrow milestone allocation validation', () => {
  it('requires a positive amount for every required configured milestone', () => {
    const missing = rule(undefined);
    const zero = rule(0);
    const negative = rule(-10);

    expect(validateRules([missing], { requireAmounts: true })[missing.clientId]?.amount)
      .toMatch(/required milestone/i);
    expect(validateRules([zero], { requireAmounts: true })[zero.clientId]?.amount)
      .toMatch(/greater than zero/i);
    expect(validateRules([negative], { requireAmounts: true })[negative.clientId]?.amount)
      .toMatch(/greater than zero/i);
  });

  it('detects below, above, and exact allocations after NGN rounding', () => {
    expect(milestoneAllocation(100_000_000, [rule(25_000_000), rule(35_000_000)]))
      .toMatchObject({ totalAllocated: 60_000_000, difference: 40_000_000, exact: false, overallocated: false });
    expect(milestoneAllocation(100_000_000, [rule(60_000_000), rule(50_000_000)]))
      .toMatchObject({ totalAllocated: 110_000_000, difference: -10_000_000, exact: false, overallocated: true });
    expect(milestoneAllocation(100_000_000, [rule(25_000_000.4), rule(74_999_999.6)]))
      .toMatchObject({ totalAllocated: 100_000_000, difference: 0, exact: true });
  });

  it('keeps legacy rules without amounts valid when allocation is not enabled', () => {
    expect(validateRules([rule(undefined)])).toEqual({});
  });
});
