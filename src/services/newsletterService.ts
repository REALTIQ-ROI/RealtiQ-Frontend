import api from '../lib/axios';

export interface NewsletterSubscribeResponse {
  message: string;
}

export const newsletterService = {
  async subscribe(email: string): Promise<NewsletterSubscribeResponse> {
    const { data } = await api.post<NewsletterSubscribeResponse>('/newsletter/subscribe', { email });
    return data;
  },
};
