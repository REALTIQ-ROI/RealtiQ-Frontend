import { describe, expect, it } from 'vitest';
import {
  INSTALLMENT_THRESHOLD_NGN,
  normalizePaymentTypesForForm,
  normalizePropertyPaymentTypes,
} from './propertyPaymentTypes';
import type { PropertyPaymentType } from '../types';

describe('property payment type normalization', () => {
  it.each<[PropertyPaymentType[], PropertyPaymentType[]]>([
    [['outright'], ['outright']],
    [['outright', 'escrow'], ['outright', 'escrow']],
    [['outright', 'installment', 'escrow'], ['outright', 'installment', 'escrow']],
  ])('preserves one, two, or three canonical selections', (selected, expected) => {
    expect(normalizePaymentTypesForForm(45_000_000, selected)).toEqual(expected);
  });

  it('forces installment only when price is strictly above ₦50,000,000', () => {
    expect(normalizePaymentTypesForForm(INSTALLMENT_THRESHOLD_NGN + 1, ['escrow'])).toEqual(['installment', 'escrow']);
    expect(normalizePaymentTypesForForm(INSTALLMENT_THRESHOLD_NGN, ['escrow'])).toEqual(['escrow']);
  });

  it('retains a landlord-selected installment below the threshold', () => {
    expect(normalizePaymentTypesForForm(40_000_000, ['installment'])).toEqual(['installment']);
  });

  it('falls back to outright only when a legacy response omits the field', () => {
    expect(normalizePropertyPaymentTypes(undefined, 20_000_000)).toEqual(['outright']);
    expect(normalizePropertyPaymentTypes(undefined, 75_000_000)).toEqual(['outright']);
    expect(normalizePropertyPaymentTypes([], 20_000_000)).toEqual([]);
  });

  it('removes duplicates, unsupported runtime values, and uses canonical order', () => {
    expect(normalizePaymentTypesForForm(20_000_000, ['escrow', 'outright', 'escrow', 'cash' as 'outright'])).toEqual([
      'outright',
      'escrow',
    ]);
  });
});
