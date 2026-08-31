import { describe, expect, it } from 'vitest';
import { toCreateInput, validateRoiForm, type RoiFormValues } from './validation';

const valid: RoiFormValues = { asOf: '', projectionPeriodYears: '5', purpose: 'buyer_research', annualRent: '', operatingExpenses: '', vacancyRate: '', appreciationRate: '' };
describe('ROI v1 form contract', () => {
  it('omits blank optional values rather than coercing them to zero', () => {
    expect(toCreateInput('RTQ-PROP-00000001', valid)).toEqual({ propertyReference: 'RTQ-PROP-00000001', projectionPeriodYears: 5, purpose: 'buyer_research' });
  });
  it.each([['projectionPeriodYears', '.249'], ['projectionPeriodYears', '50.01'], ['annualRent', '0'], ['annualRent', '1000000000000001'], ['operatingExpenses', '-1'], ['vacancyRate', '-1'], ['vacancyRate', '101'], ['appreciationRate', '-51'], ['appreciationRate', '101']] as const)('rejects %s=%s outside its exact bound', (field, value) => {
    expect(validateRoiForm({ ...valid, [field]: value })[field]).toBeTruthy();
  });
  it('accepts fractional periods, zero expenses/vacancy, and negative appreciation', () => {
    expect(validateRoiForm({ ...valid, projectionPeriodYears: '.25', operatingExpenses: '0', vacancyRate: '0', appreciationRate: '-50' })).toEqual({});
  });
  it('rejects future as-of values', () => {
    expect(validateRoiForm({ ...valid, asOf: '2026-09-01T00:00' }, new Date('2026-08-31T00:00:00Z')).asOf).toBeTruthy();
  });
});
