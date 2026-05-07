import api from '../lib/axios';

export interface ContactMessagePayload {
  name: string;
  email: string;
  phone?: string;
  type: string;
  message: string;
}

export interface ContactMessageResponse {
  message: string;
}

export const contactService = {
  async submitMessage(payload: ContactMessagePayload): Promise<ContactMessageResponse> {
    const { data } = await api.post<ContactMessageResponse>('/contact/messages', payload);
    return data;
  },
};
