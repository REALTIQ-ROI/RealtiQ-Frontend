import type { PropertyPaymentType } from '../types';

export const INSTALLMENT_THRESHOLD_NGN = 50_000_000;
export const PROPERTY_PAYMENT_TYPE_ORDER: PropertyPaymentType[] = ['outright', 'installment', 'escrow'];

export const normalizePaymentTypesForForm = (
  price: number,
  selected: PropertyPaymentType[],
): PropertyPaymentType[] => {
  const next = new Set(selected.filter((type) => PROPERTY_PAYMENT_TYPE_ORDER.includes(type)));
  if (price > INSTALLMENT_THRESHOLD_NGN) next.add('installment');
  return PROPERTY_PAYMENT_TYPE_ORDER.filter((type) => next.has(type));
};

export const normalizePropertyPaymentTypes = (
  paymentTypes: PropertyPaymentType[] | undefined,
  _price: number,
): PropertyPaymentType[] => {
  void _price;
  const legacyFallback = paymentTypes === undefined ? ['outright' as const] : paymentTypes;
  const selected = new Set(
    legacyFallback.filter((type) => PROPERTY_PAYMENT_TYPE_ORDER.includes(type)),
  );
  return PROPERTY_PAYMENT_TYPE_ORDER.filter((type) => selected.has(type));
};

export const propertyPaymentTypeLabels: Record<PropertyPaymentType, string> = {
  outright: 'Outright payment',
  installment: 'Installment available',
  escrow: 'Escrow available',
};

export const propertyPaymentTypeIcons: Record<PropertyPaymentType, string> = {
  outright: 'payments',
  installment: 'calendar_month',
  escrow: 'shield_lock',
};
