import { mockStore } from './mockStore';
import type { CreateInquiryPayload, Inquiry, User } from '../types';

export const inquiryService = {
  async createInquiry(payload: CreateInquiryPayload, user?: User): Promise<Inquiry> {
    return mockStore.createInquiry(payload, user);
  },

  async getInquiries(): Promise<Inquiry[]> {
    return mockStore.getInquiries();
  },

  async updateInquiryStatus(id: string, status: 'open' | 'closed') {
    return mockStore.updateInquiryStatus(id, status);
  },
};