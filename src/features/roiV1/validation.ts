import type { CreateRoiEstimateInput, RoiPurpose } from '../../types/roiV1';

export interface RoiFormValues { asOf: string; projectionPeriodYears: string; purpose: RoiPurpose; annualRent: string; operatingExpenses: string; vacancyRate: string; appreciationRate: string }
export type RoiFormErrors = Partial<Record<keyof RoiFormValues, string>>;

const optionalNumber = (value: string) => value.trim() === '' ? undefined : Number(value);
export const validateRoiForm = (values: RoiFormValues, now = new Date()): RoiFormErrors => {
  const errors: RoiFormErrors = {};
  const period = Number(values.projectionPeriodYears);
  if (!Number.isFinite(period) || period < .25 || period > 50) errors.projectionPeriodYears = 'Enter a period from 0.25 to 50 years.';
  if (values.asOf) {
    const date = new Date(values.asOf);
    if (Number.isNaN(date.getTime())) errors.asOf = 'Enter a valid date and time.';
    else if (date.getTime() > now.getTime()) errors.asOf = 'The as-of time cannot be in the future.';
  }
  const bounds: Array<[keyof Pick<RoiFormValues, 'annualRent'|'operatingExpenses'|'vacancyRate'|'appreciationRate'>, number, number]> = [
    ['annualRent', .01, 1e15], ['operatingExpenses', 0, 1e15], ['vacancyRate', 0, 100], ['appreciationRate', -50, 100],
  ];
  for (const [field, min, max] of bounds) {
    const n = optionalNumber(values[field]);
    if (n !== undefined && (!Number.isFinite(n) || n < min || n > max)) errors[field] = `Enter a value from ${min} to ${max}.`;
  }
  return errors;
};

export const toCreateInput = (propertyReference: string, values: RoiFormValues): CreateRoiEstimateInput => {
  const overrides = {
    annualRent: optionalNumber(values.annualRent), operatingExpenses: optionalNumber(values.operatingExpenses),
    vacancyRate: optionalNumber(values.vacancyRate), appreciationRate: optionalNumber(values.appreciationRate),
  };
  return {
    propertyReference,
    ...(values.asOf ? { asOf: new Date(values.asOf).toISOString() } : {}),
    projectionPeriodYears: Number(values.projectionPeriodYears), purpose: values.purpose,
    ...(Object.values(overrides).some((v) => v !== undefined) ? { overrides } : {}),
  };
};
