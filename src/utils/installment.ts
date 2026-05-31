import type { Installment, InstallmentSchedule, Property, TourPropertySummary } from '../types';

export const installmentCounts = {
  monthly: 12,
  quarterly: 4,
  biannually: 2,
  annually: 1,
} as const;

export type InstallmentFrequency = keyof typeof installmentCounts;

export const frequencyToInstallmentCount = (frequency?: string): number => {
  if (!frequency) return 0;
  return installmentCounts[frequency as InstallmentFrequency] ?? 0;
};

export const parseInstallmentAmount = (notes?: string): number => {
  if (!notes) return 0;
  const parsed = Number(notes);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const calculateInstallmentAmount = (propertyPrice: number, frequency?: string): number => {
  const count = frequencyToInstallmentCount(frequency);
  if (propertyPrice <= 0 || count <= 0) return 0;
  return Math.round(propertyPrice / count);
};

type InstallmentPropertyRef = Property | TourPropertySummary | string | null;

export const getInstallmentProperty = (installment: Installment): InstallmentPropertyRef =>
  installment.property ?? installment.propertyId ?? null;

export const resolveInstallmentProperty = (installment: Installment): Property | null => {
  const property = getInstallmentProperty(installment);
  return property && typeof property !== 'string' && 'price' in property ? property : null;
};

export const resolveInstallmentPropertyId = (installment: Installment): string => {
  const property = getInstallmentProperty(installment);
  if (!property) return '';
  return typeof property === 'string' ? property : property._id;
};

export const resolveInstallmentPropertyLabel = (installment: Installment): string => {
  const property = getInstallmentProperty(installment);
  if (!property) return 'Property unavailable';
  return typeof property === 'string' ? property : property.title ?? property._id ?? 'Property unavailable';
};

export const getInstallmentSummary = (installment: Installment) => {
  const totalInstallments = frequencyToInstallmentCount(installment.schedule?.frequency);
  const installmentAmount = parseInstallmentAmount(installment.schedule?.notes);
  const paidAmount = installment.paidAmount ?? installment.amountPaid ?? Math.max(installment.totalAmount - installment.remainingBalance, 0);
  const paymentCount = installment.paymentCount ?? installment.installmentsPaid ?? installment.paymentHistory?.length ?? 0;
  const installmentsRemaining = Math.max(totalInstallments - paymentCount, 0);
  const progressPercent = totalInstallments > 0 ? Math.min(100, Math.round((paymentCount / totalInstallments) * 100)) : 0;
  const completed = installment.remainingBalance <= 0 || paymentCount >= totalInstallments;

  return {
    totalInstallments,
    installmentAmount,
    paidAmount,
    paymentCount,
    installmentsRemaining,
    progressPercent,
    completed,
  };
};

export const isInstallmentActive = (installment: Installment) => !getInstallmentSummary(installment).completed;

export const buildInstallmentPayload = (
  property: Property,
  frequency: InstallmentSchedule['frequency'],
): { totalAmount: number; installmentAmount: number } => {
  const totalAmount = property.price;
  const installmentAmount = calculateInstallmentAmount(property.price, frequency);
  return { totalAmount, installmentAmount };
};
