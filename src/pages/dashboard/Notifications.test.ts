import { describe, expect, it } from 'vitest';
import { isDisplayableNotification, mergeNotifications, safeNotificationRoute } from '../../utils/notificationVisibility';
import type { RealtiqNotification } from '../../types';
const notification = (type: string, category: RealtiqNotification['category']): RealtiqNotification => ({
  id: 'n1', profileId: 'p1', type, category, title: 'New conversation', body: 'A buyer started a conversation.', readAt: null, createdAt: '2026-08-27T09:00:00.000Z',
});
describe('notification visibility', () => {
  it('shows backend conversation.created notifications', () => {
    expect(isDisplayableNotification(notification('conversation.created', 'messages'))).toBe(true);
  });
  it('requires a supported server category and safe display fields', () => {
    expect(isDisplayableNotification({ ...notification('unknown', 'messages'), category: 'unknown' as RealtiqNotification['category'] })).toBe(false);
    expect(isDisplayableNotification({ ...notification('message.received', 'messages'), body: '' })).toBe(false);
  });
  it('deduplicates notification events by server ID without changing the authoritative unread count', () => {
    const first = notification('conversation.created', 'messages');
    expect(mergeNotifications([first], [{ ...first, title: 'Updated safe title' }])).toEqual([{ ...first, title: 'Updated safe title' }]);
  });
  it('accepts only local structured navigation and constrained public references', () => {
    expect(safeNotificationRoute({ ...notification('conversation.created', 'messages'), navigation: { route: '/messages/conversation-1' } })).toBe('/messages/conversation-1');
    expect(safeNotificationRoute({ ...notification('listing.published', 'listing_changes'), navigation: { route: '//attacker.invalid' } })).toBeNull();
    expect(safeNotificationRoute({ ...notification('listing.published', 'listing_changes'), navigation: { route: '/messages/\u0001conversation' } })).toBeNull();
    expect(safeNotificationRoute({ ...notification('listing.published', 'listing_changes'), navigation: { publicReference: 'RTQ-PROP-ABC123' } })).toBe('/properties/RTQ-PROP-ABC123');
  });
});
