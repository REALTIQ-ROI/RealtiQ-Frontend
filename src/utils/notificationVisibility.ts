import type { RealtiqNotification } from '../types';
const allowedCategories = new Set(['messages', 'saved_searches', 'listing_changes', 'inquiries', 'marketplace', 'followed_updates', 'security', 'payments', 'legal']);
const followedUpdateTypes = new Set([
  'following.new_listing',
  'following.price_change',
  'following.project_progress',
  'following.open_house',
  'following.show_home',
  'following.social_post',
]);
export const isDisplayableNotification = (notification: RealtiqNotification) =>
  allowedCategories.has(notification.category)
  && (notification.category !== 'followed_updates' || followedUpdateTypes.has(notification.type))
  && Boolean(notification.id && notification.title?.trim() && notification.body?.trim());

export const mergeNotifications = (
  items: RealtiqNotification[],
  incoming: RealtiqNotification[],
): RealtiqNotification[] => {
  const byId = new Map<string, RealtiqNotification>();
  for (const item of items) byId.set(item.id, item);
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()].sort((left, right) =>
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
};

export const safeNotificationRoute = (notification: RealtiqNotification): string | null => {
  const route = notification.navigation?.route;
  const hasControlCharacter = route ? Array.from(route).some((character) => {
    const code = character.charCodeAt(0);
    return code >= 0 && code <= 31;
  }) : false;
  if (route && route.startsWith('/') && !route.startsWith('//') && !route.includes('\\') && !hasControlCharacter) {
    try {
      const parsed = new URL(route, 'https://realtiq.invalid');
      if (parsed.origin === 'https://realtiq.invalid') return route;
    } catch {
      return null;
    }
  }
  const reference = notification.navigation?.publicReference;
  return reference && /^RTQ-PROP-[A-Z0-9-]+$/.test(reference)
    ? `/properties/${reference}`
    : null;
};
