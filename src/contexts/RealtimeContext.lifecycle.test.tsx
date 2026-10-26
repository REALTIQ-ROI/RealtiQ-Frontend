import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from './AuthContext';
import { RealtimeProvider, useRealtime } from './RealtimeContext';
import { messageService } from '../services/messageService';
import { notificationService } from '../services/notificationService';
import type { MarketplaceConversation, RealtiqNotification } from '../types';

const { ioMock } = vi.hoisted(() => ({ ioMock: vi.fn() }));
vi.mock('socket.io-client', () => ({ io: ioMock }));
vi.mock('./AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../services/messageService', () => ({ messageService: { inbox: vi.fn(), history: vi.fn(), detail: vi.fn(), send: vi.fn(), markRead: vi.fn() } }));
vi.mock('../services/notificationService', () => ({ notificationService: { list: vi.fn(), unreadCount: vi.fn() } }));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
const conversation = (id: string): MarketplaceConversation => ({
  _id: id, type: 'property', property: { _id: 'property-1', title: id, publicReference: 'RTQ-PROP-1' },
  participants: [], status: 'open', unreadCount: 0, createdAt: '2026-01-01', updatedAt: '2026-01-01',
});
const notification = (id: string, profileId: string): RealtiqNotification => ({
  id, profileId, type: 'conversation.created', category: 'messages', title: id, body: 'Safe notification body', readAt: null, createdAt: '2026-01-01',
});
const socket = () => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    connected: true,
    handlers,
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => { handlers.set(event, callback); }),
    emit: vi.fn(),
    removeAllListeners: vi.fn(() => handlers.clear()),
    disconnect: vi.fn(),
  };
};
let sockets: ReturnType<typeof socket>[] = [];

function Probe() {
  const realtime = useRealtime();
  return <div>
    <output data-testid="conversation-ids">{realtime.conversations.map((item) => item._id).join(',')}</output>
    <output data-testid="notification-ids">{realtime.notifications.map((item) => item.id).join(',')}</output>
  </div>;
}

describe('realtime profile isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const firstSocket = socket();
    const secondSocket = socket();
    sockets = [firstSocket, secondSocket];
    ioMock.mockReturnValueOnce(firstSocket).mockReturnValueOnce(secondSocket);
    vi.mocked(notificationService.unreadCount).mockResolvedValue(0);
    vi.mocked(messageService.history).mockResolvedValue({ messages: [], pageInfo: { hasMore: false, nextCursor: null } });
  });

  it('clears the old profile immediately and ignores its in-flight REST responses after switching', async () => {
    const [firstSocket, secondSocket] = sockets;
    const oldInbox = deferred<{ conversations: MarketplaceConversation[]; pagination: { page: number; limit: number; total: number; pages: number } }>();
    const oldNotifications = deferred<{ notifications: RealtiqNotification[]; pagination: { page: number; limit: number; total: number; pages: number } }>();
    vi.mocked(messageService.inbox).mockImplementationOnce(() => oldInbox.promise as never).mockResolvedValueOnce({ conversations: [conversation('new-conversation')], pagination: { page: 1, limit: 50, total: 1, pages: 1 } });
    vi.mocked(notificationService.list).mockImplementationOnce(() => oldNotifications.promise as never).mockResolvedValueOnce({ notifications: [notification('new-notification', 'profile-2')], pagination: { page: 1, limit: 50, total: 1, pages: 1 } });
    const firstAuth = { token: 'token-1', user: { _id: 'user-1' }, activeProfile: { id: 'profile-1' } } as never;
    const secondAuth = { token: 'token-1', user: { _id: 'user-1' }, activeProfile: { id: 'profile-2' } } as never;
    vi.mocked(useAuth).mockReturnValue(firstAuth);

    const view = render(<RealtimeProvider><Probe /></RealtimeProvider>);
    await waitFor(() => expect(messageService.inbox).toHaveBeenCalledTimes(1));
    const lateNotificationEvent = firstSocket.handlers.get('notification:new');
    vi.mocked(useAuth).mockReturnValue(secondAuth);
    view.rerender(<RealtimeProvider><Probe /></RealtimeProvider>);
    expect(screen.getByTestId('conversation-ids').textContent).toBe('');
    expect(screen.getByTestId('notification-ids').textContent).toBe('');
    await waitFor(() => expect(screen.getByTestId('conversation-ids').textContent).toBe('new-conversation'));
    expect(screen.getByTestId('notification-ids').textContent).toBe('new-notification');
    lateNotificationEvent?.({ notification: notification('late-event', 'profile-1') });
    expect(notificationService.list).toHaveBeenCalledTimes(2);
    expect(firstSocket.disconnect).toHaveBeenCalledOnce();

    await act(async () => {
      oldInbox.resolve({ conversations: [conversation('old-conversation')], pagination: { page: 1, limit: 50, total: 1, pages: 1 } });
      oldNotifications.resolve({ notifications: [notification('old-notification', 'profile-1')], pagination: { page: 1, limit: 50, total: 1, pages: 1 } });
      await Promise.resolve();
    });
    expect(screen.getByTestId('conversation-ids').textContent).toBe('new-conversation');
    expect(screen.getByTestId('notification-ids').textContent).toBe('new-notification');
    expect(ioMock.mock.calls.map((call) => call[1].auth.profileId)).toEqual(['profile-1', 'profile-2']);
    view.unmount();
    expect(secondSocket.disconnect).toHaveBeenCalledOnce();
  });
});
