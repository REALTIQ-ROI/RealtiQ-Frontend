import { afterEach, describe, expect, it } from 'vitest';
import type { AxiosAdapter } from 'axios';
import api from './axios';

describe('API profile context', () => {
  afterEach(() => localStorage.clear());

  it('sends bearer and selected profile on authenticated requests', async () => {
    localStorage.setItem('token', 'test-access-token');
    localStorage.setItem('activeProfileId', 'profile-2');
    const adapter: AxiosAdapter = async (config) => ({
      data: { authorization: config.headers.Authorization, profileId: config.headers['X-Profile-ID'] },
      status: 200, statusText: 'OK', headers: {}, config,
    });
    const { data } = await api.get('/profiles/current', { adapter });
    expect(data).toEqual({ authorization: 'Bearer test-access-token', profileId: 'profile-2' });
  });
});
