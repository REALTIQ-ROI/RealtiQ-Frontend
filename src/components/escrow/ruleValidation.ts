import type { CreateEscrowRule } from '../../types/escrow';
import { RULE_LABELS } from './escrowConfig';

export interface EditableRule extends CreateEscrowRule { clientId: string }
export type RuleErrors = Record<string, Partial<Record<'type' | 'description' | 'days' | 'amount', string>>>;

const roundNGN = (value: number) => Math.round(value);

export const milestoneAllocation = (escrowAmount: number, rules: EditableRule[]) => {
  const totalAllocated = rules.reduce(
    (total, rule) =>
      total + (Number.isFinite(rule.amount) ? roundNGN(Number(rule.amount)) : 0),
    0,
  );
  const roundedEscrowAmount = roundNGN(escrowAmount);
  const difference = roundedEscrowAmount - totalAllocated;
  return {
    escrowAmount: roundedEscrowAmount,
    totalAllocated,
    difference,
    exact: difference === 0,
    overallocated: difference < 0,
  };
};

export const validateRules = (
  rules: EditableRule[],
  options: { requireAmounts?: boolean } = {},
): RuleErrors => {
  const errors: RuleErrors = {};
  rules.forEach((rule) => {
    const row: RuleErrors[string] = {};
    if (!(rule.type in RULE_LABELS)) row.type = 'Choose a supported rule type.';
    if (!rule.description.trim()) row.description = 'Description is required.';
    const days = rule.metadata?.days;
    if (rule.type === 'release_after_days' && (!Number.isInteger(Number(days)) || Number(days) < 0)) row.days = 'Enter a non-negative whole number.';
    if (options.requireAmounts && rule.required && rule.amount === undefined) {
      row.amount = 'Enter an amount for this required milestone.';
    } else if (
      rule.amount !== undefined &&
      (!Number.isFinite(rule.amount) || rule.amount <= 0)
    ) {
      row.amount = 'Milestone amount must be greater than zero.';
    }
    if (Object.keys(row).length) errors[rule.clientId] = row;
  });
  return errors;
};
