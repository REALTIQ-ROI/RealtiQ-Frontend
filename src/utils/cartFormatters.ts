import type { AllocationStatus, CartCheckoutStatus, CartItemType } from '../types';

export const formatNgn = (value: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value || 0);

export const cartItemTypeLabel = (type: CartItemType) => {
  const labels: Record<CartItemType, string> = {
    title_document_view: 'Title document view',
    proxy_inspection_escrow: 'Proxy inspection escrow',
    property_market_analytics: 'Property market analytics',
    paid_virtual_tour: 'Paid virtual tour',
  };
  return labels[type];
};

export const checkoutStatusLabel = (status: CartCheckoutStatus | AllocationStatus | string) =>
  status.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export const checkoutStatusClasses = (status: CartCheckoutStatus | AllocationStatus | string) => {
  if (['completed', 'allocated', 'paid'].includes(status)) return 'bg-emerald-100 text-emerald-700';
  if (['partially_failed', 'failed'].includes(status)) return 'bg-amber-100 text-amber-800';
  if (['refunded', 'partially_refunded'].includes(status)) return 'bg-slate-100 text-slate-700';
  return 'bg-blue-100 text-blue-700';
};
