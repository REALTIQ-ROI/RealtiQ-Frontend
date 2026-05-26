export type UserRole = 'buyer' | 'landlord' | 'admin';
export type PropertyType = 'house' | 'apartment' | 'land' | 'commercial' | 'villa' | 'penthouse' | 'estate';
export type PropertyStatus = 'available' | 'sold';
export type PropertyCategory = 'residential' | 'commercial' | 'mixed_use' | string;
export type PropertyCompletionStage = 'off_plan' | 'unfinished' | 'finished' | 'renovation' | string;
export type PropertyCurrency = 'NGN' | 'USD' | 'GBP' | string;
export type TourType = 'open_house' | 'virtual_paid' | 'staging_view';
export type TourMode = 'physical' | 'virtual';
export type TourStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type InstallmentStatus = 'pending' | 'active' | 'completed' | 'defaulted';

export interface MediaItem {
  url: string;
  public_id: string;
  type: 'image' | 'video';
  _id?: string;
}

export interface PropertyCoordinates {
  lat: number;
  lng: number;
}

export interface PropertyOwner {
  _id: string;
  name: string;
  email: string;
  landlordVerified?: boolean;
  ratingAverage?: number;
}

export interface Property {
  _id: string;
  title: string;
  price: number;
  location: string;
  propertyType: PropertyType | string;
  bedrooms: number;
  bathrooms: number;
  description: string;
  squareFeet: number;
  category?: PropertyCategory;
  completionStage?: PropertyCompletionStage;
  currency?: PropertyCurrency;
  coordinates?: PropertyCoordinates | null;
  media: MediaItem[];
  status: PropertyStatus;
  featured?: boolean;
  amenities?: string[];
  views?: number;
  saves?: number;
  ownerId?: PropertyOwner | string;
  buyerId?: PropertyOwner | string;
  createdAt?: string;
  updatedAt?: string;
}

export const resolveOwnerId = (ownerId?: PropertyOwner | string): string => {
  if (!ownerId) return '';
  return typeof ownerId === 'string' ? ownerId : ownerId._id;
};

export const resolveBuyerId = (buyerId?: PropertyOwner | string): string => {
  if (!buyerId) return '';
  return typeof buyerId === 'string' ? buyerId : buyerId._id;
};

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  isVerified?: boolean;
  propertyCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateUserPayload {
  name: string;
  phone?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalProperties: number;
  activeListings: number;
  soldProperties: number;
  totalInquiries: number;
  totalRevenue: number;
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
  ownerId?: string;
  category?: PropertyCategory;
  completionStage?: PropertyCompletionStage;
  currency?: PropertyCurrency;
  featured?: boolean;
  status?: PropertyStatus;
  page?: number;
  limit?: number;
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

export interface TourPropertySummary {
  _id: string;
  title?: string;
  location?: string;
  propertyType?: PropertyType | string;
  media?: MediaItem[];
}

export interface TourParticipant {
  _id: string;
  name: string;
  email?: string;
  role?: UserRole;
}

export interface Tour {
  _id: string;
  propertyId: string | TourPropertySummary;
  buyerId?: string | TourParticipant;
  ownerId?: string | TourParticipant;
  type: TourType;
  mode: TourMode;
  scheduledAt?: string;
  notes?: string;
  status: TourStatus;
  price?: number;
  requiresPayment?: boolean;
  reference?: string;
  redirectUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TourRequestPayload {
  propertyId: string;
  type: TourType;
  mode: TourMode;
  scheduledAt?: string;
  notes?: string;
}

export interface InstallmentSchedule {
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | string;
  notes?: string;
}

export interface InstallmentPaymentRecord {
  amount: number;
  status?: string;
  reference?: string;
  paidAt?: string;
  createdAt?: string;
}

export interface Installment {
  _id: string;
  propertyId: string | TourPropertySummary;
  buyerId?: string | TourParticipant;
  ownerId?: string | TourParticipant;
  totalAmount: number;
  remainingBalance: number;
  status: InstallmentStatus;
  schedule?: InstallmentSchedule;
  paymentHistory?: InstallmentPaymentRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InstallmentCreatePayload {
  propertyId: string;
  totalAmount: number;
  schedule: InstallmentSchedule;
}

export interface InstallmentPaymentPayload {
  amount?: number;
}
