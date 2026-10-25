import type { PropertyPaymentType } from '../types';

export const PROPERTY_PAYMENT_TYPE_ORDER: PropertyPaymentType[] = ['outright', 'installment', 'escrow'];

export const normalizePaymentTypesForForm = (
  _price: number,
  selected: PropertyPaymentType[],
): PropertyPaymentType[] => {
  const next = new Set(selected.filter((type) => PROPERTY_PAYMENT_TYPE_ORDER.includes(type)));
  return PROPERTY_PAYMENT_TYPE_ORDER.filter((type) => next.has(type));
};

export const normalizePropertyPaymentTypes = (
  paymentTypes: PropertyPaymentType[] | undefined,
  _price: number,
): PropertyPaymentType[] => {
  void _price;
  const selected = new Set(
    (paymentTypes ?? []).filter((type) => PROPERTY_PAYMENT_TYPE_ORDER.includes(type)),
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
