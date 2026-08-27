import type { PropertyPaymentType, UserRole } from "./index";
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
export interface MarketplaceParticipant {
  _id: string;
  name: string;
  role: UserRole;
}
export interface MarketplacePropertySummary {
  _id: string;
  title: string;
  publicReference: string;
  price?: number;
  currency?: string;
  location?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  media?: Array<{ url: string; type?: string }>;
  status?: string;
  approvalStatus?: string;
  paymentTypes?: PropertyPaymentType[];
}
export interface MessageAttachment {
  mimeType: string;
  originalFileName: string;
  fileSizeBytes: number;
  url: string;
}
export interface MarketplaceMessage {
  _id: string;
  conversation: string;
  sender: MarketplaceParticipant | string;
  kind: string;
  text: string;
  attachments: MessageAttachment[];
  moderated?: boolean;
  createdAt: string;
  updatedAt?: string;
}
export interface ParticipantState {
  user: string;
  lastReadAt?: string;
  lastReadMessage?: string;
  archivedAt?: string;
  muted?: boolean;
}
export interface MarketplaceConversation {
  _id: string;
  type: "property";
  property: MarketplacePropertySummary;
  inquiry?: string;
  participants: MarketplaceParticipant[];
  status: "open" | "closed" | "blocked";
  participantState?: ParticipantState[];
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageText?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}
export interface StagedAttachment {
  assetId: string;
  mimeType: string;
  originalFileName: string;
  fileSizeBytes: number;
  expiresAt: string;
}
export interface ReadReceipt {
  conversationId: string;
  userId: string;
  lastReadAt: string;
  lastReadMessage?: string;
  unreadCount: number;
}
export type ReportReason =
  | "spam"
  | "harassment"
  | "fraud"
  | "inappropriate_content"
  | "other";
export type ModerationAction =
  | "dismiss"
  | "warn"
  | "hide_message"
  | "restore_message"
  | "block_conversation"
  | "close_conversation"
  | "reopen_conversation";
export interface ConversationReport {
  _id: string;
  reporter: MarketplaceParticipant | string;
  conversation: { _id: string; property?: string; status?: string } | string;
  message?: string;
  targetKey: string;
  reason: ReportReason;
  details?: string;
  status: "open" | "dismissed" | "actioned";
  createdAt: string;
  updatedAt: string;
}
export interface FavouriteItem {
  savedAt: string;
  property: MarketplacePropertySummary;
}
export interface RecentlyViewedItem {
  viewedAt: string;
  property: MarketplacePropertySummary;
}
export interface SavedSearchFilters {
  location?: string;
  propertyType?: string;
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  paymentType?: string;
}
export interface SavedSearchAlerts {
  enabled: boolean;
  cadence: "instant" | "daily" | "weekly";
  channels: { inApp: boolean; email: boolean };
}
export interface SavedSearch {
  _id: string;
  publicReference: string;
  name: string;
  filters: SavedSearchFilters;
  alerts: SavedSearchAlerts;
  createdAt: string;
  updatedAt: string;
}
export type NotificationCategory =
  | "messages"
  | "saved_searches"
  | "listing_changes"
  | "inquiries"
  | "marketplace"
  | "security"
  | "payments"
  | "legal";
export interface RealtiqNotification {
  _id: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string;
  navigation?: { route?: string; publicReference?: string };
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt?: string;
}
export type PreferenceKey =
  | "messages"
  | "savedSearches"
  | "listingChanges"
  | "inquiries"
  | "marketplace";
export type NotificationPreferenceValues = Record<
  PreferenceKey,
  { inApp: boolean; email: boolean }
>;
export interface NotificationPreferences {
  _id: string;
  categories: NotificationPreferenceValues;
  updatedAt?: string;
}
