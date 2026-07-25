import { describe, expect, it } from 'vitest';
import { validateRules, type EditableRule } from './ruleValidation';
import { canSatisfyRule, escrowActions, requiredProgress } from './escrowConfig';
import type { Escrow } from '../../types/escrow';

const escrow = (status: Escrow['status'], satisfied = false): Escrow => ({ _id: 'e1', amount: 10, status, createdAt: '', logs: [], rules: [{ _id: 'r1', type: 'buyer_confirmation_required', description: 'Buyer confirms', required: true, satisfied }] });
describe('escrow rule validation and permissions', () => {
  it('requires descriptions and valid non-negative whole release days', () => {
    const rules: EditableRule[] = [{ clientId: '1', type: 'release_after_days', description: ' ', required: true, metadata: { days: -1 } }];
    expect(validateRules(rules)['1']).toEqual({ description: 'Description is required.', days: 'Enter a non-negative whole number.' });
    rules[0] = { ...rules[0], description: 'Wait before release', metadata: { days: 7 } };
    expect(validateRules(rules)).toEqual({});
  });
  it('calculates progress from required rules only', () => {
    const value = escrow('locked', true); value.rules!.push({ _id: 'r2', type: 'inspection_completed', description: 'Optional', required: false, satisfied: false });
    expect(requiredProgress(value)).toMatchObject({ complete: 1, total: 1, percent: 100, allComplete: true });
  });
  it('handles legacy escrows without rules', () => {
    const value = escrow('pending_payment');
    delete value.rules;
    expect(requiredProgress(value)).toEqual({ complete: 0, total: 0, percent: 100, allComplete: true });
  });
  it('never exposes release to buyers and gates role actions by status', () => {
    expect(escrowActions('buyer', escrow('pending_payment'))).toMatchObject({ initializePayment: true, cancel: true, requestRelease: false, approveRelease: false });
    expect(escrowActions('landlord', escrow('locked', true))).toMatchObject({ dispute: true, requestRelease: true, approveRelease: false });
    expect(escrowActions('admin', escrow('release_pending', true))).toMatchObject({ approveRelease: true, requestRelease: true, dispute: false });
    expect(escrowActions('admin', escrow('disputed', true)).approveRelease).toBe(false);
    expect(escrowActions('buyer', escrow('released', true))).toMatchObject({ dispute: false, cancel: false, requestRelease: false });
  });
  it('allows only each role’s rule types while locked', () => {
    const value = escrow('locked');
    expect(canSatisfyRule('buyer', value, value.rules![0])).toBe(true);
    expect(canSatisfyRule('landlord', value, value.rules![0])).toBe(false);
    value.rules![0].type = 'admin_approval_required';
    expect(canSatisfyRule('admin', value, value.rules![0])).toBe(true);
  });
});
