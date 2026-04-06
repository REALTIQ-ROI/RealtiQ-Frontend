export type UserRole = 'buyer' | 'landlord' | 'admin';

export interface MediaItem {
  url: string;
  public_id: string;
  type: 'image' | 'video';
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
  ownerId?: string;
  buyerId?: string;
  createdAt?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Payment {
  id: string;
  propertyId: string;
  buyerId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  createdAt: string;
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
  role?: Exclude<UserRole, 'admin'>;
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