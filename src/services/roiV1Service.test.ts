import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { roiV1Service } from './roiV1Service';
vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
describe('roiV1Service', () => {
  beforeEach(() => vi.clearAllMocks());
  it('posts the exact wrapper and private retry header', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { roi: { publicReference: 'RTQ-ROI-1' } } } as never);
    const input = { propertyReference: 'RTQ-PROP-1', projectionPeriodYears: 5 };
    await roiV1Service.createEstimate(input, 'stable-key');
    expect(api.post).toHaveBeenCalledWith('/roi/v1/estimates', input, { signal: undefined, headers: { 'Idempotency-Key': 'stable-key' } });
  });
  it('uses public references and every history filter', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { estimates: [], pagination: { page: 2, limit: 10, total: 0, pages: 0 } } } as never);
    await roiV1Service.getPropertyHistory('RTQ-PROP-1', { page: 2, limit: 10, asOf: '2026-01-01T00:00:00.000Z' });
    expect(api.get).toHaveBeenCalledWith('/roi/v1/properties/RTQ-PROP-1/estimates', { params: { page: 2, limit: 10, asOf: '2026-01-01T00:00:00.000Z' }, signal: undefined });
  });
});
