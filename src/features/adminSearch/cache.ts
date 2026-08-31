import type { AdminSearchResponse } from '../../types/adminSearch';
const cache = new Map<string, { value: AdminSearchResponse; expires: number }>();
export const adminSearchCache = {
  get(key: string) { const item = cache.get(key); if (!item || item.expires < Date.now()) { cache.delete(key); return undefined; } return item.value; },
  set(key: string, value: AdminSearchResponse) { cache.set(key, { value, expires: Date.now() + 30_000 }); },
  clear() { cache.clear(); },
};
if (typeof window !== 'undefined') window.addEventListener('realtiq:session-changed', adminSearchCache.clear);
