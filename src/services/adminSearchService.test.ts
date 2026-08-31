import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { adminSearchService } from './adminSearchService';
vi.mock('../lib/axios', () => ({ default: { get: vi.fn() } }));

describe('adminSearchService', () => {
  beforeEach(() => vi.clearAllMocks());
  it('uses the exact endpoint, wrapper, and omits empty type', async () => {
    const response = { results: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    vi.mocked(api.get).mockResolvedValue({ data: response } as never);
    await expect(adminSearchService.search({ q: 'Ada Lagos', page: 1, limit: 20 })).resolves.toBe(response);
    expect(api.get).toHaveBeenCalledWith('/admin/search', { params: { q: 'Ada Lagos', page: 1, limit: 20 }, signal: undefined });
  });
  it('sends only the allow-listed type filter and forwards cancellation', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { results: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } } } as never);
    const controller = new AbortController();
    await adminSearchService.search({ q: 'RTQ-PROP', page: 2, limit: 20, type: 'property' }, controller.signal);
    expect(api.get).toHaveBeenCalledWith('/admin/search', { params: { q: 'RTQ-PROP', page: 2, limit: 20, type: 'property' }, signal: controller.signal });
  });
});
