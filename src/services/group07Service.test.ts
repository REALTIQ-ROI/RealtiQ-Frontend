import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { group07Service } from './group07Service';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

describe('Group 07 API contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the following feed with its opaque cursor and private cache headers', async () => {
    const page = { items: [], nextCursor: 'opaque:cursor/value' };
    vi.mocked(api.get).mockResolvedValue({ data: page } as never);
    await expect(group07Service.followingFeed('opaque:cursor/value')).resolves.toEqual(page);
    expect(api.get).toHaveBeenCalledWith('/personalisation/following/feed', {
      params: { limit: 25, after: 'opaque:cursor/value' },
      headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' },
    });
  });

  it('creates partner jobs with the exact selected offering and stable operation key', async () => {
    const body = {
      kind: 'inspection_partner', serviceKey: 'property_inspection', assignmentMethod: 'buyer_choice' as const,
      offeringId: 'offering-1', propertyId: 'property-1', clientStateId: 'state-1', operationKey: 'job_operation_123',
    };
    const job = { id: 'job-1', state: 'awaiting_assignment' };
    vi.mocked(api.post).mockResolvedValue({ data: job } as never);
    await expect(group07Service.createPartnerJob(body)).resolves.toEqual(job);
    expect(api.post).toHaveBeenCalledWith('/partners/jobs', body, {
      headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' },
    });
  });

  it('sends moderation decisions with the exact versioned body and bound step-up header', async () => {
    const body = { target: 'answer' as const, decision: 'approve' as const, expectedVersion: 4, reason: 'Reviewed answer' };
    const question = { id: 'question-1', version: 5 };
    vi.mocked(api.patch).mockResolvedValue({ data: { question } } as never);
    await expect(group07Service.moderateProjectQuestion('question-1', body, 'challenge-1')).resolves.toEqual(question);
    expect(api.patch).toHaveBeenCalledWith('/admin/project-questions/question-1/moderation', body, {
      headers: { 'X-Step-Up-Challenge': 'challenge-1', 'Cache-Control': 'no-store' },
    });
  });

  it('keeps promotion purchases on the server catalogue and binds creation to step-up', async () => {
    const body = { targetKind: 'post', targetId: 'post-1', productId: 'product-1', operationKey: 'promotion_operation_123' };
    const response = { campaign: { id: 'campaign-1', state: 'checkout_ready' }, idempotent: false };
    vi.mocked(api.post).mockResolvedValue({ data: response } as never);
    await expect(group07Service.createPromotion(body, 'challenge-2')).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith('/posts/promotions', body, {
      headers: { 'X-Step-Up-Challenge': 'challenge-2', 'Cache-Control': 'no-store' },
    });
  });
});
