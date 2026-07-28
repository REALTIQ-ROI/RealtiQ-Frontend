export const PROXY_DATA_CHANGED = 'realtiq:proxy-data-changed';
export const invalidateProxyData = (requestId?: string) =>
  window.dispatchEvent(new CustomEvent(PROXY_DATA_CHANGED, { detail: { requestId } }));
