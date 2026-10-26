/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { messageService } from "../services/messageService";
import { notificationService } from "../services/notificationService";
import { ApiRequestError } from "../lib/axios";
import type {
  MarketplaceConversation,
  MarketplaceMessage,
  NotificationCategory,
  Pagination,
  RealtiqNotification,
  ReadReceipt,
} from "../types";
import { mergeNotifications } from "../utils/notificationVisibility";

type ConnectionState =
  | "offline"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";
interface RealtimeValue {
  connectionState: ConnectionState;
  conversations: MarketplaceConversation[];
  inboxPagination: Pagination | null;
  inboxLoading: boolean;
  inboxLoadingMore: boolean;
  inboxError: string | null;
  inboxUnread: number;
  notifications: RealtiqNotification[];
  notificationPagination: Pagination | null;
  notificationsLoading: boolean;
  notificationsLoadingMore: boolean;
  notificationError: string | null;
  notificationUnread: number;
  activeConversationId: string | null;
  messages: Record<string, MarketplaceMessage[]>;
  messageHasMore: Record<string, boolean>;
  typingUsers: Record<string, string[]>;
  presence: Record<string, string[]>;
  refreshInbox: () => Promise<void>;
  loadMoreInbox: () => Promise<void>;
  refreshNotifications: (query?: { category?: NotificationCategory; read?: boolean }) => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  openConversation: (id: string) => Promise<void>;
  closeConversation: () => void;
  updateConversation: (id: string, body: { archived?: boolean; muted?: boolean; status?: 'open' | 'closed' }) => Promise<MarketplaceConversation>;
  sendMessage: (
    id: string,
    text: string,
    attachmentIds?: string[],
  ) => Promise<MarketplaceMessage>;
  markRead: (id: string, messageId?: string) => Promise<void>;
  loadOlder: (id: string) => Promise<boolean>;
  startTyping: (id: string) => void;
  stopTyping: (id: string) => void;
}
const RealtimeContext = createContext<RealtimeValue | null>(null);
type NotificationQuery = { category?: NotificationCategory; read?: boolean };
export const mergeMessage = (
  items: MarketplaceMessage[],
  incoming: MarketplaceMessage,
) =>
  [...items.filter((item) => item._id !== incoming._id), incoming].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
const realtimeOrigin = () => {
  const configured = import.meta.env.VITE_REALTIME_URL as string | undefined;
  if (configured) return configured;
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return apiBase?.startsWith("http")
    ? new URL(apiBase).origin
    : window.location.origin;
};

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token, user, activeProfile } = useAuth();
  const scopeKey = token && user?._id && activeProfile?.id
    ? `${token}:${user._id}:${activeProfile.id}`
    : '';
  const scopeKeyRef = useRef(scopeKey);
  scopeKeyRef.current = scopeKey;
  const dataScopeRef = useRef(scopeKey);
  const inboxRequestRef = useRef(0);
  const inboxLoadMoreRef = useRef(false);
  const notificationRequestRef = useRef(0);
  const notificationLoadMoreRef = useRef(false);
  const notificationIdsRef = useRef(new Set<string>());
  const notificationQueryRef = useRef<NotificationQuery>({});
  const notificationPageRef = useRef(1);
  const inboxPageRef = useRef(1);
  const socketEpochRef = useRef(0);
  const socketRef = useRef<Socket | null>(null);
  const activeRef = useRef<string | null>(null);
  const activeScopeRef = useRef('');
  const cursors = useRef<Record<string, string | null>>({});
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("offline");
  const [conversations, setConversations] = useState<MarketplaceConversation[]>(
    [],
  );
  const [inboxPagination, setInboxPagination] = useState<Pagination | null>(null);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxLoadingMore, setInboxLoadingMore] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Record<string, MarketplaceMessage[]>
  >({});
  const [messageHasMore, setMessageHasMore] = useState<Record<string, boolean>>({});
  const [notifications, setNotifications] = useState<RealtiqNotification[]>([]);
  const [notificationPagination, setNotificationPagination] = useState<Pagination | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsLoadingMore, setNotificationsLoadingMore] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [presence, setPresence] = useState<Record<string, string[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const refreshInbox = useCallback(async () => {
    if (!token || !user?._id || !activeProfile?.id) return;
    const requestScope = scopeKey;
    if (scopeKeyRef.current !== requestScope) return;
    const requestId = ++inboxRequestRef.current;
    setInboxLoading(true);
    setInboxError(null);
    try {
      const result = await messageService.inbox({ page: 1, limit: 50 });
      if (scopeKeyRef.current !== requestScope || requestId !== inboxRequestRef.current) return;
      setConversations(result.conversations);
      setInboxPagination(result.pagination);
      inboxPageRef.current = result.pagination.page;
    } catch (raw) {
      if (scopeKeyRef.current === requestScope && requestId === inboxRequestRef.current) {
        setInboxError(raw instanceof Error ? raw.message : 'Unable to refresh the conversation inbox.');
      }
      throw raw;
    } finally {
      if (scopeKeyRef.current === requestScope && requestId === inboxRequestRef.current) setInboxLoading(false);
    }
  }, [token, user?._id, activeProfile?.id, scopeKey]);
  const loadMoreInbox = useCallback(async () => {
    if (!token || !activeProfile?.id || inboxLoadMoreRef.current) return;
    if (!inboxPagination || inboxPagination.page >= inboxPagination.pages) return;
    inboxLoadMoreRef.current = true;
    setInboxLoadingMore(true);
    const requestScope = scopeKey;
    if (scopeKeyRef.current !== requestScope) {
      inboxLoadMoreRef.current = false;
      setInboxLoadingMore(false);
      return;
    }
    const requestId = inboxRequestRef.current;
    const page = inboxPageRef.current + 1;
    try {
      const result = await messageService.inbox({ page, limit: 50 });
      if (scopeKeyRef.current !== requestScope || requestId !== inboxRequestRef.current) return;
      setConversations((current) => {
        const byId = new Map(current.map((conversation) => [conversation._id, conversation]));
        for (const conversation of result.conversations) byId.set(conversation._id, conversation);
        return [...byId.values()];
      });
      setInboxPagination(result.pagination);
      inboxPageRef.current = result.pagination.page;
    } finally {
      if (scopeKeyRef.current === requestScope) {
        inboxLoadMoreRef.current = false;
        setInboxLoadingMore(false);
      }
    }
  }, [token, activeProfile?.id, inboxPagination, scopeKey]);
  const refreshNotifications = useCallback(async (query?: NotificationQuery) => {
    if (!token || !user?._id || !activeProfile?.id) return;
    if (query !== undefined) notificationQueryRef.current = query;
    const requestScope = scopeKey;
    if (scopeKeyRef.current !== requestScope) return;
    const requestId = ++notificationRequestRef.current;
    setNotificationsLoading(true);
    setNotificationError(null);
    try {
      const [list, count] = await Promise.all([
        notificationService.list({ page: 1, limit: 50, ...notificationQueryRef.current }),
        notificationService.unreadCount(),
      ]);
      if (scopeKeyRef.current !== requestScope || requestId !== notificationRequestRef.current) return;
      const scoped = list.notifications.filter((item) => item.profileId === activeProfile.id);
      notificationIdsRef.current = new Set(scoped.map((item) => item.id));
      setNotifications(scoped);
      setNotificationPagination(list.pagination);
      notificationPageRef.current = list.pagination.page;
      setNotificationUnread(count);
    } catch (raw) {
      if (scopeKeyRef.current === requestScope && requestId === notificationRequestRef.current) {
        setNotificationError(raw instanceof Error ? raw.message : 'Unable to refresh notifications.');
      }
    } finally {
      if (scopeKeyRef.current === requestScope && requestId === notificationRequestRef.current) setNotificationsLoading(false);
    }
  }, [token, user?._id, activeProfile?.id, scopeKey]);
  const loadMoreNotifications = useCallback(async () => {
    if (!token || !activeProfile?.id || notificationLoadMoreRef.current) return;
    if (!notificationPagination || notificationPagination.page >= notificationPagination.pages) return;
    notificationLoadMoreRef.current = true;
    setNotificationsLoadingMore(true);
    const requestScope = scopeKey;
    if (scopeKeyRef.current !== requestScope) {
      notificationLoadMoreRef.current = false;
      setNotificationsLoadingMore(false);
      return;
    }
    const requestId = notificationRequestRef.current;
    const page = notificationPageRef.current + 1;
    try {
      const result = await notificationService.list({ page, limit: 50, ...notificationQueryRef.current });
      if (scopeKeyRef.current !== requestScope || requestId !== notificationRequestRef.current) return;
      const scoped = result.notifications.filter((item) => item.profileId === activeProfile.id);
      notificationIdsRef.current = new Set([...notificationIdsRef.current, ...scoped.map((item) => item.id)]);
      setNotifications((current) => mergeNotifications(current, scoped));
      setNotificationPagination(result.pagination);
      notificationPageRef.current = result.pagination.page;
    } catch (raw) {
      if (scopeKeyRef.current === requestScope) setNotificationError(raw instanceof Error ? raw.message : 'Unable to load more notifications.');
    } finally {
      if (scopeKeyRef.current === requestScope) {
        notificationLoadMoreRef.current = false;
        setNotificationsLoadingMore(false);
      }
    }
  }, [token, activeProfile?.id, notificationPagination, scopeKey]);
  const refreshHistory = useCallback(async (id: string) => {
    const requestScope = scopeKey;
    if (scopeKeyRef.current !== requestScope) return;
    const result = await messageService.history(id, { limit: 30 });
    if (scopeKeyRef.current !== requestScope) return;
    setMessages((current) => ({
      ...current,
      [id]: result.messages.reduce(mergeMessage, current[id] ?? []),
    }));
    setMessageHasMore((current) => ({ ...current, [id]: result.pageInfo.hasMore }));
    cursors.current[id] = result.pageInfo.nextCursor;
  }, [scopeKey]);

  useEffect(() => {
    const effectScope = scopeKey;
    const epoch = ++socketEpochRef.current;
    if (dataScopeRef.current !== effectScope) {
      dataScopeRef.current = effectScope;
      activeRef.current = null;
      activeScopeRef.current = '';
      cursors.current = {};
      notificationIdsRef.current.clear();
      notificationQueryRef.current = {};
      notificationPageRef.current = 1;
      inboxPageRef.current = 1;
      inboxLoadMoreRef.current = false;
      notificationLoadMoreRef.current = false;
      // Session/profile changes must clear recipient state before fetching the new scope.
      setConnectionState("offline");
      setConversations([]);
      setInboxPagination(null);
      setInboxLoading(false);
      setInboxError(null);
      setMessages({});
      setMessageHasMore({});
      setNotifications([]);
      setNotificationPagination(null);
      setNotificationsLoading(false);
      setNotificationsLoadingMore(false);
      setNotificationError(null);
      setNotificationUnread(0);
      setTypingUsers({});
      setPresence({});
      setActiveConversationId(null);
    }
    const current = (socket?: Socket) => scopeKeyRef.current === effectScope
      && socketEpochRef.current === epoch
      && (!socket || socketRef.current === socket);
    if (!token || !user?._id || !activeProfile?.id) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      activeRef.current = null;
      activeScopeRef.current = '';
      setConnectionState("offline");
      setConversations([]);
      setInboxPagination(null);
      setInboxLoading(false);
      setInboxError(null);
      setMessages({});
      setMessageHasMore({});
      setNotifications([]);
      setNotificationPagination(null);
      setNotificationError(null);
      setNotificationUnread(0);
      setTypingUsers({});
      setPresence({});
      setActiveConversationId(null);
      return;
    }
    setConnectionState("connecting");
    const socket = io(realtimeOrigin(), {
      auth: { token, profileId: activeProfile.id },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    socketRef.current = socket;
    socket.on("connect", () => { if (current(socket)) setConnectionState("connected"); });
    socket.on("disconnect", (reason) => {
      if (current(socket)) setConnectionState(reason === "io client disconnect" ? "offline" : "reconnecting");
    });
    socket.on("connect_error", (error) => {
      if (!current(socket)) return;
      setConnectionState("error");
      if (/unauthorized|expired|invalid/i.test(error.message)) window.dispatchEvent(new Event("realtiq:session-expired"));
    });
    socket.on("realtime:ready", () => {
      if (!current(socket)) return;
      void refreshInbox().catch(() => undefined);
      void refreshNotifications().catch(() => undefined);
      const active = activeRef.current;
      if (active) {
        socket.emit("conversation:join", { conversationId: active });
        void refreshHistory(active).catch(() => undefined);
      }
    });
    // Chapter 08 documents conversation:updated, not a conversation:new event.
    socket.on("conversation:updated", () => { if (current(socket)) void refreshInbox().catch(() => undefined); });
    socket.on("message:new", ({ conversationId, message }: { conversationId: string; message: MarketplaceMessage }) => {
      if (!current(socket)) return;
      setMessages((items) => ({ ...items, [conversationId]: mergeMessage(items[conversationId] ?? [], message) }));
      void refreshInbox().catch(() => undefined);
    });
    socket.on("message:read", (receipt: ReadReceipt) => {
      if (!current(socket) || receipt.userId !== user._id) return;
      setConversations((items) => items.map((item) => item._id === receipt.conversationId ? { ...item, unreadCount: receipt.unreadCount } : item));
    });
    for (const event of ["typing:start", "typing:stop"] as const) {
      socket.on(event, ({ conversationId, userId }: { conversationId: string; userId: string }) => {
        if (!current(socket) || userId === user?._id) return;
        setTypingUsers((items) => ({
          ...items,
          [conversationId]: event === "typing:start"
            ? Array.from(new Set([...(items[conversationId] ?? []), userId]))
            : (items[conversationId] ?? []).filter((id) => id !== userId),
        }));
      });
    }
    socket.on("presence:update", ({ conversationId, userId, online }: { conversationId: string; userId: string; online: boolean }) => {
      if (!current(socket)) return;
      setPresence((items) => ({
        ...items,
        [conversationId]: online
          ? Array.from(new Set([...(items[conversationId] ?? []), userId]))
          : (items[conversationId] ?? []).filter((id) => id !== userId),
      }));
    });
    socket.on("moderation:updated", ({ conversationId }: { conversationId: string }) => {
      if (current(socket) && activeRef.current === conversationId) void refreshHistory(conversationId).catch(() => undefined);
    });
    socket.on("notification:new", ({ notification }: { notification: RealtiqNotification }) => {
      if (!current(socket) || notification.profileId !== activeProfile.id || notificationIdsRef.current.has(notification.id)) return;
      notificationIdsRef.current.add(notification.id);
      void refreshNotifications().catch(() => undefined);
    });
    socket.on("notification:read", () => { if (current(socket)) void refreshNotifications().catch(() => undefined); });
    socket.on("notification:read-all", () => { if (current(socket)) void refreshNotifications().catch(() => undefined); });
    socket.on("notification:archived", () => { if (current(socket)) void refreshNotifications().catch(() => undefined); });
    void refreshInbox().catch(() => undefined);
    void refreshNotifications().catch(() => undefined);
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [token, user?._id, activeProfile?.id, scopeKey, refreshInbox, refreshNotifications, refreshHistory]);

  const openConversation = useCallback(
    async (id: string) => {
      const requestScope = scopeKey;
      if (!requestScope || scopeKeyRef.current !== requestScope) return;
      const previous = activeRef.current;
      if (previous && previous !== id)
        socketRef.current?.emit("conversation:leave", {
          conversationId: previous,
        });
      activeRef.current = id;
      activeScopeRef.current = requestScope;
      setActiveConversationId(id);
      try {
        await Promise.all([
          messageService
            .detail(id)
            .then((conversation) => {
              if (scopeKeyRef.current !== requestScope) return;
              setConversations((items) => [conversation, ...items.filter((item) => item._id !== id)]);
            }),
          refreshHistory(id),
        ]);
        if (scopeKeyRef.current === requestScope) socketRef.current?.emit("conversation:join", { conversationId: id });
      } catch (error) {
        if (scopeKeyRef.current === requestScope && activeRef.current === id) {
          activeRef.current = null;
          activeScopeRef.current = '';
          setActiveConversationId(null);
        }
        throw error;
      }
    },
    [refreshHistory, scopeKey],
  );
  const closeConversation = useCallback(() => {
    if (activeScopeRef.current !== scopeKey || !scopeKey) return;
    const id = activeRef.current;
    if (id)
      socketRef.current?.emit("conversation:leave", { conversationId: id });
    activeRef.current = null;
    activeScopeRef.current = '';
    setActiveConversationId(null);
    setTypingUsers({});
  }, [scopeKey]);
  const updateConversation = useCallback(async (id: string, body: { archived?: boolean; muted?: boolean; status?: 'open' | 'closed' }) => {
    const requestScope = scopeKey;
    if (!requestScope || scopeKeyRef.current !== requestScope) throw new Error('The selected profile changed. Refresh before updating this conversation.');
    const conversation = await messageService.update(id, body);
    if (scopeKeyRef.current !== requestScope) throw new Error('The selected profile changed before the update was confirmed.');
    setConversations((items) => [conversation, ...items.filter((item) => item._id !== id)]);
    return conversation;
  }, [scopeKey]);
  const sendMessage = useCallback(
    (id: string, text: string, attachmentIds: string[] = []) =>
      new Promise<MarketplaceMessage>((resolve, reject) => {
        const requestScope = scopeKey;
        if (!requestScope || scopeKeyRef.current !== requestScope) {
          reject(new Error('The selected profile changed. Refresh the conversation before sending.'));
          return;
        }
        const socket = socketRef.current;
        const fallback = () =>
          messageService
            .send(id, { text: text || undefined, attachmentIds })
            .then((message) => {
              if (scopeKeyRef.current !== requestScope) {
                reject(new Error('The selected profile changed before the message was confirmed.'));
                return;
              }
              setMessages((current) => ({
                ...current,
                [id]: mergeMessage(current[id] ?? [], message),
              }));
              resolve(message);
            }, async (raw) => {
              const isAmbiguous = !(raw instanceof ApiRequestError) || !raw.status || raw.status >= 500;
              if (!isAmbiguous) {
                reject(raw);
                return;
              }
              await refreshHistory(id).catch(() => undefined);
              reject(new Error('Message delivery could not be confirmed. History was refreshed; check the thread before retrying.'));
            });
        if (!socket?.connected) {
          void fallback();
          return;
        }
        socket
          .timeout(12000)
          .emit(
            "message:send",
            { conversationId: id, text: text || undefined, attachmentIds },
            (
              timeout: Error | null,
              result: {
                ok: boolean;
                message?: MarketplaceMessage;
                error?: { message: string };
              },
            ) => {
              if (scopeKeyRef.current !== requestScope) {
                reject(new Error('The selected profile changed before the message was confirmed.'));
                return;
              }
              if (timeout) {
                // The server may have persisted the socket command even though its
                // acknowledgement was delayed. Reconcile instead of sending it again.
                void refreshHistory(id).finally(() =>
                  reject(new Error('Delivery confirmation timed out. History was refreshed; check the thread before retrying.')),
                );
                return;
              }
              if (!result.ok || !result.message) {
                reject(
                  new Error(result.error?.message ?? "Message failed to send."),
                );
                return;
              }
              setMessages((current) => ({
                ...current,
                [id]: mergeMessage(current[id] ?? [], result.message!),
              }));
              resolve(result.message);
            },
          );
      }),
    [refreshHistory, scopeKey],
  );
  const markRead = useCallback(async (id: string, messageId?: string) => {
    const requestScope = scopeKey;
    if (!requestScope || scopeKeyRef.current !== requestScope) return;
    const receipt = await messageService.markRead(id, messageId);
    if (scopeKeyRef.current !== requestScope) return;
    setConversations((items) =>
      items.map((item) =>
        item._id === id ? { ...item, unreadCount: receipt.unreadCount } : item,
      ),
    );
  }, [scopeKey]);
  const loadOlder = useCallback(async (id: string) => {
    const requestScope = scopeKey;
    if (!requestScope || scopeKeyRef.current !== requestScope) return false;
    const before = cursors.current[id];
    if (!before) return false;
    const result = await messageService.history(id, { limit: 30, before });
    if (scopeKeyRef.current !== requestScope) return false;
    setMessages((current) => ({
      ...current,
      [id]: result.messages.reduce(mergeMessage, current[id] ?? []),
    }));
    setMessageHasMore((current) => ({ ...current, [id]: result.pageInfo.hasMore }));
    cursors.current[id] = result.pageInfo.nextCursor;
    return result.pageInfo.hasMore;
  }, [scopeKey]);
  const stopTyping = useCallback((id: string) => {
    if (!scopeKey || scopeKeyRef.current !== scopeKey) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    socketRef.current?.emit("typing:stop", { conversationId: id });
  }, [scopeKey]);
  const startTyping = useCallback(
    (id: string) => {
      if (!scopeKey || scopeKeyRef.current !== scopeKey) return;
      socketRef.current?.emit("typing:start", { conversationId: id });
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => stopTyping(id), 2500);
    },
    [stopTyping, scopeKey],
  );
  const isCurrentScope = dataScopeRef.current === scopeKey;
  const currentConversations = useMemo(() => isCurrentScope ? conversations : [], [isCurrentScope, conversations]);
  const currentNotifications = useMemo(() => isCurrentScope ? notifications : [], [isCurrentScope, notifications]);
  const currentMessages = useMemo(() => isCurrentScope ? messages : {}, [isCurrentScope, messages]);
  const value = useMemo(
    () => ({
      connectionState: isCurrentScope ? connectionState : 'offline',
      conversations: currentConversations,
      inboxPagination: isCurrentScope ? inboxPagination : null,
      inboxLoading: isCurrentScope && inboxLoading,
      inboxLoadingMore: isCurrentScope && inboxLoadingMore,
      inboxError: isCurrentScope ? inboxError : null,
      inboxUnread: currentConversations.reduce(
        (sum, item) => sum + (item.unreadCount ?? 0),
        0,
      ),
      notifications: currentNotifications,
      notificationPagination: isCurrentScope ? notificationPagination : null,
      notificationsLoading: isCurrentScope && notificationsLoading,
      notificationsLoadingMore: isCurrentScope && notificationsLoadingMore,
      notificationError: isCurrentScope ? notificationError : null,
      notificationUnread: isCurrentScope ? notificationUnread : 0,
      activeConversationId: isCurrentScope ? activeConversationId : null,
      messages: currentMessages,
      messageHasMore: isCurrentScope ? messageHasMore : {},
      typingUsers: isCurrentScope ? typingUsers : {},
      presence: isCurrentScope ? presence : {},
      refreshInbox,
      loadMoreInbox,
      refreshNotifications,
      loadMoreNotifications,
      openConversation,
      closeConversation,
      updateConversation,
      sendMessage,
      markRead,
      loadOlder,
      startTyping,
      stopTyping,
    }),
    [
      connectionState,
      currentConversations,
      inboxPagination,
      inboxLoading,
      inboxLoadingMore,
      inboxError,
      currentNotifications,
      notificationPagination,
      notificationsLoading,
      notificationsLoadingMore,
      notificationError,
      notificationUnread,
      activeConversationId,
      currentMessages,
      messageHasMore,
      typingUsers,
      presence,
      isCurrentScope,
      refreshInbox,
      loadMoreInbox,
      refreshNotifications,
      loadMoreNotifications,
      openConversation,
      closeConversation,
      updateConversation,
      sendMessage,
      markRead,
      loadOlder,
      startTyping,
      stopTyping,
    ],
  );
  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}
export const useRealtime = () => {
  const value = useContext(RealtimeContext);
  if (!value)
    throw new Error("useRealtime must be used within RealtimeProvider");
  return value;
};
