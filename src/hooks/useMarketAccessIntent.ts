import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const MARKET_ACCESS_PATH = '/analytics/property-market/access';
const STORAGE_KEY = 'realtiq.marketAccessIntent';
const MAX_AGE = 24 * 60 * 60 * 1000;

export function marketDestination(value: unknown): string | null {
  if (typeof value !== 'string' || /[\\\s]/.test(value)) return null;
  const pathname = value.split(/[?#]/)[0];
  return pathname === MARKET_ACCESS_PATH || pathname === '/analytics/property-market' ? value : null;
}

export function clearMarketAccessIntent() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* The URL preserves intent if storage is unavailable. */ }
}

function savedDestination(): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && typeof saved.createdAt === 'number' && Date.now() - saved.createdAt < MAX_AGE) {
      return marketDestination(saved.destination);
    }
  } catch { /* Ignore unavailable storage or invalid saved intent. */ }
  return null;
}

export function marketAuthPath(path: string, destination: string | null) {
  return destination ? `${path}${path.includes('?') ? '&' : '?'}redirectTo=${encodeURIComponent(destination)}` : path;
}

export function useMarketAccessIntent() {
  const location = useLocation();
  const state = location.state as { redirectTo?: unknown; from?: { pathname?: string; search?: string; hash?: string } } | null;
  const explicitDestination = marketDestination(new URLSearchParams(location.search).get('redirectTo'))
    ?? marketDestination(state?.redirectTo)
    ?? marketDestination(state?.from ? `${state.from.pathname ?? ''}${state.from.search ?? ''}${state.from.hash ?? ''}` : null);
  const destination = explicitDestination ?? savedDestination();

  useEffect(() => {
    if (!explicitDestination) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ destination: explicitDestination, createdAt: Date.now() }));
    } catch { /* Continue with the destination in the URL. */ }
  }, [explicitDestination]);

  return destination;
}
