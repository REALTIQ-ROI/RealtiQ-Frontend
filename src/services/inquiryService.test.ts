import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { inquiryService, parseInquiries } from './inquiryService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const inquiry = {
  _id: 'inquiry-1',
  property: 'property-1',
  ownerId: 'owner-1',
  fullName: 'Example Buyer',
  email: 'buyer@example.test',
  message: 'Please contact me about this listing.',
  inquiryType: 'General',
  status: 'open' as const,
  createdAt: '2026-10-27T00:00:00.000Z',
};

describe('inquiryService.getInquiries', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['bare array', [inquiry]],
    ['inquiries envelope', { inquiries: [inquiry] }],
  ])('normalizes the %s response into the list consumed by the admin screen', async (_name, payload) => {
    vi.mocked(api.get).mockResolvedValue({ data: payload } as never);

    await expect(inquiryService.getInquiries()).resolves.toEqual([inquiry]);
    expect(api.get).toHaveBeenCalledWith('/inquiries');
  });

  it('rejects unsupported response shapes so the screen can show its recoverable error state', () => {
    expect(() => parseInquiries({ records: [inquiry] })).toThrow(/inquiries endpoint returned an unsupported response/i);
  });
});
