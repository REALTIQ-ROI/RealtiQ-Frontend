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
import type {
  MarketplaceConversation,
  MarketplaceMessage,
  RealtiqNotification,
  ReadReceipt,
} from "../types";

type ConnectionState =
  | "offline"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";
interface RealtimeValue {
  connectionState: ConnectionState;
  conversations: MarketplaceConversation[];
  inboxUnread: number;
  notifications: RealtiqNotification[];
  notificationUnread: number;
  activeConversationId: string | null;
  messages: Record<string, MarketplaceMessage[]>;
  typingUsers: Record<string, string[]>;
  presence: Record<string, string[]>;
  refreshInbox: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  openConversation: (id: string) => Promise<void>;
  closeConversation: () => void;
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
  const { token, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const activeRef = useRef<string | null>(null);
  const cursors = useRef<Record<string, string | null>>({});
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("offline");
  const [conversations, setConversations] = useState<MarketplaceConversation[]>(
    [],
  );
  const [messages, setMessages] = useState<
    Record<string, MarketplaceMessage[]>
  >({});
  const [notifications, setNotifications] = useState<RealtiqNotification[]>([]);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [presence, setPresence] = useState<Record<string, string[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const refreshInbox = useCallback(async () => {
    if (token)
      setConversations(
        (await messageService.inbox({ page: 1, limit: 50 })).conversations,
      );
  }, [token]);
  const refreshNotifications = useCallback(async () => {
    if (!token) return;
    const [list, count] = await Promise.all([
      notificationService.list({ page: 1, limit: 50 }),
      notificationService.unreadCount(),
    ]);
    setNotifications(list.notifications);
    setNotificationUnread(count);
  }, [token]);
  const refreshHistory = useCallback(async (id: string) => {
    const result = await messageService.history(id, { limit: 30 });
    setMessages((current) => ({
      ...current,
      [id]: result.messages.reduce(mergeMessage, current[id] ?? []),
    }));
    cursors.current[id] = result.pageInfo.nextCursor;
  }, []);

  useEffect(() => {
    if (!token || !user?._id) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      activeRef.current = null;
      // Session removal is an external auth event; clearing all recipient state here prevents account leakage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConnectionState("offline");
      setConversations([]);
      setMessages({});
      setNotifications([]);
      setNotificationUnread(0);
      return;
    }
    setConnectionState("connecting");
    const socket = io(realtimeOrigin(), {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    socketRef.current = socket;
    socket.on("connect", () => setConnectionState("connected"));
    socket.on("disconnect", (reason) =>
      setConnectionState(
        reason === "io client disconnect" ? "offline" : "reconnecting",
      ),
    );
    socket.on("connect_error", (error) => {
      setConnectionState("error");
      if (/unauthorized|expired|invalid/i.test(error.message))
        window.dispatchEvent(new Event("realtiq:session-expired"));
    });
    socket.on("realtime:ready", () => {
      void refreshInbox();
      void refreshNotifications();
      const active = activeRef.current;
      if (active) {
        socket.emit("conversation:join", { conversationId: active });
        void refreshHistory(active);
      }
    });
    socket.on("conversation:new", () => void refreshInbox());
    socket.on("conversation:updated", () => void refreshInbox());
    socket.on(
      "message:new",
      ({
        conversationId,
        message,
      }: {
        conversationId: string;
        message: MarketplaceMessage;
      }) => {
        setMessages((current) => ({
          ...current,
          [conversationId]: mergeMessage(
            current[conversationId] ?? [],
            message,
          ),
        }));
        void refreshInbox();
      },
    );
    socket.on("message:read", (receipt: ReadReceipt) => {
      if (receipt.userId === user._id)
        setConversations((items) =>
          items.map((item) =>
            item._id === receipt.conversationId
              ? { ...item, unreadCount: receipt.unreadCount }
              : item,
          ),
        );
    });
    for (const event of ["typing:start", "typing:stop"] as const)
      socket.on(
        event,
        ({
          conversationId,
          userId,
        }: {
          conversationId: string;
          userId: string;
        }) => {
          setTypingUsers((current) => ({
            ...current,
            [conversationId]:
              event === "typing:start"
                ? Array.from(
                    new Set([...(current[conversationId] ?? []), userId]),
                  )
                : (current[conversationId] ?? []).filter((id) => id !== userId),
          }));
        },
      );
    socket.on(
      "presence:update",
      ({
        conversationId,
        userId,
        online,
      }: {
        conversationId: string;
        userId: string;
        online: boolean;
      }) => {
        setPresence((current) => ({
          ...current,
          [conversationId]: online
            ? Array.from(new Set([...(current[conversationId] ?? []), userId]))
            : (current[conversationId] ?? []).filter((id) => id !== userId),
        }));
      },
    );
    socket.on(
      "moderation:updated",
      ({ conversationId }: { conversationId: string }) => {
        if (activeRef.current === conversationId)
          void refreshHistory(conversationId);
      },
    );
    socket.on(
      "notification:new",
      ({ notification }: { notification: RealtiqNotification }) => {
        setNotifications((items) => [
          notification,
          ...items.filter((item) => item._id !== notification._id),
        ]);
        if (!notification.readAt) setNotificationUnread((count) => count + 1);
      },
    );
    socket.on(
      "notification:read",
      ({
        notificationId,
        readAt,
      }: {
        notificationId: string;
        readAt: string;
      }) => {
        setNotifications((items) =>
          items.map((item) =>
            item._id === notificationId ? { ...item, readAt } : item,
          ),
        );
        void notificationService.unreadCount().then(setNotificationUnread);
      },
    );
    socket.on("notification:read-all", ({ readAt }: { readAt: string }) => {
      setNotifications((items) =>
        items.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
      );
      setNotificationUnread(0);
    });
    socket.on(
      "notification:archived",
      ({ notificationId }: { notificationId: string }) => {
        setNotifications((items) =>
          items.filter((item) => item._id !== notificationId),
        );
        void notificationService.unreadCount().then(setNotificationUnread);
      },
    );
    void refreshInbox();
    void refreshNotifications();
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user?._id, refreshInbox, refreshNotifications, refreshHistory]);

  const openConversation = useCallback(
    async (id: string) => {
      const previous = activeRef.current;
      if (previous && previous !== id)
        socketRef.current?.emit("conversation:leave", {
          conversationId: previous,
        });
      activeRef.current = id;
      setActiveConversationId(id);
      await Promise.all([
        messageService
          .detail(id)
          .then((conversation) =>
            setConversations((items) => [
              conversation,
              ...items.filter((item) => item._id !== id),
            ]),
          ),
        refreshHistory(id),
      ]);
      socketRef.current?.emit("conversation:join", { conversationId: id });
    },
    [refreshHistory],
  );
  const closeConversation = useCallback(() => {
    const id = activeRef.current;
    if (id)
      socketRef.current?.emit("conversation:leave", { conversationId: id });
    activeRef.current = null;
    setActiveConversationId(null);
    setTypingUsers({});
  }, []);
  const sendMessage = useCallback(
    (id: string, text: string, attachmentIds: string[] = []) =>
      new Promise<MarketplaceMessage>((resolve, reject) => {
        const socket = socketRef.current;
        const fallback = () =>
          messageService
            .send(id, { text: text || undefined, attachmentIds })
            .then((message) => {
              setMessages((current) => ({
                ...current,
                [id]: mergeMessage(current[id] ?? [], message),
              }));
              resolve(message);
            }, reject);
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
    [refreshHistory],
  );
  const markRead = useCallback(async (id: string, messageId?: string) => {
    const receipt = await messageService.markRead(id, messageId);
    setConversations((items) =>
      items.map((item) =>
        item._id === id ? { ...item, unreadCount: receipt.unreadCount } : item,
      ),
    );
  }, []);
  const loadOlder = useCallback(async (id: string) => {
    const before = cursors.current[id];
    if (!before) return false;
    const result = await messageService.history(id, { limit: 30, before });
    setMessages((current) => ({
      ...current,
      [id]: result.messages.reduce(mergeMessage, current[id] ?? []),
    }));
    cursors.current[id] = result.pageInfo.nextCursor;
    return result.pageInfo.hasMore;
  }, []);
  const stopTyping = useCallback((id: string) => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    socketRef.current?.emit("typing:stop", { conversationId: id });
  }, []);
  const startTyping = useCallback(
    (id: string) => {
      socketRef.current?.emit("typing:start", { conversationId: id });
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => stopTyping(id), 2500);
    },
    [stopTyping],
  );
  const value = useMemo(
    () => ({
      connectionState,
      conversations,
      inboxUnread: conversations.reduce(
        (sum, item) => sum + (item.unreadCount ?? 0),
        0,
      ),
      notifications,
      notificationUnread,
      activeConversationId,
      messages,
      typingUsers,
      presence,
      refreshInbox,
      refreshNotifications,
      openConversation,
      closeConversation,
      sendMessage,
      markRead,
      loadOlder,
      startTyping,
      stopTyping,
    }),
    [
      connectionState,
      conversations,
      notifications,
      notificationUnread,
      activeConversationId,
      messages,
      typingUsers,
      presence,
      refreshInbox,
      refreshNotifications,
      openConversation,
      closeConversation,
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
