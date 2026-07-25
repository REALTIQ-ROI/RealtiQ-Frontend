import type { RefundDetailsPayload } from '../../types/escrow';

export type RefundDetailErrors = Partial<Record<keyof RefundDetailsPayload, string>>;

export const validateRefundDetails = (values: RefundDetailsPayload): RefundDetailErrors => {
  const errors: RefundDetailErrors = {};
  for (const [key, value] of Object.entries(values) as [keyof RefundDetailsPayload, string][]) {
    if (!value.trim()) errors[key] = 'This field is required.';
  }
  return errors;
};

export const trimRefundDetails = (values: RefundDetailsPayload): RefundDetailsPayload => ({
  accountNumber: values.accountNumber.trim(),
  bankName: values.bankName.trim(),
  bankCode: values.bankCode.trim(),
});

export const maskAccountNumber = (value: string) => value.length <= 4 ? value : `${'•'.repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
