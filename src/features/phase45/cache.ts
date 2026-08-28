const stores = { valuations: new Map<string, unknown>(), trust: new Map<string, unknown>(), appeals: new Map<string, unknown>(), admin: new Map<string, unknown>() };
export type Phase45CacheName = keyof typeof stores;
export const authCacheKey = (resource: string) => { try { const user = JSON.parse(localStorage.getItem('user') || '{}') as { _id?: string; role?: string }; return `${user._id || 'anonymous'}:${user.role || 'none'}:${resource}`; } catch { return `anonymous:none:${resource}`; } };
export const phase45Cache = {
  get<T>(store: Phase45CacheName, key: string): T | undefined { return stores[store].get(authCacheKey(key)) as T | undefined; },
  set<T>(store: Phase45CacheName, key: string, value: T): T { stores[store].set(authCacheKey(key), value); return value; },
  remove(store: Phase45CacheName, key: string) { stores[store].delete(authCacheKey(key)); },
  clear() { Object.values(stores).forEach((store) => store.clear()); },
};
if (typeof window !== 'undefined') window.addEventListener('realtiq:session-changed', () => phase45Cache.clear());
