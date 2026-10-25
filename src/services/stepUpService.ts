import api from '../lib/axios';

export const stepUpService = {
  async start(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body: object): Promise<{ challengeId: string; expiresAt: string; method: 'totp' }> {
    const { data } = await api.post<{ challengeId: string; expiresAt: string; method: 'totp' }>('/auth/step-up', { method, path, body });
    return data;
  },

  async verify(challengeId: string, code: string): Promise<void> {
    await api.post(`/auth/step-up/${encodeURIComponent(challengeId)}/verify`, { code });
  },

  async undoUnitGridOperation(projectId: string, operationId: string, challengeId: string, body: Record<string, never>): Promise<unknown> {
    const { data } = await api.post(`/projects/${encodeURIComponent(projectId)}/unit-grid/operations/${encodeURIComponent(operationId)}/undo`, body, {
      headers: { 'X-Step-Up-Challenge': challengeId },
    });
    return data;
  },
};
