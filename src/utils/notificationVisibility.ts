import type { RealtiqNotification } from '../types';
const allowedCategories = new Set(['messages', 'saved_searches', 'listing_changes', 'inquiries', 'marketplace', 'security', 'payments', 'legal']);
export const isDisplayableNotification = (notification: RealtiqNotification) =>
  allowedCategories.has(notification.category)
  && Boolean(notification._id && notification.title?.trim() && notification.body?.trim());
