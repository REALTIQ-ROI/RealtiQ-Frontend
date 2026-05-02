import api from '../lib/axios';
import type { AdminStats } from '../types';

export const adminService = {
  async fetchAdminStats(): Promise<AdminStats> {
    const { data } = await api.get<AdminStats>('/admin/stats');
    return data;
  },
};
