import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { stepUpService } from './stepUpService';

vi.mock('../lib/axios', () => ({ default: { post: vi.fn() } }));

describe('bound JSON step-up', () => {
  beforeEach(() => vi.clearAllMocks());

  it('binds the exact method, path and body then verifies the TOTP', async () => {
    const body = { expectedVersion: 8, publicationAction: 'publish_all_ready' };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { challengeId: 'challenge', expiresAt: '2026-10-25T12:05:00Z', method: 'totp' } }).mockResolvedValueOnce({ data: { challengeId: 'challenge', verified: true } });
    await stepUpService.start('PATCH', '/api/projects/p', body);
    await stepUpService.verify('challenge', '123456');
    expect(api.post).toHaveBeenNthCalledWith(1, '/auth/step-up', { method: 'PATCH', path: '/api/projects/p', body });
    expect(api.post).toHaveBeenNthCalledWith(2, '/auth/step-up/challenge/verify', { code: '123456' });
  });

  it('sends an exact empty JSON body and one-use challenge header for undo', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { operation: { state: 'undone' } } });
    await stepUpService.undoUnitGridOperation('p', 'o', 'challenge');
    expect(api.post).toHaveBeenCalledWith('/projects/p/unit-grid/operations/o/undo', {}, { headers: { 'X-Step-Up-Challenge': 'challenge' } });
  });
});
