export type RevenueCurrency = 'NGN' | 'USD';

/** Money in Group 04 DTOs is supplied by the server in integer minor units. */
export const formatMoneyMinor = (amountMinor: number | null | undefined, currency: RevenueCurrency | string | null | undefined): string => {
  if (typeof amountMinor !== 'number' || !Number.isSafeInteger(amountMinor) || (currency !== 'NGN' && currency !== 'USD')) return 'Not available';
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amountMinor / 100);
};

/** Legacy safe payment reads expose amount in major units, unlike fee DTOs. */
export const formatPaymentMajor = (amount: number | null | undefined, currency: RevenueCurrency | string | null | undefined): string => {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || (currency !== 'NGN' && currency !== 'USD')) return 'Not available';
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};
