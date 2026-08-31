export type AdminSearchType =
  | 'user' | 'landlord' | 'property' | 'project' | 'inquiry'
  | 'payment' | 'cart_checkout' | 'escrow' | 'installment'
  | 'title_verification' | 'proxy_inspector' | 'proxy_inspection' | 'virtual_tour';

export interface AdminSearchResult {
  type: AdminSearchType;
  reference?: string;
  title: string;
  subtitle?: string;
  status?: string;
  route: string;
  matchedField: string;
  matchedText: string;
  updatedAt: string;
}

export interface AdminSearchResponse {
  results: AdminSearchResult[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface AdminSearchQuery { q: string; page: number; limit: number; type?: AdminSearchType }
