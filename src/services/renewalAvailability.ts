export type ProviderRenewalMethod = 'saved_card' | 'transfer_invoice' | 'direct_debit';

export interface RenewalAvailability {
  state: 'available' | 'methods_unavailable' | 'policy_unconfigured' | 'no_approved_methods';
  manual: { method: 'manual'; available: boolean; automaticRenewal: false };
  methods: Array<{ method: ProviderRenewalMethod; automaticRenewal: boolean; requiresActiveAuthorization: boolean }>;
  unavailableMethods: Array<{ method: ProviderRenewalMethod; reasonCode: string }>;
  errorCode?: string;
}

export const renewalMethodAvailable = (availability: RenewalAvailability | undefined, method: string): boolean =>
  method === 'manual' ? availability?.manual.available === true :
    availability?.methods.some((item) => item.method === method) === true;
