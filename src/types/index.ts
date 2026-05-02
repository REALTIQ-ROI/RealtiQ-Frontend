export type UserRole = 'buyer' | 'landlord' | 'admin';

export interface MediaItem {
  url: string;
  public_id: string;
  type: 'image' | 'video';
  _id?: string;
}

export interface PropertyOwner {
  _id: string;
  name: string;
  email: string;
}

export interface Property {
  _id: string;
  title: string;
  price: number;
  location: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  description: string;
  squareFeet: number;
  media: MediaItem[];
  status: 'available' | 'sold';
  featured?: boolean;
  amenities?: string[];
  ownerId?: PropertyOwner | string;
  buyerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const resolveOwnerId = (ownerId?: PropertyOwner | string): string => {
  if (!ownerId) return '';
  return typeof ownerId === 'string' ? ownerId : ownerId._id;
};

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  propertyId: string;
  buyerId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  createdAt: string;
}

export interface PaymentUser {
  _id: string;
  name: string;
  email: string;
}

export interface PaymentProperty {
  _id: string;
  title: string;
  price: number;
  location: string;
}

export interface PaystackData {
  status: string;
  gateway_response: string;
  channel: string;
  currency: string;
  fees: number;
}

export interface ApiPayment {
  _id: string;
  user: PaymentUser;
  property: PaymentProperty;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  reference: string;
  createdAt: string;
  paystackData?: PaystackData;
}

export interface VerifyPaymentResponse {
  verified: boolean;
  payment: {
    _id: string;
    status: 'pending' | 'paid' | 'failed';
    reference: string;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  role?: UserRole;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface PropertyFilters {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  bedrooms?: number;
}

export interface Inquiry {
  id: string;
  propertyId: string;
  fullName: string;
  email: string;
  message: string;
  inquiryType: string;
  status: 'open' | 'closed';
  createdAt: string;
  userId?: string;
  ownerId?: string;
}

export interface CreateInquiryPayload {
  propertyId: string;
  fullName: string;
  email: string;
  message: string;
  inquiryType: string;
}

export interface InquiryProperty {
  _id: string;
  title: string;
  price: number;
  location: string;
}

export interface InquiryUser {
  _id: string;
  name: string;
  email: string;
}

export interface ApiInquiry {
  _id: string;
  property: InquiryProperty | string;
  userId?: string | null;
  user?: InquiryUser;
  ownerId: string;
  fullName: string;
  email: string;
  message: string;
  inquiryType: string;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt?: string;
}

export const resolveInquiryProperty = (property: ApiInquiry['property']): InquiryProperty | null =>
  typeof property === 'string' ? null : property;
