import { mockStore } from './mockStore';
import type { Property, PropertyFilters } from '../types';

export type CreatePropertyPayload = Omit<Property, '_id' | 'status'>;

export const propertyService = {
  async getProperties(filters?: PropertyFilters): Promise<Property[]> {
    return mockStore.getProperties(filters);
  },

  async getPropertyById(id: string): Promise<Property | null> {
    return mockStore.getPropertyById(id);
  },

  async addProperty(ownerId: string, payload: CreatePropertyPayload): Promise<Property> {
    return mockStore.addProperty(ownerId, payload);
  },

  async updateProperty(propertyId: string, payload: Partial<Property>): Promise<Property> {
    return mockStore.updateProperty(propertyId, payload);
  },

  async deleteProperty(propertyId: string): Promise<void> {
    mockStore.deleteProperty(propertyId);
  },

  async buyProperty(propertyId: string, buyerId: string) {
    return mockStore.buyProperty(propertyId, buyerId);
  },
};