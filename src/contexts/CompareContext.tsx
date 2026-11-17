import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { compareService, type CompareCategory, type CompareItem, type CompareSet, type Comparison } from '../services/compareService';
import { ApiRequestError } from '../lib/axios';
import { propertyService } from '../services/propertyService';
import type { Property } from '../types';
import ModalPortal from '../components/ui/ModalPortal';
import { apiErrorMessage } from '../utils/apiErrorMessage';

const GUEST_KEY = 'realtiq:compare:guest:v1';
const RETURN_KEY = 'realtiq:compare:return:v1';
const SCROLL_KEY = 'realtiq:compare:return-scroll:v1';

interface GuestCompareState {
  propertyIds: string[];
  category: CompareCategory | null;
  displayCurrency: 'NGN' | 'USD' | null;
  buyerFxOverrideNgnPerUsd: number | null;
}

interface Candidate {
  id: string;
  title: string;
  category: CompareCategory | null;
  thumbnail?: string;
}

interface CompareContextValue {
  propertyIds: string[];
  category: CompareCategory | null;
  set: CompareSet | null;
  comparison: Comparison | null;
  items: CompareItem[];
  trayEntries: Candidate[];
  loading: boolean;
  busy: boolean;
  error: string;
  isBuyer: boolean;
  guest: boolean;
  guestMergeAvailable: boolean;
  canUndo: boolean;
  guestIds: string[];
  guestCategory: CompareCategory | null;
  guestEntries: Candidate[];
  returnPath: string;
  returnScrollY: number;
  refresh: () => Promise<void>;
  toggle: (candidate: Candidate) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  undo: () => Promise<void>;
  replaceSelection: (ids: string[], category: CompareCategory, origin: 'manual' | 'top_matches' | 'similar', criterion?: string, replaceCategory?: boolean) => Promise<void>;
  mergeGuestSelection: (ids: string[], replaceCategory?: boolean) => Promise<void>;
  updatePresentation: (displayCurrency: 'NGN' | 'USD' | null, buyerFxOverrideNgnPerUsd: number | null) => Promise<void>;
}

const CompareContext = createContext<CompareContextValue | null>(null);

const readGuest = (): GuestCompareState => {
  try {
    const value = JSON.parse(localStorage.getItem(GUEST_KEY) ?? 'null') as Partial<GuestCompareState> | null;
    return {
      propertyIds: Array.isArray(value?.propertyIds) ? [...new Set(value.propertyIds.filter((id): id is string => typeof id === 'string'))].slice(0, 4) : [],
      category: value?.category === 'residential' || value?.category === 'commercial' ? value.category : null,
      displayCurrency: value?.displayCurrency === 'NGN' || value?.displayCurrency === 'USD' ? value.displayCurrency : null,
      buyerFxOverrideNgnPerUsd: typeof value?.buyerFxOverrideNgnPerUsd === 'number' && Number.isFinite(value.buyerFxOverrideNgnPerUsd) && value.buyerFxOverrideNgnPerUsd > 0 ? value.buyerFxOverrideNgnPerUsd : null,
    };
  } catch { return { propertyIds: [], category: null, displayCurrency: null, buyerFxOverrideNgnPerUsd: null }; }
};
const candidateCategory = (property: Property): CompareCategory | null => {
  const value = property.category ?? property.canonicalFields?.category ?? property.canonicalEffectiveFields?.category;
  return value === 'residential' || value === 'commercial' ? value : null;
};
const asError = (raw: unknown, fallback: string) => raw instanceof Error ? raw : new Error(fallback);

export const CompareProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated, activeProfile } = useAuth();
  const location = useLocation();
  const isBuyer = Boolean(isAuthenticated && activeProfile?.kind === 'buyer');
  const scope = isBuyer ? `${user?._id ?? ''}:${activeProfile?.id ?? ''}` : '';
  const [guestState, setGuestState] = useState<GuestCompareState>(() => readGuest());
  const [guestComparison, setGuestComparison] = useState<Comparison | null>(null);
  const [guestError, setGuestError] = useState('');
  const [accountState, setAccountState] = useState<{ scope: string; set: CompareSet; comparison: Comparison | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [labels, setLabels] = useState<Record<string, Candidate>>({});
  const [prompt, setPrompt] = useState<{ kind: 'category' | 'capacity'; candidate: Candidate } | null>(null);
  const [replaceId, setReplaceId] = useState('');
  const requestId = useRef(0);
  const mountedScope = accountState?.scope === scope ? accountState : null;

  useEffect(() => {
    localStorage.setItem(GUEST_KEY, JSON.stringify(guestState));
  }, [guestState]);

  const refreshAccount = useCallback(async () => {
    if (!isBuyer || !scope) return;
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const response = await compareService.getActive();
      if (requestId.current !== id) return;
      setAccountState({ scope, set: response.set, comparison: response.comparison });
    } catch (raw) {
      if (requestId.current === id) {
        setAccountState(null);
        setError(apiErrorMessage(raw, 'Your saved comparison could not be loaded.'));
      }
    } finally { if (requestId.current === id) setLoading(false); }
  }, [isBuyer, scope]);

  useEffect(() => {
    requestId.current += 1;
    setAccountState(null);
    setError('');
    setPrompt(null);
    setReplaceId('');
    if (isBuyer && scope) void refreshAccount();
    return () => { requestId.current += 1; };
  }, [isBuyer, scope, refreshAccount]);

  useEffect(() => {
    if (isBuyer || guestState.propertyIds.length < 2) {
      setGuestComparison(null);
      setGuestError('');
      return;
    }
    let active = true;
    setGuestError('');
    void compareService.view({
      propertyIds: guestState.propertyIds,
      displayCurrency: guestState.displayCurrency,
      buyerFxOverrideNgnPerUsd: guestState.buyerFxOverrideNgnPerUsd,
    }).then((value) => { if (active) { setGuestComparison(value); setGuestState((current) => ({ ...current, category: value.category })); } })
      .catch((raw: unknown) => { if (active) { setGuestComparison(null); setGuestError(apiErrorMessage(raw, 'The selected listings cannot be compared right now.')); } });
    return () => { active = false; };
  }, [guestState.buyerFxOverrideNgnPerUsd, guestState.displayCurrency, guestState.propertyIds, isBuyer]);

  useEffect(() => {
    const itemList = mountedScope?.comparison?.items ?? guestComparison?.items ?? [];
    if (itemList.length) {
      setLabels((current) => ({ ...current, ...Object.fromEntries(itemList.map((item) => [item.id, { id: item.id, title: item.title, category: item.category, thumbnail: item.property?.media?.[0]?.url }])) }));
    }
  }, [guestComparison, mountedScope?.comparison]);

  useEffect(() => {
    const ids = [...(mountedScope?.set.propertyIds ?? []), ...guestState.propertyIds];
    const missing = ids.filter((id) => !labels[id]);
    if (!missing.length) return;
    let active = true;
    void Promise.allSettled(missing.map((id) => propertyService.getPublicProperty(id)))
      .then((results) => {
        if (!active) return;
        setLabels((current) => {
          const next = { ...current };
          results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              const property = result.value;
              next[missing[index]] = { id: missing[index], title: property.title || 'Property listing', category: candidateCategory(property), thumbnail: property.media?.[0]?.url };
            }
          });
          return next;
        });
      });
    return () => { active = false; };
  }, [guestState.propertyIds, isBuyer, labels, mountedScope?.set.propertyIds]);

  useEffect(() => {
    const isPropertySearch = location.pathname === '/properties' || location.pathname === '/properties/map';
    const isProjectSearch = location.pathname === '/projects' || location.pathname === '/projects/map' || /^\/projects\/[^/]+\/properties\/?$/.test(location.pathname);
    if (!isPropertySearch && !isProjectSearch) return;
    const current = `${location.pathname}${location.search}`;
    sessionStorage.setItem(RETURN_KEY, current);
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    const update = () => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [location.pathname, location.search]);

  const propertyIds = mountedScope?.set.propertyIds ?? (isBuyer ? [] : guestState.propertyIds);
  const set = mountedScope?.set ?? null;
  const comparison = isBuyer ? mountedScope?.comparison ?? null : guestComparison;
  const category = isBuyer ? set?.category ?? comparison?.category ?? null : guestState.category ?? guestComparison?.category ?? null;
  const currentLabels = propertyIds.map((id) => labels[id] ?? { id, title: 'Property listing', category: null });
  const guestLabels = guestState.propertyIds.map((id) => labels[id] ?? { id, title: 'Loading listing…', category: null });
  const guestMergeAvailable = Boolean(isBuyer && guestState.propertyIds.length && mountedScope);
  const returnPath = sessionStorage.getItem(RETURN_KEY) || '/properties';
  const returnScrollY = Number(sessionStorage.getItem(SCROLL_KEY) || 0);

  const applyAccountSet = useCallback((response: { set: CompareSet; comparison: Comparison | null }, targetScope = scope) => {
    setAccountState({ scope: targetScope, set: response.set, comparison: response.comparison });
  }, [scope]);

  const commit = useCallback(async (ids: string[], options?: { operation?: 'set' | 'replace'; origin?: 'manual' | 'top_matches' | 'similar'; criterion?: string; replaceCategory?: boolean; displayCurrency?: 'NGN' | 'USD' | null; buyerFxOverrideNgnPerUsd?: number | null; category?: CompareCategory | null }) => {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length > 4) throw new Error('Compare supports up to four listings. Choose which items to keep before saving.');
    if (isBuyer) {
      const current = mountedScope?.set;
      if (!current) throw new Error('Your current Buyer comparison is still loading or unavailable. Refresh it before making changes.');
      const currentCategory = current?.category ?? null;
      const categoryChanged = Boolean(options?.category && currentCategory && options.category !== currentCategory);
      if (categoryChanged && !options?.replaceCategory) throw new Error('Confirm starting a new comparison category before replacing the current set.');
      const body = {
        expectedVersion: current?.version ?? 0,
        propertyIds: uniqueIds,
        operation: options?.operation ?? 'set',
        confirmed: true as const,
        origin: options?.origin ?? 'manual',
        ...(options?.origin === 'top_matches' && options.criterion ? { criterion: options.criterion as never } : {}),
        displayCurrency: options?.displayCurrency !== undefined ? options.displayCurrency : current?.displayCurrency ?? null,
        buyerFxOverrideNgnPerUsd: options?.buyerFxOverrideNgnPerUsd !== undefined ? options.buyerFxOverrideNgnPerUsd : current?.buyerFxOverrideNgnPerUsd ?? null,
        ...(options?.replaceCategory || categoryChanged ? { replaceCurrentSet: true } : {}),
      };
      try {
        const response = await compareService.set(body);
        applyAccountSet(response);
      } catch (raw) {
        if (raw instanceof ApiRequestError && raw.code === 'CONFLICT_COMPARE_VERSION') {
          await refreshAccount();
          throw new Error(`Your saved comparison changed elsewhere. The latest set has been refreshed; review it before trying again.${raw.requestId ? ` Support reference: ${raw.requestId}.` : ''}`);
        }
        throw asError(raw, 'Unable to save this comparison.');
      }
      return;
    }
    setGuestState((current) => {
      if (options?.operation === 'replace' || options?.replaceCategory) guestUndoRef.current = current;
      else if (uniqueIds.length < current.propertyIds.length) guestUndoRef.current = current;
      return {
        ...current,
        propertyIds: uniqueIds,
        category: uniqueIds.length ? options?.category ?? current.category : null,
        displayCurrency: options?.displayCurrency !== undefined ? options.displayCurrency : current.displayCurrency,
        buyerFxOverrideNgnPerUsd: options?.buyerFxOverrideNgnPerUsd !== undefined ? options.buyerFxOverrideNgnPerUsd : current.buyerFxOverrideNgnPerUsd,
      };
    });
  }, [applyAccountSet, isBuyer, mountedScope?.set, refreshAccount]);

  const guestUndoRef = useRef<GuestCompareState | null>(null);

  const remove = useCallback(async (id: string) => {
    const next = propertyIds.filter((propertyId) => propertyId !== id);
    setBusy(true); setError('');
    try {
      if (isBuyer && next.length === 0) {
        const response = await compareService.clear(mountedScope?.set.version ?? 0);
        applyAccountSet(response);
      } else await commit(next, { origin: 'manual', category });
      if (!isBuyer && guestUndoRef.current === null) guestUndoRef.current = guestState;
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.code === 'CONFLICT_COMPARE_VERSION') {
        await refreshAccount();
        setError('Your saved comparison changed elsewhere. The latest set has been refreshed; review it before trying again.');
      } else setError(apiErrorMessage(raw, 'Unable to remove this listing.'));
      throw raw;
    } finally { setBusy(false); }
  }, [applyAccountSet, category, commit, guestState, isBuyer, mountedScope?.set.version, propertyIds, refreshAccount]);

  const toggle = useCallback(async (candidate: Candidate) => {
    const ids = propertyIds;
    if (ids.includes(candidate.id)) { await remove(candidate.id); return; }
    if (candidate.category !== 'residential' && candidate.category !== 'commercial') {
      throw new Error('This listing does not have a comparison category supported by the current policy. It has not been added.');
    }
    if (category && category !== candidate.category) { setPrompt({ kind: 'category', candidate }); return; }
    if (ids.length >= 4) { setReplaceId(ids[0]); setPrompt({ kind: 'capacity', candidate }); return; }
    setBusy(true);
    setError('');
    try {
      setLabels((current) => ({ ...current, [candidate.id]: candidate }));
      await commit([...ids, candidate.id], { origin: 'manual', category: candidate.category });
    } catch (raw) { setError(apiErrorMessage(raw, 'Unable to update the comparison.')); throw raw; }
    finally { setBusy(false); }
  }, [category, commit, propertyIds, remove]);

  const clear = useCallback(async () => {
    if (!propertyIds.length) return;
    setBusy(true); setError('');
    try {
      if (isBuyer) {
        const response = await compareService.clear(mountedScope?.set.version ?? 0);
        applyAccountSet(response);
      } else {
        guestUndoRef.current = guestState;
        setGuestState((current) => ({ ...current, propertyIds: [], category: null }));
      }
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.code === 'CONFLICT_COMPARE_VERSION') {
        await refreshAccount();
        setError('Your saved comparison changed elsewhere. The latest set has been refreshed; review it before trying again.');
      } else setError(apiErrorMessage(raw, 'Unable to clear this comparison.'));
    } finally { setBusy(false); }
  }, [applyAccountSet, guestState, isBuyer, mountedScope?.set.version, propertyIds.length, refreshAccount]);

  const undo = useCallback(async () => {
    if (isBuyer) {
      if (!mountedScope?.set.canUndo) return;
      setBusy(true);
      try { applyAccountSet(await compareService.undo(mountedScope.set.version)); }
      catch (raw) {
        if (raw instanceof ApiRequestError && raw.code === 'CONFLICT_COMPARE_VERSION') await refreshAccount();
        else if (raw instanceof ApiRequestError && raw.code === 'CONFLICT_COMPARE_UNDO_UNAVAILABLE') await refreshAccount();
        setError(apiErrorMessage(raw, 'The previous comparison can no longer be restored.'));
      } finally { setBusy(false); }
      return;
    }
    if (guestUndoRef.current) { setGuestState(guestUndoRef.current); guestUndoRef.current = null; }
  }, [applyAccountSet, isBuyer, mountedScope, refreshAccount]);

  const confirmPrompt = useCallback(async () => {
    if (!prompt) return;
    const candidate = prompt.candidate;
    setPrompt(null); setBusy(true); setError('');
    try {
      if (prompt.kind === 'category') {
        await commit([candidate.id], { operation: 'set', origin: 'manual', replaceCategory: true, category: candidate.category });
      } else {
        const targetId = propertyIds.includes(replaceId) ? replaceId : propertyIds[0];
        const next = [...propertyIds.filter((id) => id !== targetId), candidate.id];
        await commit(next, { operation: 'replace', origin: 'manual', category: category ?? candidate.category });
      }
    } catch (raw) { setError(apiErrorMessage(raw, 'The comparison could not be replaced.')); }
    finally { setBusy(false); setReplaceId(''); }
  }, [category, commit, prompt, propertyIds, replaceId]);

  const replaceSelection = useCallback(async (ids: string[], nextCategory: CompareCategory, origin: 'manual' | 'top_matches' | 'similar', criterion?: string, replaceCategory = false) => {
    await commit(ids, { operation: propertyIds.length && !replaceCategory ? 'replace' : 'set', origin, criterion, category: nextCategory, replaceCategory });
  }, [commit, propertyIds.length]);

  const mergeGuestSelection = useCallback(async (ids: string[], replaceCategory = false) => {
    await commit(ids, { operation: propertyIds.length && !replaceCategory ? 'replace' : 'set', origin: 'manual', category: guestState.category, replaceCategory });
    setGuestState((current) => {
      const remaining = current.propertyIds.filter((id) => !ids.includes(id));
      return { ...current, propertyIds: remaining, category: remaining.length ? current.category : null };
    });
  }, [commit, guestState.category, propertyIds.length]);

  const updatePresentation = useCallback(async (displayCurrency: 'NGN' | 'USD' | null, buyerFxOverrideNgnPerUsd: number | null) => {
    if (isBuyer) await commit(propertyIds, { origin: mountedScope?.set.origin?.source ?? 'manual', criterion: mountedScope?.set.origin?.criterion, displayCurrency, buyerFxOverrideNgnPerUsd, category });
    else setGuestState((current) => ({ ...current, displayCurrency, buyerFxOverrideNgnPerUsd }));
  }, [category, commit, isBuyer, mountedScope?.set.origin, propertyIds]);

  const contextValue = useMemo<CompareContextValue>(() => ({
    propertyIds,
    category,
    set,
    comparison,
    items: comparison?.items ?? [],
    trayEntries: currentLabels,
    loading: isBuyer ? loading || !mountedScope : Boolean(guestState.propertyIds.length > 1 && !guestComparison && !guestError),
    busy,
    error: error || guestError,
    isBuyer,
    guest: !isBuyer,
    guestMergeAvailable,
    canUndo: isBuyer ? Boolean(set?.canUndo) : Boolean(guestUndoRef.current),
    guestIds: guestState.propertyIds,
    guestCategory: guestState.category,
    guestEntries: guestLabels,
    returnPath,
    returnScrollY,
    refresh: async () => { if (isBuyer) await refreshAccount(); else if (guestState.propertyIds.length > 1) setGuestComparison(await compareService.view({ propertyIds: guestState.propertyIds, displayCurrency: guestState.displayCurrency, buyerFxOverrideNgnPerUsd: guestState.buyerFxOverrideNgnPerUsd })); },
    toggle,
    remove,
    clear,
    undo,
    replaceSelection,
    mergeGuestSelection,
    updatePresentation,
  }), [propertyIds, category, set, comparison, currentLabels, guestLabels, labels, isBuyer, loading, mountedScope, guestState, guestComparison, guestError, busy, error, guestMergeAvailable, returnPath, returnScrollY, refreshAccount, toggle, remove, clear, undo, replaceSelection, mergeGuestSelection, updatePresentation]);

  const promptItems = (mountedScope?.set.propertyIds ?? guestState.propertyIds).map((id) => labels[id] ?? { id, title: 'Property listing', category: null });
  const activePrompt = prompt;

  return <CompareContext.Provider value={contextValue}>
    {children}
    {activePrompt ? <ModalPortal><div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/65 p-4" role="presentation" onClick={() => setPrompt(null)}><section role="alertdialog" aria-modal="true" aria-labelledby="compare-confirm-title" className="w-full max-w-lg space-y-4 rounded-2xl bg-surface p-6 text-on-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div><h2 id="compare-confirm-title" className="text-xl font-black">{activePrompt.kind === 'category' ? 'Start a new comparison?' : 'Replace one listing?'}</h2><p className="mt-2 text-sm text-secondary">{activePrompt.kind === 'category' ? 'Compare supports one category at a time. Your current set will be replaced only after you confirm; it can be restored once if the server allows undo.' : 'Your comparison already has four listings. Choose which one to replace. The current set remains available for one-step undo.'}</p></div>
      {activePrompt.kind === 'category' ? <div className="rounded-lg bg-surface-container-low p-3 text-sm"><strong>{activePrompt.candidate.title}</strong><span className="ml-2 text-secondary">· {activePrompt.candidate.category}</span></div> : <fieldset className="space-y-2"><legend className="text-sm font-bold">Replace this listing</legend>{promptItems.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm"><input type="radio" name="compare-replace" checked={replaceId === item.id} onChange={() => setReplaceId(item.id)} /><span>{item.title}</span></label>)}<div className="rounded-lg bg-surface-container-low p-3 text-sm"><strong>New listing:</strong> {activePrompt.candidate.title}</div></fieldset>}
      <div className="flex justify-end gap-2"><button type="button" className="rounded-lg border px-4 py-2 font-bold" onClick={() => setPrompt(null)}>Keep current set</button><button type="button" disabled={busy || (activePrompt.kind === 'capacity' && !replaceId)} className="rounded-lg bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50" onClick={() => void confirmPrompt()}>{busy ? 'Updating…' : activePrompt.kind === 'category' ? 'Start new comparison' : 'Replace selected listing'}</button></div>
    </section></div></ModalPortal> : null}
  </CompareContext.Provider>;
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) throw new Error('useCompare must be used inside CompareProvider.');
  return context;
};

export const compareCandidateFromProperty = (property: Property): Candidate => ({
  id: property._id,
  title: property.title || property.publicReference || 'Property listing',
  category: candidateCategory(property),
  thumbnail: property.media?.[0]?.url,
});

export const compareCategoryFromItem = (item: CompareItem): CompareCategory | null => item.category;

