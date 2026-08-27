import { describe, expect, it } from 'vitest';
import { isDisplayableNotification } from '../../utils/notificationVisibility';
import type { RealtiqNotification } from '../../types';
const notification = (type: string, category: RealtiqNotification['category']): RealtiqNotification => ({
  _id: 'n1', type, category, title: 'New conversation', body: 'A buyer started a conversation.', readAt: null, archivedAt: null, createdAt: '2026-08-27T09:00:00.000Z',
});
describe('notification visibility', () => {
  it('shows backend conversation.created notifications', () => {
    expect(isDisplayableNotification(notification('conversation.created', 'messages'))).toBe(true);
  });
  it('requires a supported server category and safe display fields', () => {
    expect(isDisplayableNotification({ ...notification('unknown', 'messages'), category: 'unknown' as RealtiqNotification['category'] })).toBe(false);
    expect(isDisplayableNotification({ ...notification('message.received', 'messages'), body: '' })).toBe(false);
  });
});
