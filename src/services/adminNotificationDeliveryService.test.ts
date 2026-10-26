import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/axios';
import { adminNotificationDeliveryService } from './adminNotificationDeliveryService';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('adminNotificationDeliveryService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the documented bounded delivery filter and cursor', async () => {
    const page = { deliveries: [], nextCursor: null };
    vi.mocked(api.get).mockResolvedValue({ data: page } as never);
    await expect(adminNotificationDeliveryService.list('outcome_unknown', 'delivery-1')).resolves.toEqual(page);
    expect(api.get).toHaveBeenCalledWith('/admin/notification-deliveries', { params: { state: 'outcome_unknown', before: 'delivery-1' } });
  });

  it('binds reconciliation evidence and the observed timestamp to step-up', async () => {
    const delivery = { id: 'delivery-1', channel: 'email', state: 'sent', attempts: 1, dueAt: null, acceptedAt: '2026-10-26T10:00:00Z', errorCode: null, receiptStatus: 'accepted', receiptAt: '2026-10-26T10:00:00Z', updatedAt: '2026-10-26T10:00:00Z' };
    const payload = { outcome: 'accepted' as const, evidenceReference: 'provider-ticket-91', expectedUpdatedAt: '2026-10-26T09:59:00Z', providerMessageId: 'msg-91' };
    vi.mocked(api.post).mockResolvedValue({ data: { delivery } } as never);
    await expect(adminNotificationDeliveryService.reconcile('delivery-1', payload, 'challenge-1')).resolves.toEqual(delivery);
    expect(api.post).toHaveBeenCalledWith('/admin/notification-deliveries/delivery-1/reconcile', payload, { headers: { 'X-Step-Up-Challenge': 'challenge-1' } });
  });
});
