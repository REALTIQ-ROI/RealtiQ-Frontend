import { describe, expect, it } from 'vitest';
import type { Installment } from '../types';
import {
  canCancelInstallment,
  canPayInstallment,
  canRoleSatisfyCondition,
  getPrincipalPaidAmount,
  getPrincipalRemainingBalance,
  getScheduleItems,
  getTotalOutstandingBalance,
  hasUnsatisfiedRequiredConditions,
  validateAutomaticInstallmentDraft,
  validateCustomInstallmentDraft,
} from './installment';

const baseInstallment: Installment = {
  _id: 'plan_1',
  property: 'property_1',
  user: 'buyer_1',
  totalAmount: 20_000_000,
  paidAmount: 5_000_000,
  remainingBalance: 15_010_000,
  principalAmount: 20_000_000,
  principalPaidAmount: 5_000_000,
  principalRemainingBalance: 15_000_000,
  outstandingPenaltyAmount: 10_000,
  totalOutstandingBalance: 15_010_000,
  status: 'active',
  schedule: [],
};

describe('installment helpers', () => {
  it('keeps principal and penalty balances separate', () => {
    expect(getPrincipalPaidAmount(baseInstallment)).toBe(5_000_000);
    expect(getPrincipalRemainingBalance(baseInstallment)).toBe(15_000_000);
    expect(getTotalOutstandingBalance(baseInstallment)).toBe(15_010_000);
  });

  it('falls back safely for legacy records', () => {
    const legacy: Installment = {
      _id: 'legacy_1',
      propertyId: 'property_1',
      totalAmount: 10_000,
      paidAmount: 2_500,
      remainingBalance: 7_500,
      status: 'active',
      schedule: { frequency: 'monthly', notes: '1000' },
    };

    expect(getScheduleItems(legacy)).toEqual([]);
    expect(getPrincipalRemainingBalance(legacy)).toBe(7_500);
    expect(getTotalOutstandingBalance(legacy)).toBe(7_500);
  });

  it('validates automatic schedule drafts', () => {
    expect(
      validateAutomaticInstallmentDraft({
        propertyPrice: 20_000_000,
        numberOfInstallments: 12,
        initialDeposit: 2_000_000,
        startDate: '2026-08-01T10:00:00+01:00',
        gracePeriodHours: 120,
      }).valid,
    ).toBe(true);

    expect(
      validateAutomaticInstallmentDraft({
        propertyPrice: 20_000_000,
        numberOfInstallments: 0,
        initialDeposit: 20_000_000,
        startDate: 'invalid',
      }).valid,
    ).toBe(false);
  });

  it('prevents duplicate sequences and unordered custom dates', () => {
    const result = validateCustomInstallmentDraft({
      propertyPrice: 10_000,
      rows: [
        { sequence: 1, title: 'First', expectedAmount: 5_000, dueDate: '2026-09-01T10:00:00+01:00' },
        { sequence: 1, title: 'Second', expectedAmount: 5_000, dueDate: '2026-08-01T10:00:00+01:00' },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.duplicateSequences).toBe(true);
    expect(result.unorderedDates).toBe(true);
  });

  it('accepts custom schedules whose totals match the principal', () => {
    const result = validateCustomInstallmentDraft({
      propertyPrice: 10_000,
      rows: [
        { sequence: 1, title: 'First', expectedAmount: 4_000, dueDate: '2026-08-01T10:00:00+01:00' },
        { sequence: 2, title: 'Final', expectedAmount: 6_000, dueDate: '2026-09-01T10:00:00+01:00' },
      ],
      gracePeriodHours: 168,
    });

    expect(result.valid).toBe(true);
    expect(result.difference).toBe(0);
  });

  it('gates condition satisfaction by role', () => {
    expect(canRoleSatisfyCondition('buyer', { type: 'buyer_confirmation', satisfied: false })).toBe(true);
    expect(canRoleSatisfyCondition('landlord', { type: 'handover', satisfied: false })).toBe(true);
    expect(canRoleSatisfyCondition('admin', { type: 'document_verified', satisfied: false })).toBe(true);
    expect(canRoleSatisfyCondition('buyer', { type: 'document_verified', satisfied: false })).toBe(false);
  });

  it('blocks targeted payments with unsatisfied required conditions', () => {
    expect(
      hasUnsatisfiedRequiredConditions({
        sequence: 1,
        title: 'Inspection',
        expectedAmount: 10_000,
        conditions: [{ type: 'inspection_completed', required: true, satisfied: false }],
      }),
    ).toBe(true);
  });

  it('gates terminal plan actions', () => {
    expect(canPayInstallment({ ...baseInstallment, status: 'completed', totalOutstandingBalance: 0 })).toBe(false);
    expect(canPayInstallment({ ...baseInstallment, status: 'defaulted' })).toBe(false);
    expect(canCancelInstallment({ ...baseInstallment, status: 'pending', principalPaidAmount: 0, paidAmount: 0 }, 'buyer')).toBe(true);
    expect(canCancelInstallment({ ...baseInstallment, status: 'pending' }, 'buyer')).toBe(false);
    expect(canCancelInstallment({ ...baseInstallment, status: 'active' }, 'admin')).toBe(true);
  });
});
