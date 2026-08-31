import type { AdminSearchResult, AdminSearchType } from '../../types/adminSearch';

export const ADMIN_SEARCH_TYPES: ReadonlyArray<{ value: '' | AdminSearchType; label: string; icon: string }> = [
  { value: '', label: 'All records', icon: 'search' }, { value: 'user', label: 'Users', icon: 'person' },
  { value: 'landlord', label: 'Landlords', icon: 'person_pin' }, { value: 'property', label: 'Properties', icon: 'home_work' },
  { value: 'project', label: 'Projects', icon: 'business' }, { value: 'inquiry', label: 'Inquiries', icon: 'mail' },
  { value: 'payment', label: 'Payments', icon: 'payments' }, { value: 'cart_checkout', label: 'Cart checkouts', icon: 'receipt_long' },
  { value: 'escrow', label: 'Escrows', icon: 'shield_lock' }, { value: 'installment', label: 'Installments', icon: 'schedule' },
  { value: 'title_verification', label: 'Title verifications', icon: 'verified' }, { value: 'proxy_inspector', label: 'Proxy inspectors', icon: 'engineering' },
  { value: 'proxy_inspection', label: 'Proxy inspections', icon: 'fact_check' }, { value: 'virtual_tour', label: 'Virtual tours', icon: 'view_in_ar' },
];

export const normalizeAdminSearchQuery = (value: string) => value.trim().replace(/\s+/gu, ' ');

const routePatterns = [
  /^\/dashboard\/admin(?:\/)?$/, /^\/dashboard\/admin\/users\/[^/?#]+$/, /^\/dashboard\/admin\/landlord-details\/[^/?#]+$/,
  /^\/dashboard\/admin\/property-details\/[^/?#]+$/, /^\/dashboard\/admin\/projects\/[^/?#]+$/,
  /^\/dashboard\/admin\/inquiry-details\/[^/?#]+$/, /^\/dashboard\/admin\/payment-details\/[^/?#]+$/,
  /^\/dashboard\/admin\/cart-checkouts\/[^/?#]+$/, /^\/dashboard\/admin\/installments\/[^/?#]+$/,
  /^\/dashboard\/admin\/virtual-tours\/[^/?#]+$/, /^\/dashboard\/admin\/escrows\/[^/?#]+$/,
  /^\/admin\/proxy-inspectors\/[^/?#]+$/, /^\/admin\/proxy-inspections\/[^/?#]+$/,
  /^\/dashboard\/admin\/(?:manage-users|manage-landlords|manage-properties|projects|manage-inquiries|manage-payments|cart-checkouts|escrows|installments|title-verifications|virtual-tours)$/,
  /^\/admin\/(?:proxy-inspectors|proxy-inspections)$/,
];

export const isSafeAdminSearchRoute = (route: string): boolean => {
  if (!route.startsWith('/') || route.startsWith('//') || route.includes('\\') || Array.from(route).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return false;
  try {
    const parsed = new URL(route, window.location.origin);
    return parsed.origin === window.location.origin && !parsed.search && !parsed.hash && routePatterns.some((pattern) => pattern.test(parsed.pathname));
  } catch { return false; }
};

export const dedupeAdminResults = (results: AdminSearchResult[]) => {
  const seen = new Set<string>();
  return results.filter((result) => { const key = `${result.type}|${result.route}`; if (seen.has(key)) return false; seen.add(key); return true; });
};

export const typeMeta = (type: AdminSearchType) => ADMIN_SEARCH_TYPES.find((item) => item.value === type) ?? { value: type, label: type.replace(/_/g, ' '), icon: 'description' };
export const matchedFieldLabel = (field: string) => ({ publicReference: 'public reference', email: 'email', phone: 'phone', name: 'name', title: 'title', location: 'location', status: 'status', providerReference: 'provider reference' }[field] ?? 'record data');
