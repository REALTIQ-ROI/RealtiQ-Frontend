import type { CreateEscrowRule } from '../../types/escrow';
import { RULE_LABELS } from './escrowConfig';

export interface EditableRule extends CreateEscrowRule { clientId: string }
export type RuleErrors = Record<string, Partial<Record<'type' | 'description' | 'days', string>>>;

export const validateRules = (rules: EditableRule[]): RuleErrors => {
  const errors: RuleErrors = {};
  rules.forEach((rule) => {
    const row: RuleErrors[string] = {};
    if (!(rule.type in RULE_LABELS)) row.type = 'Choose a supported rule type.';
    if (!rule.description.trim()) row.description = 'Description is required.';
    const days = rule.metadata?.days;
    if (rule.type === 'release_after_days' && (!Number.isInteger(Number(days)) || Number(days) < 0)) row.days = 'Enter a non-negative whole number.';
    if (Object.keys(row).length) errors[rule.clientId] = row;
  });
  return errors;
};
