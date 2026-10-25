import { describe, expect, it } from 'vitest';
import {
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

  it('does not infer a payment method from asking price', () => {
    expect(normalizePaymentTypesForForm(50_000_001, ['escrow'])).toEqual(['escrow']);
    expect(normalizePaymentTypesForForm(50_000_000, ['escrow'])).toEqual(['escrow']);
  });

  it('retains a landlord-selected installment below the threshold', () => {
    expect(normalizePaymentTypesForForm(40_000_000, ['installment'])).toEqual(['installment']);
  });

  it('does not invent outright when a response omits payment methods', () => {
    expect(normalizePropertyPaymentTypes(undefined, 20_000_000)).toEqual([]);
    expect(normalizePropertyPaymentTypes(undefined, 75_000_000)).toEqual([]);
    expect(normalizePropertyPaymentTypes([], 20_000_000)).toEqual([]);
  });

  it('removes duplicates, unsupported runtime values, and uses canonical order', () => {
    expect(normalizePaymentTypesForForm(20_000_000, ['escrow', 'outright', 'escrow', 'cash' as 'outright'])).toEqual([
      'outright',
      'escrow',
    ]);
  });
});
