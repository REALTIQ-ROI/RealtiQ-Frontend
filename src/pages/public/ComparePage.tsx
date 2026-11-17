import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import PublicLayout from '../../components/layout/PublicLayout';
import PropertyMap from '../../components/property/map/PropertyMap';
import InquiryForm from '../../components/forms/InquiryForm';
import ModalPortal from '../../components/ui/ModalPortal';
import LoadingState from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { useCompare } from '../../contexts/CompareContext';
import { compareService, type CompareCategory, type CompareCriterion, type CompareFx, type CompareItem, type CompareSuggestionResponse, type Comparison, type ComparisonAlertSubscription, type RecentSalesResponse } from '../../services/compareService';
import { inquiryService } from '../../services/inquiryService';
import { useCanonicalFieldDictionary } from '../../hooks/useCanonicalFieldDictionary';
import { ApiRequestError } from '../../lib/axios';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { propertyRouteReference } from '../../types';

const criterionOptions: Array<{ value: CompareCriterion; label: string }> = [
  { value: 'lowest_asking_price', label: 'Lowest asking price' },
  { value: 'lowest_price_per_sqm', label: 'Lowest price per m²' },
  { value: 'largest_floor_area', label: 'Largest floor area' },
  { value: 'most_recently_listed', label: 'Most recently listed' },
  { value: 'most_recently_reduced', label: 'Most recently reduced' },
];
const currencyAmount = (amount: number | null | undefined, currency: string | null | undefined) => {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || !currency) return 'Not provided';
  try { return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount); }
  catch { return `${amount.toLocaleString()} ${currency}`; }
};
const formatDateLabel = (value: string | null | undefined) => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Not provided';
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  return `${day}-${month}-${date.getFullYear()}`;
};
const labelize = (value: string) => value.replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2').replaceAll(/[_-]+/g, ' ').replace(/^./, (first) => first.toUpperCase());
const listingStateLabel = (value: string) => {
  const normalized = value.trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  if (normalized === 'available') return 'Available';
  if (normalized === 'under_offer') return 'Under Offer';
  if (normalized === 'sold') return 'Sold';
  if (normalized === 'withdrawn_or_removed') return 'No longer public';
  if (normalized === 'not_released') return 'Not released';
  return labelize(value);
};
const getRecordValue = (value: unknown, key: string) => value && typeof value === 'object' && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, key)
  ? { present: true, value: (value as Record<string, unknown>)[key] }
  : { present: false, value: undefined };
const renderSafeValue = (value: unknown, nullMeaning?: string): string => {
  if (value === null) return nullMeaning ? labelize(nullMeaning) : 'Not provided';
  if (value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : 'Not provided';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.length ? value.map((entry) => renderSafeValue(entry)).join(', ') : 'Not provided';
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([key, entry]) => !/reserve|actual.?sale|private|owner.?id|profile.?id/i.test(key) && ['string', 'number', 'boolean'].includes(typeof entry));
    return entries.length ? entries.map(([key, entry]) => `${labelize(key)}: ${renderSafeValue(entry)}`).join(' · ') : 'Not provided';
  }
  return 'Not provided';
};

const ComparePage = () => {
  const compare = useCompare();
  const { user, isAuthenticated, activeProfile } = useAuth();
  const { dictionary } = useCanonicalFieldDictionary();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sharedIds = useMemo(() => [...new Set((searchParams.get('propertyIds') ?? '').split(',').map((id) => id.trim()).filter(Boolean))], [searchParams]);
  const isShared = sharedIds.length > 0;
  const viewIds = isShared ? sharedIds : compare.propertyIds;
  const [liveComparisonState, setLiveComparisonState] = useState<{ scope: string; comparison: Comparison } | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [displayCurrencyDraft, setDisplayCurrencyDraft] = useState<'NGN' | 'USD' | ''>('');
  const [buyerRateDraft, setBuyerRateDraft] = useState('');
  const [sharedViewCurrency, setSharedViewCurrency] = useState<'NGN' | 'USD' | null>(null);
  const [sharedViewRate, setSharedViewRate] = useState<number | null>(null);
  const [differenceOnly, setDifferenceOnly] = useState(false);
  const [pinnedId, setPinnedId] = useState('');
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [notesDraft, setNotesDraft] = useState<{ scope: string; values: Record<string, string> }>({ scope: '', values: {} });
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);
  const [mergeReplaceCategory, setMergeReplaceCategory] = useState(false);
  const [mergeBusy, setMergeBusy] = useState(false);
  const viewScope = JSON.stringify([
    isShared ? 'shared' : `${user?._id ?? 'guest'}:${activeProfile?.id ?? 'no-profile'}`,
    viewIds,
    isShared ? sharedViewCurrency : compare.set?.displayCurrency,
    isShared ? sharedViewRate : compare.set?.buyerFxOverrideNgnPerUsd,
    refreshVersion,
  ]);
  const liveComparison = liveComparisonState?.scope === viewScope ? liveComparisonState.comparison : null;
  const notesScope = `${isAuthenticated ? user?._id ?? 'account' : 'guest'}:${activeProfile?.id ?? 'no-profile'}`;
  const notes = notesDraft.scope === notesScope ? notesDraft.values : {};
  const updateNote = useCallback((id: string, value: string) => {
    setNotesDraft((current) => ({ scope: notesScope, values: { ...(current.scope === notesScope ? current.values : {}), [id]: value } }));
  }, [notesScope]);

  useEffect(() => {
    if (!isShared) return;
    setSharedViewCurrency(null);
    setSharedViewRate(null);
  }, [isShared, sharedIds]);

  useEffect(() => {
    setDisplayCurrencyDraft(isShared ? sharedViewCurrency ?? '' : compare.set?.displayCurrency ?? '');
    setBuyerRateDraft(isShared ? sharedViewRate ? String(sharedViewRate) : '' : compare.set?.buyerFxOverrideNgnPerUsd ? String(compare.set.buyerFxOverrideNgnPerUsd) : '');
  }, [compare.set?.displayCurrency, compare.set?.buyerFxOverrideNgnPerUsd, isShared, sharedViewCurrency, sharedViewRate]);

  useEffect(() => {
    if (isShared && (sharedIds.length < 2 || sharedIds.length > 4)) {
      setViewError('A shared comparison needs two to four distinct listings.');
      setLiveComparisonState(null);
      setViewLoading(false);
      return;
    }
    if (viewIds.length < 2) { setLiveComparisonState(null); setViewError(''); setViewLoading(false); return; }
    let active = true;
    setViewLoading(true);
    setViewError('');
    void compareService.view({
      propertyIds: viewIds,
      displayCurrency: isShared ? sharedViewCurrency : compare.set?.displayCurrency,
      buyerFxOverrideNgnPerUsd: isShared ? sharedViewRate : compare.set?.buyerFxOverrideNgnPerUsd,
    }).then((result) => { if (active) { setLiveComparisonState({ scope: viewScope, comparison: result }); setOrderedIds((current) => current.length ? current.filter((id) => result.items.some((item) => item.id === id)) : result.items.map((item) => item.id)); } })
      .catch((raw: unknown) => { if (active) { setLiveComparisonState(null); setViewError(apiErrorMessage(raw, 'The current comparison is unavailable. Refresh the list before continuing.')); } })
      .finally(() => { if (active) setViewLoading(false); });
    return () => { active = false; };
  }, [compare.propertyIds, compare.set?.buyerFxOverrideNgnPerUsd, compare.set?.displayCurrency, isShared, refreshVersion, searchParams, sharedIds, sharedViewCurrency, sharedViewRate, viewIds, viewScope]);

  useEffect(() => {
    if (!compare.guestMergeAvailable) return;
    const accountIds = compare.set?.propertyIds ?? [];
    const categoryDiffers = Boolean(compare.category && compare.guestCategory && compare.category !== compare.guestCategory);
    const candidateIds = categoryDiffers ? compare.guestIds : [...accountIds, ...compare.guestIds];
    const uniqueIds = candidateIds.filter((id, index, values) => values.indexOf(id) === index);
    const initial = categoryDiffers ? uniqueIds : uniqueIds.length <= 4 ? uniqueIds : [];
    setMergeSelection(initial);
    setMergeReplaceCategory(false);
  }, [compare.guestMergeAvailable, compare.set?.propertyIds, compare.guestIds, compare.category, compare.guestCategory]);

  const comparison = isShared ? liveComparison : liveComparison ?? compare.comparison;
  const items = useMemo(() => {
    const source = comparison?.items ?? [];
    if (!orderedIds.length) return source;
    const byId = new Map(source.map((item) => [item.id, item]));
    const sorted = orderedIds.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []);
    return [...sorted, ...source.filter((item) => !orderedIds.includes(item.id))];
  }, [comparison?.items, orderedIds]);
  const currentCategory = isShared ? comparison?.category ?? null : comparison?.category ?? compare.category;
  const pageError = viewError || (compare.isBuyer ? compare.error : '');
  const canonicalFieldMap = useMemo(() => new Map((dictionary?.fields ?? []).map((field) => [field.key, field])), [dictionary]);

  const restoreResults = () => navigate(compare.returnPath, { state: { restoreScrollY: compare.returnScrollY } });
  const updateSetPresentation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const rate = buyerRateDraft.trim() ? Number(buyerRateDraft) : null;
    if (rate !== null && (!Number.isFinite(rate) || rate <= 0)) { toast.error('Enter a positive buyer rate or clear the field.'); return; }
    try {
      if (isShared) {
        setSharedViewCurrency(displayCurrencyDraft || null);
        setSharedViewRate(rate);
        setRefreshVersion((version) => version + 1);
        toast.success('Temporary display settings applied to this shared comparison.');
        return;
      }
      await compare.updatePresentation(displayCurrencyDraft || null, rate);
      setRefreshVersion((version) => version + 1);
      toast.success('Compare display updated. Original listing prices remain visible.');
    } catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to update Compare display.'); }
  };

  const share = async () => {
    if (viewIds.length < 2) return;
    const url = new URL('/compare', window.location.origin);
    url.searchParams.set('propertyIds', viewIds.join(','));
    try { await navigator.clipboard.writeText(url.toString()); toast.success('Public comparison link copied.'); }
    catch { toast.error('Unable to copy the comparison link on this device.'); }
  };

  const removeSharedPlaceholder = (propertyId: string) => {
    if (!isShared || !orderedItems.some((item) => item.id === propertyId && item.unavailableReason)) return;
    const remaining = sharedIds.filter((id) => id !== propertyId);
    if (remaining.length < 2) { navigate('/compare', { replace: true }); return; }
    const params = new URLSearchParams();
    params.set('propertyIds', remaining.join(','));
    navigate(`/compare?${params.toString()}`, { replace: true });
  };

  const startPurchaseNegotiation = (propertyId: string) => {
    const target = `/dashboard/buyer/sale-negotiations/new?propertyId=${encodeURIComponent(propertyId)}`;
    if (!isAuthenticated) {
      navigate('/login-to-purchase', { state: { redirectTo: target } });
      return;
    }
    if (activeProfile?.kind !== 'buyer') {
      toast.error('Select an eligible Buyer profile to start a purchase negotiation.');
      return;
    }
    navigate(target);
  };

  const addSharedToTray = async () => {
    if (!liveComparison?.category) return;
    try { await compare.replaceSelection(sharedIds, liveComparison.category, 'manual', undefined, Boolean(compare.category && compare.category !== liveComparison.category)); toast.success('Shared listings added to Compare.'); }
    catch (raw) { toast.error(raw instanceof Error ? raw.message : 'Unable to add these listings to Compare.'); }
  };

  const orderedItems = items;
  const markerIds = new Map<string, string>();
  Object.entries(comparison?.objectiveMarkers ?? {}).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') return;
    const id = (value as Record<string, unknown>).propertyId;
    if (typeof id === 'string') markerIds.set(id, [...(markerIds.get(id) ? [markerIds.get(id)!] : []), labelize(key).replace('Lowest ', 'Lowest ')].join(' · '));
  });
  const dynamicKeys = [...new Set(orderedItems.flatMap((item) => Object.keys(item.effectiveFields ?? {})))].filter((key) => !/reserve|actual.?sale|private|owner.?id|profile.?id/i.test(key));
  const baseRows: Array<{ key: string; label: string; value: (item: CompareItem) => { present: boolean; value: unknown }; formatter?: (item: CompareItem) => string; nullMeaning?: string }> = [
    { key: 'askingPrice', label: 'Asking price', value: (item) => ({ present: true, value: item.price }), formatter: (item) => {
      if (item.price.kind === 'poa') return 'Price on application';
      if (item.price.kind === 'unpriced' || item.price.amount === null) return 'Unpriced';
      const original = currencyAmount(item.price.amount, item.price.currency);
      if (typeof item.price.displayAmount === 'number' && item.price.displayCurrency && (item.price.displayAmount !== item.price.amount || item.price.displayCurrency !== item.price.currency)) {
        const source = item.price.conversionSource === 'buyer_override' ? 'Your rate' : item.price.conversionSource === 'official_nfem' ? 'Official rate' : 'Converted display';
        return `${original} · ${currencyAmount(item.price.displayAmount, item.price.displayCurrency)} (${source})`;
      }
      return original;
    } },
    { key: 'pricePerSqm', label: 'Price per m²', value: (item) => ({ present: item.price.pricePerSqm !== null, value: item.price.pricePerSqm }), formatter: (item) => {
      const value = item.price.pricePerSqm;
      if (!value || typeof value.amount !== 'number') return item.price.kind === 'poa' ? 'Price on application' : 'Not provided';
      return `${currencyAmount(value.amount, value.currency)} / m²`;
    } },
    { key: 'propertyType', label: 'Property type', value: (item) => ({ present: typeof item.propertyType === 'string' && item.propertyType.length > 0, value: item.propertyType }) },
    { key: 'location', label: 'Location', value: (item) => { const location = [item.location.area, item.location.lga, item.location.state, item.location.estateName].filter(Boolean).join(', '); return { present: Boolean(location), value: location || null }; } },
    { key: 'internalFloorAreaSqm', label: 'Floor area', value: (item) => ({ present: typeof item.internalFloorAreaSqm === 'number', value: item.internalFloorAreaSqm === null ? null : `${item.internalFloorAreaSqm.toLocaleString()} m²` }) },
    { key: 'availability', label: 'Availability', value: (item) => ({ present: typeof item.availability === 'string' && item.availability.length > 0, value: item.availability }), formatter: (item) => listingStateLabel(item.availability) },
    { key: 'status', label: 'Listing status', value: (item) => ({ present: typeof item.status === 'string' && item.status.length > 0, value: item.status }), formatter: (item) => listingStateLabel(item.status) },
    { key: 'titleVerification', label: 'Title verification', value: (item) => ({ present: typeof item.titleVerification?.status === 'string' && item.titleVerification.status.length > 0, value: item.titleVerification.status }), formatter: (item) => labelize(item.titleVerification.status) },
    { key: 'trust', label: 'REALTIQ verification and trust', value: (item) => ({ present: true, value: [item.trust.platformVerifiedListing ? 'Verified by REALTIQ' : null, item.trust.badge, item.trust.tier].filter(Boolean).join(' · ') || 'No verification or trust tier returned' }) },
    { key: 'freshness', label: 'Listing freshness', value: (item) => ({ present: Boolean(item.freshnessNotice || Object.keys(item.freshness ?? {}).length), value: item.freshnessNotice ? labelize(item.freshnessNotice) : item.freshness.state ?? null }) },
    { key: 'listedAt', label: 'Listed', value: (item) => ({ present: item.listedAt !== null, value: item.listedAt ? formatDateLabel(item.listedAt) : null }) },
  ];
  const rows: typeof baseRows = [...baseRows, ...dynamicKeys.map((key) => {
    const field = canonicalFieldMap.get(key);
    return {
      key,
      label: typeof field?.label === 'string' ? field.label : labelize(key),
      value: (item: CompareItem) => getRecordValue(item.effectiveFields, key),
      nullMeaning: typeof field?.nullMeaning === 'string' ? field.nullMeaning : undefined,
    };
  })].filter((row) => orderedItems.some((item) => row.value(item).present)).filter((row) => !differenceOnly || new Set(orderedItems.map((item) => {
    const result = row.value(item);
    return result.present ? JSON.stringify(result.value) : '__not_provided__';
  })).size > 1);

  return <PublicLayout>
    <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 pb-48 sm:px-8 sm:pb-48">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><button type="button" onClick={restoreResults} className="mb-3 text-sm font-bold text-primary underline">← Back to results</button><p className="text-xs font-bold uppercase tracking-widest text-secondary">Buyer tools</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">Compare properties</h1><p className="mt-2 max-w-3xl text-sm text-secondary">Compare current public details side by side. Seller prices, availability and eligibility always come from the latest server response.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={viewIds.length < 2 || viewLoading} onClick={() => void share()} className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-50">Share comparison</button><button type="button" onClick={() => setRefreshVersion((version) => version + 1)} className="rounded-lg border px-4 py-2 text-sm font-bold">Refresh current details</button></div>
      </header>

      {compare.loading ? <LoadingState label="Loading your current comparison…" /> : null}
      {pageError ? <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p>{pageError}</p>{compare.error ? <button type="button" onClick={() => void compare.refresh()} className="mt-2 font-bold underline">Reload saved comparison</button> : null}</div> : null}
      {viewLoading ? <p role="status" className="text-sm text-secondary">Refreshing current listing details…</p> : null}

      {!isShared && compare.guestMergeAvailable ? <section className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5" aria-labelledby="guest-merge-title">
        <div><h2 id="guest-merge-title" className="text-xl font-black">Merge your guest comparison?</h2><p className="mt-1 text-sm text-secondary">These guest selections are stored only on this device. Choose the listings to keep, then confirm the merge into the current Buyer profile.</p></div>
        <fieldset className="grid gap-2 sm:grid-cols-2"><legend className="sr-only">Choose listings to keep</legend>{[...(compare.set?.propertyIds ?? []), ...compare.guestIds].filter((id, index, values) => values.indexOf(id) === index).map((id) => { const title = compare.items.find((item) => item.id === id)?.title ?? compare.guestEntries.find((entry) => entry.id === id)?.title ?? 'Property listing'; return <label key={id} className="flex items-center gap-2 rounded-lg bg-surface p-3 text-sm"><input type="checkbox" checked={mergeSelection.includes(id)} disabled={!mergeSelection.includes(id) && mergeSelection.length >= 4} onChange={(event) => setMergeSelection((current) => event.target.checked ? [...current, id] : current.filter((entry) => entry !== id))} /><span>{title}</span></label>; })}</fieldset>
        {!(compare.category && compare.guestCategory && compare.category !== compare.guestCategory) && compare.set?.propertyIds && compare.guestIds.length && compare.set.propertyIds.length + compare.guestIds.filter((id) => !compare.set?.propertyIds.includes(id)).length > 4 && mergeSelection.length === 0 ? <p role="status" className="text-sm text-secondary">Together these sets contain more than four listings. Choose up to four to merge. Unselected guest listings will stay on this device for a later merge.</p> : null}
        {compare.category && compare.guestCategory && compare.category !== compare.guestCategory ? <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={mergeReplaceCategory} onChange={(event) => { const next = event.target.checked; setMergeReplaceCategory(next); setMergeSelection(next ? compare.guestIds.slice(0, 4) : (compare.set?.propertyIds ?? []).slice(0, 4)); }} /><span>Replace the account comparison with the guest {compare.guestCategory} set. I understand the previous set can only be restored if the server offers undo.</span></label> : null}
        <button type="button" disabled={mergeBusy || !mergeSelection.length || mergeSelection.length > 4 || Boolean(compare.category && compare.guestCategory && compare.category !== compare.guestCategory && !mergeReplaceCategory)} onClick={() => { setMergeBusy(true); void compare.mergeGuestSelection(mergeSelection, mergeReplaceCategory).then(() => toast.success('Guest selections merged into your Buyer comparison.')).catch((raw) => toast.error(raw instanceof Error ? raw.message : 'Unable to merge these listings.')).finally(() => setMergeBusy(false)); }} className="rounded-lg bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50">{mergeBusy ? 'Merging…' : 'Confirm selected listings'}</button>
      </section> : null}

      {viewIds.length < 2 ? <section className="rounded-2xl border border-dashed p-8 text-center"><h2 className="text-xl font-black">Add at least two listings</h2><p className="mt-2 text-sm text-secondary">Your Compare tray has {viewIds.length} of 4 listings. Add another property from search or preview similar homes below.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><Link to="/properties" className="rounded-lg bg-primary px-4 py-2 font-bold text-on-primary">Browse properties</Link>{viewIds.length === 1 ? <button type="button" onClick={() => document.getElementById('compare-suggestions')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-lg border px-4 py-2 font-bold">Compare with similar</button> : null}</div></section> : null}

      {isShared && liveComparison && !compare.propertyIds.length ? <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-surface p-4"><div><h2 className="font-bold">Shared public comparison</h2><p className="text-sm text-secondary">These public listing IDs are shared in the link. Your saved comparison has not been changed.</p></div><button type="button" onClick={() => void addSharedToTray()} className="rounded-lg bg-primary px-4 py-2 font-bold text-on-primary">Add shared listings to my Compare</button></section> : null}

      {orderedItems.length >= 2 ? <>
        {comparison?.statusSummary ? <section className="grid grid-cols-2 gap-3 rounded-xl bg-surface p-4 text-sm sm:grid-cols-4"><p><strong>{comparison.statusSummary.available ?? 0}</strong> Available</p><p><strong>{comparison.statusSummary.underOffer ?? 0}</strong> Under Offer</p><p className="text-gray-600"><strong>{comparison.statusSummary.sold ?? 0}</strong> Sold</p><p><strong>{comparison.statusSummary.withdrawnOrRemoved ?? 0}</strong> No longer public</p></section> : null}
        {comparison?.changesSinceLastVisit?.length ? <section className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4" aria-live="polite"><h2 className="font-bold">Changes since your last visit</h2>{comparison.changesSinceLastVisit.map((change, index) => <p key={`${String(change.propertyId)}-${index}`} className="text-sm">{orderedItems.find((item) => item.id === change.propertyId)?.title ?? 'A compared listing'}: {change.type === 'status_changed' ? `status changed from ${String(change.from)} to ${String(change.to)}` : `asking price changed${change.direction ? ` (${String(change.direction)})` : ''}`}</p>)}</section> : null}
        {comparison?.fx ? <FxNotice fx={comparison.fx} /> : null}
        <form onSubmit={(event) => void updateSetPresentation(event)} className="flex flex-wrap items-end gap-3 rounded-xl border bg-surface p-4">
          <label className="text-sm font-semibold">Display currency<select aria-label="Compare display currency" value={displayCurrencyDraft} onChange={(event) => setDisplayCurrencyDraft(event.target.value as 'NGN' | 'USD' | '')} className="mt-1 block rounded-lg border bg-surface px-3 py-2"><option value="">Show seller currencies</option><option value="NGN">NGN</option><option value="USD">USD</option></select></label>
          <label className="text-sm font-semibold">Your rate (NGN per USD)<input aria-label="Your buyer FX rate" type="number" min="0.000001" step="any" inputMode="decimal" value={buyerRateDraft} onChange={(event) => setBuyerRateDraft(event.target.value)} placeholder="Optional" className="mt-1 block w-52 rounded-lg border bg-surface px-3 py-2" /></label>
          <button type="submit" disabled={compare.busy && !isShared} className="rounded-lg bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50">Apply display</button>
          <label className="ml-auto flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={differenceOnly} onChange={(event) => setDifferenceOnly(event.target.checked)} />Show differences only</label>
          {isShared ? <p className="w-full text-xs text-secondary">Display settings on a shared link are temporary and do not change your saved Buyer set.</p> : null}
        </form>

        <section className="grid gap-3 sm:grid-cols-2 md:hidden" aria-label="Property comparisons">
          {orderedItems.map((item, index) => <article key={item.id} className={`space-y-4 rounded-2xl border p-4 ${item.status === 'sold' ? 'border-gray-300 bg-gray-100 text-gray-700' : 'bg-surface'}`}>
            <div className="flex items-start gap-3"><img src={item.property.media?.[0]?.url || ''} alt="" className="h-20 w-24 shrink-0 rounded-lg bg-surface-container-low object-cover" /><div className="min-w-0"><Link to={`/properties/${propertyRouteReference(item.property)}`} className="font-black text-primary underline">{item.title}</Link><p className="mt-1 text-xs text-secondary">{item.publicReference || 'Public listing'}</p>{item.status === 'sold' ? <span className="mt-2 inline-block rounded bg-gray-500 px-2 py-1 text-[10px] font-black uppercase text-white">Sold</span> : null}</div></div>
            {item.duplicateLabel ? <p className="rounded bg-amber-100 p-2 text-xs font-bold text-amber-950">{item.duplicateLabel}</p> : null}
            {markerIds.has(item.id) ? <p className="rounded bg-emerald-100 p-2 text-xs font-bold text-emerald-900">{markerIds.get(item.id)}</p> : null}
            {item.freshnessNotice ? <p className="rounded bg-amber-100 p-2 text-xs font-bold text-amber-950">{item.freshnessNotice === 'needs_confirmation' ? 'Needs confirmation' : 'Freshness reminder'}</p> : null}
            {item.unavailableReason ? <p role="status" className="rounded bg-slate-200 p-2 text-xs">This listing is no longer public. These are its last safe details.</p> : null}
            <div className="flex flex-wrap gap-2"><button type="button" aria-pressed={pinnedId === item.id} onClick={() => setPinnedId(item.id)} className="rounded border px-2 py-1 text-xs font-bold">{pinnedId === item.id ? 'Reference' : 'Pin as reference'}</button><button type="button" disabled={index === 0} onClick={() => setOrderedIds((current) => { const next = [...(current.length ? current : orderedItems.map((entry) => entry.id))]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} className="rounded border px-2 py-1 text-xs font-bold disabled:opacity-40">Move left</button><button type="button" disabled={index === orderedItems.length - 1} onClick={() => setOrderedIds((current) => { const next = [...(current.length ? current : orderedItems.map((entry) => entry.id))]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })} className="rounded border px-2 py-1 text-xs font-bold disabled:opacity-40">Move right</button><button type="button" disabled={isShared ? !item.unavailableReason : compare.busy} onClick={() => isShared ? removeSharedPlaceholder(item.id) : void compare.remove(item.id)} className="rounded border px-2 py-1 text-xs font-bold disabled:opacity-40">{isShared ? 'Remove unavailable listing' : 'Remove'}</button></div>
            <dl className="divide-y divide-outline-variant/15">{rows.map((row) => { const result = row.value(item); const text = row.formatter ? row.formatter(item) : result.present ? renderSafeValue(result.value, row.nullMeaning) : 'Not provided'; return <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 py-2 text-sm"><dt className="font-semibold">{row.label}</dt><dd className="break-words text-right">{text}</dd></div>; })}<div className="py-2"><label className="block text-sm font-semibold">Your private note<textarea aria-label={`Private note for ${item.title}`} value={notes[item.id] ?? ''} onChange={(event) => updateNote(item.id, event.target.value)} rows={2} maxLength={2000} className="mt-1 w-full rounded border bg-surface p-2 font-normal" placeholder="Notes stay on this device." /></label></div></dl>
            {item.availableForPurchase ? <button type="button" onClick={() => startPurchaseNegotiation(item.id)} className="inline-flex rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary">Start purchase negotiation</button> : <span className="inline-flex rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold text-secondary">Not available for purchase</span>}
          </article>)}
        </section>
        <section className="hidden overflow-x-auto rounded-2xl border bg-surface md:block" aria-label="Property comparison table">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead><tr><th scope="col" className="sticky left-0 z-10 w-44 bg-surface p-3">Property facts</th>{orderedItems.map((item, index) => <th scope="col" key={item.id} className={`min-w-[240px] p-3 ${item.status === 'sold' ? 'bg-gray-100 text-gray-600' : ''}`}><div className="space-y-2"><img src={item.property.media?.[0]?.url || ''} alt="" className="h-28 w-full rounded-lg bg-surface-container-low object-cover" /><div className="flex items-start justify-between gap-2"><div><Link to={`/properties/${propertyRouteReference(item.property)}`} className="font-black text-primary underline">{item.title}</Link><p className="mt-1 text-xs text-secondary">{item.publicReference || 'Public listing'}</p></div>{item.status === 'sold' ? <span className="rounded bg-gray-500 px-2 py-1 text-[10px] font-black uppercase text-white">Sold</span> : null}</div>
            {item.duplicateLabel ? <p className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-950">{item.duplicateLabel}</p> : null}{markerIds.has(item.id) ? <p className="rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-900">{markerIds.get(item.id)}</p> : null}{item.freshnessNotice ? <p className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-950">{item.freshnessNotice === 'needs_confirmation' ? 'Needs confirmation' : 'Freshness reminder'}</p> : null}{item.unavailableReason ? <p role="status" className="rounded bg-slate-100 px-2 py-1 text-xs text-secondary">This listing is no longer public. The values shown are its last safe details.</p> : null}
            <div className="flex flex-wrap gap-1"><button type="button" aria-pressed={pinnedId === item.id} onClick={() => setPinnedId(item.id)} className={`rounded border px-2 py-1 text-[11px] font-bold ${pinnedId === item.id ? 'border-primary text-primary' : ''}`}>{pinnedId === item.id ? 'Reference' : 'Pin as reference'}</button><button type="button" disabled={index === 0} onClick={() => setOrderedIds((current) => { const next = [...(current.length ? current : orderedItems.map((entry) => entry.id))]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} className="rounded border px-2 py-1 text-[11px] font-bold disabled:opacity-40">Move left</button><button type="button" disabled={index === orderedItems.length - 1} onClick={() => setOrderedIds((current) => { const next = [...(current.length ? current : orderedItems.map((entry) => entry.id))]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })} className="rounded border px-2 py-1 text-[11px] font-bold disabled:opacity-40">Move right</button><button type="button" disabled={isShared ? !item.unavailableReason : compare.busy} onClick={() => isShared ? removeSharedPlaceholder(item.id) : void compare.remove(item.id)} className="rounded border px-2 py-1 text-[11px] font-bold disabled:opacity-40">{isShared ? 'Remove unavailable listing' : 'Remove'}</button></div>
            {item.availableForPurchase ? <button type="button" onClick={() => startPurchaseNegotiation(item.id)} className="inline-flex rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary">Start purchase negotiation</button> : <span className="inline-flex rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold text-secondary">Not available for purchase</span>}
          </div></th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.key} className="border-t border-outline-variant/20"><th scope="row" className="sticky left-0 z-10 bg-surface p-3 align-top font-bold">{row.label}</th>{orderedItems.map((item) => { const result = row.value(item); const text = row.formatter ? row.formatter(item) : result.present ? renderSafeValue(result.value, row.nullMeaning) : 'Not provided'; return <td key={item.id} className={`border-l border-outline-variant/10 p-3 align-top ${item.status === 'sold' ? 'bg-gray-50 text-gray-600' : ''}`}>{text}</td>; })}</tr>)}
          <tr className="border-t"><th scope="row" className="sticky left-0 bg-surface p-3 align-top font-bold">Your private note</th>{orderedItems.map((item) => <td key={item.id} className="border-l p-3"><textarea aria-label={`Private note for ${item.title}`} value={notes[item.id] ?? ''} onChange={(event) => updateNote(item.id, event.target.value)} rows={3} maxLength={2000} className="w-full rounded border bg-surface p-2 text-sm" placeholder="Notes stay on this device." /></td>)}</tr>
          </tbody></table>
        </section>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => window.print()} className="rounded-lg border px-4 py-2 text-sm font-bold">Print / save as PDF</button><button type="button" onClick={() => setInquiryOpen(true)} className="rounded-lg border px-4 py-2 text-sm font-bold">Ask about a listing</button></div>
        {orderedItems.some((item) => item.coordinates || item.property.coordinates || item.property.locationPoint) ? <details className="rounded-xl border bg-surface p-4"><summary className="cursor-pointer font-bold">View compared listings on a map</summary><div className="mt-3 h-[420px]"><PropertyMap properties={orderedItems.map((item) => item.property)} detailsPath={(property) => `/properties/${propertyRouteReference(property)}`} className="h-full" /></div></details> : null}
      </> : null}

      {viewIds.length ? <>
        <SuggestionPanel category={currentCategory} anchorIds={viewIds} existingCategory={compare.category} disabled={compare.busy || isShared} onConfirm={compare.replaceSelection} returnPath={compare.returnPath} />
        <RecentSalesPanel key={`${isShared ? 'shared' : `${user?._id ?? 'guest'}:${activeProfile?.id ?? 'no-profile'}`}:${viewIds.join(',')}`} items={orderedItems} fallbackIds={viewIds} userEmailVerified={Boolean(user?.emailVerified)} />
      </> : null}

      {!isShared && compare.isBuyer ? <CompareAlertsPanel key={`${user?._id ?? ''}:${activeProfile?.id ?? ''}`} set={compare.set} /> : null}
      {isShared && !isAuthenticated ? <p className="rounded-xl bg-surface-container-low p-4 text-sm text-secondary">Anyone with this public link can view these public property details. Your private saved set, notes and contact information are not in the link.</p> : null}
    </main>

    {inquiryOpen ? <ModalPortal><div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/65 p-4" role="presentation" onClick={() => setInquiryOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="compare-inquiry-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-surface p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="compare-inquiry-title" className="text-xl font-black">Ask about one listing</h2><p className="text-sm text-secondary">The seller will receive only your explicit choice to share comparison context, not your other listings or saved set.</p></div><button type="button" aria-label="Close inquiry" onClick={() => setInquiryOpen(false)} className="rounded-full border px-3 py-1">×</button></div>{orderedItems.length ? <CompareInquiry items={orderedItems} onClose={() => setInquiryOpen(false)} /> : null}</section></div></ModalPortal> : null}
  </PublicLayout>;
};

const FxNotice = ({ fx }: { fx: CompareFx }) => {
  const source = fx.selectedRateSource;
  const rate = source === 'buyer_override' ? fx.buyerRateNgnPerUsd : fx.rateNgnPerUsd;
  const rateDate = source === 'official_nfem' ? fx.effectiveAt ?? fx.recordedAt : undefined;
  if (fx.convertedPricesAvailable) return <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">Converted amounts are presentation only. Seller prices and currencies remain shown. {source === 'buyer_override' ? `Your rate${rate ? `: ${rate.toLocaleString()} NGN per USD` : ''}.` : source === 'official_nfem' ? 'Official NFEM rate supplied by the server.' : 'Rate supplied by the server.'}{rateDate ? ` Rate date: ${new Date(rateDate).toLocaleDateString('en-GB')}.` : ''}</p>;
  return <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Currency conversion is unavailable. Original listing prices remain visible; cross-currency price markers and ranking are disabled. {fx.message ?? ''}</p>;
};

const SuggestionPanel = ({ category, anchorIds, existingCategory, disabled, onConfirm, returnPath }: { category: CompareCategory | null; anchorIds: string[]; existingCategory: CompareCategory | null; disabled: boolean; onConfirm: (ids: string[], category: CompareCategory, origin: 'top_matches' | 'similar', criterion?: string, replaceCategory?: boolean) => Promise<void>; returnPath: string }) => {
  const [mode, setMode] = useState<'top_matches' | 'similar'>('top_matches');
  const [selectedCategory, setSelectedCategory] = useState<CompareCategory>(category ?? 'residential');
  const [criterion, setCriterion] = useState<CompareCriterion>('lowest_price_per_sqm');
  const [count, setCount] = useState(3);
  const [sizeTolerance, setSizeTolerance] = useState(20);
  const [priceTolerance, setPriceTolerance] = useState(15);
  const [result, setResult] = useState<CompareSuggestionResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [replaceCategory, setReplaceCategory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (category) setSelectedCategory(category); }, [category]);
  const run = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setResult(null); setSelectedIds([]);
    try {
      let response: CompareSuggestionResponse;
      if (mode === 'top_matches') {
        const url = new URL(returnPath, window.location.origin);
        const filters: Record<string, string> = {};
        url.searchParams.forEach((value, key) => { if (key !== 'featured' && !['page', 'limit', 'sort', 'queryVersion', 'category', 'availability', 'status'].includes(key)) filters[key] = value; });
        response = await compareService.suggestions({ mode, category: selectedCategory, criterion, count, filters: { queryVersion: 'canonical-v1', ...filters } });
      } else {
        const anchorPropertyId = anchorIds[0];
        if (!anchorPropertyId) throw new Error('Add a listing before requesting similar candidates.');
        response = await compareService.suggestions({ mode, anchorPropertyId, count: Math.max(1, count - 1), sizeTolerancePercent: sizeTolerance, priceTolerancePercent: priceTolerance });
      }
      setResult(response);
      const candidateCount = mode === 'similar' ? Math.max(1, count - 1) : count;
      setSelectedIds(response.candidates.slice(0, candidateCount).map((candidate) => candidate.id));
      if (response.state === 'unavailable') setError(response.reasonCode ? `Similar listings are unavailable (${response.reasonCode}).` : 'Similar listings are unavailable for this property.');
    } catch (raw) { setError(apiErrorMessage(raw, 'Candidate suggestions could not be loaded. Your current Compare set has not changed.')); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    if (!result || !selectedIds.length || !result.category) return;
    setBusy(true); setError('');
    try {
      const confirmedIds = result.mode === 'similar' ? [...new Set([anchorIds[0], ...selectedIds].filter(Boolean))] : selectedIds;
      await onConfirm(confirmedIds, result.category, result.mode, result.criterion, replaceCategory);
      setResult(null); toast.success('Confirmed listings are now in Compare.');
    }
    catch (raw) { setError(raw instanceof Error ? raw.message : 'Unable to apply these candidates.'); }
    finally { setBusy(false); }
  };
  return <section id="compare-suggestions" className="space-y-4 rounded-2xl border bg-surface p-5">
    <header><h2 className="text-xl font-black">Find listings to compare</h2><p className="mt-1 text-sm text-secondary">Suggestions are previews only. Nothing is added until you select listings and confirm.</p></header>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Suggestion type"><button type="button" role="tab" aria-selected={mode === 'top_matches'} onClick={() => { setMode('top_matches'); setResult(null); }} className={`rounded-lg border px-3 py-2 text-sm font-bold ${mode === 'top_matches' ? 'border-primary text-primary' : ''}`}>Top matches</button><button type="button" role="tab" aria-selected={mode === 'similar'} onClick={() => { setMode('similar'); setResult(null); }} className={`rounded-lg border px-3 py-2 text-sm font-bold ${mode === 'similar' ? 'border-primary text-primary' : ''}`}>Similar listings</button></div>
    <form onSubmit={(event) => void run(event)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {mode === 'top_matches' ? <><label className="text-sm font-semibold">Category<select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value as CompareCategory)} className="mt-1 w-full rounded border bg-surface p-2"><option value="residential">Residential</option><option value="commercial">Commercial</option></select></label><label className="text-sm font-semibold">Sort suggestions<select value={criterion} onChange={(event) => setCriterion(event.target.value as CompareCriterion)} className="mt-1 w-full rounded border bg-surface p-2">{criterionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></> : <><label className="text-sm font-semibold">Size tolerance (%)<input type="number" min="0" max="100" value={sizeTolerance} onChange={(event) => setSizeTolerance(Number(event.target.value))} className="mt-1 w-full rounded border bg-surface p-2" /></label><label className="text-sm font-semibold">Asking-price tolerance (%)<input type="number" min="0" max="100" value={priceTolerance} onChange={(event) => setPriceTolerance(Number(event.target.value))} className="mt-1 w-full rounded border bg-surface p-2" /></label></>}
      <label className="text-sm font-semibold">{mode === 'similar' ? 'Total listings to compare' : 'Number to compare'}<select value={count} onChange={(event) => setCount(Number(event.target.value))} className="mt-1 w-full rounded border bg-surface p-2">{[2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><button type="submit" disabled={busy || disabled} className="self-end rounded-lg bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50">{busy ? 'Finding…' : 'Preview candidates'}</button>
    </form>
    {mode === 'top_matches' ? <p className="text-xs text-secondary">Search filters are taken from your last canonical property-results URL when available. Area and currency rules are applied by the server.</p> : <p className="text-xs text-secondary">The first listing stays as the reference; the remaining slots are for similar candidates. Defaults are ±20% size and ±15% asking price.</p>}
    {error ? <p role="alert" className="rounded bg-amber-50 p-3 text-sm text-amber-950">{error}</p> : null}
    {result ? <div className="space-y-3 border-t pt-4"><div><h3 className="font-black">Preview · Top {Math.min(mode === 'similar' ? Math.max(1, count - 1) : count, result.candidates.length)} of {result.totalMatchingCount.toLocaleString()}</h3><p className="text-sm text-secondary">{result.mode === 'top_matches' ? criterionOptions.find((option) => option.value === result.criterion)?.label : 'Similar to the selected anchor'} · {result.hasPreviewCandidate ? 'One extra candidate is available to swap in.' : 'No extra swap candidate returned.'}</p></div>{result.anchor?.pinnedAsReference ? <p className="rounded bg-blue-50 p-3 text-sm">Reference listing: {result.anchor.title ?? 'selected anchor'}; it remains in the confirmed comparison and is excluded from candidate additions.</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">{result.candidates.map((candidate, index) => { const limit = mode === 'similar' ? Math.max(1, count - 1) : count; return <label key={candidate.id} className="flex items-start gap-3 rounded-xl border p-3"><input type="checkbox" checked={selectedIds.includes(candidate.id)} disabled={!selectedIds.includes(candidate.id) && selectedIds.length >= limit} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id))} /><span className="min-w-0"><strong className="block truncate">{candidate.title}</strong><span className="text-xs text-secondary">{candidate.publicReference || candidate.propertyType || 'Public listing'}{candidate.missingCriterionValue ? ` · ${candidate.missingCriterionValue}` : ''}{index >= (mode === 'similar' ? Math.max(1, count - 1) : count) ? ' · swap candidate' : ''}</span></span></label>; })}</div>
      {existingCategory && result.category !== existingCategory ? <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={replaceCategory} onChange={(event) => setReplaceCategory(event.target.checked)} /><span>Replace the current {existingCategory} comparison with these {result.category} listings. You will confirm the selected items below.</span></label> : null}
      <button type="button" disabled={busy || selectedIds.length < (mode === 'similar' ? 1 : 2) || selectedIds.length + (mode === 'similar' ? 1 : 0) > 4 || Boolean(existingCategory && result.category !== existingCategory && !replaceCategory)} onClick={() => void confirm()} className="rounded-lg bg-primary px-4 py-2 font-bold text-on-primary disabled:opacity-50">{busy ? 'Applying…' : `Confirm ${selectedIds.length + (mode === 'similar' ? 1 : 0)} listings`}</button>
    </div> : null}
  </section>;
};

const RecentSalesPanel = ({ items, fallbackIds, userEmailVerified }: { items: CompareItem[]; fallbackIds: string[]; userEmailVerified: boolean }) => {
  const [anchorId, setAnchorId] = useState(items[0]?.id ?? fallbackIds[0] ?? '');
  const [windowValue, setWindowValue] = useState<'6m' | '1y' | '2y' | '3y'>('1y');
  const [result, setResult] = useState<RecentSalesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (after?: string | null) => {
    if (!anchorId) return;
    setLoading(true); setError('');
    try {
      const next = await compareService.recentSales({ anchorPropertyId: anchorId, window: windowValue, limit: 20, ...(after ? { after } : {}) });
      setResult((current) => after && current ? { ...next, comparables: [...current.comparables, ...next.comparables] } : next);
    } catch (raw) {
      if (raw instanceof ApiRequestError && raw.code === 'AUTH_REGISTERED_REQUIRED') setError('Verify your email address and sign in to view sold comparable details. The count remains available to guests.');
      else setError(apiErrorMessage(raw, 'Recent sold comparables are unavailable.'));
    } finally { setLoading(false); }
  }, [anchorId, windowValue]);
  useEffect(() => { if (anchorId) void load(); }, [anchorId, windowValue, load]);
  return <section className="space-y-4 rounded-2xl border bg-surface p-5"><header><h2 className="text-xl font-black">Recent sold comparables</h2><p className="mt-1 text-sm text-secondary">Sold details appear only when the server’s approved area threshold is met. Amounts shown are last asking prices before sale, never sale prices.</p></header><div className="flex flex-wrap items-end gap-3"><label className="text-sm font-semibold">Compare near<select value={anchorId} onChange={(event) => { setAnchorId(event.target.value); setResult(null); }} className="mt-1 block min-w-56 rounded border bg-surface p-2">{fallbackIds.map((id) => <option value={id} key={id}>{items.find((item) => item.id === id)?.title ?? 'Selected listing'}</option>)}</select></label><label className="text-sm font-semibold">Time period<select value={windowValue} onChange={(event) => setWindowValue(event.target.value as typeof windowValue)} className="mt-1 block rounded border bg-surface p-2"><option value="6m">Last 6 months</option><option value="1y">Last year</option><option value="2y">Last 2 years</option><option value="3y">Last 3 years</option></select></label><button type="button" disabled={loading} onClick={() => void load()} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-50">Refresh</button></div>
    {loading && !result ? <p role="status" className="text-sm text-secondary">Checking sold comparable availability…</p> : null}{error ? <p role="alert" className="rounded bg-amber-50 p-3 text-sm text-amber-950">{error}</p> : null}{result ? <div role="status" className="space-y-3"><p className="text-sm"><strong>{result.count.toLocaleString()}</strong> records in this area · {result.window}</p>{result.state === 'unconfigured' ? <p className="rounded bg-slate-100 p-3 text-sm">Sold comparable details are not configured yet.</p> : null}{result.state === 'unavailable' ? <p className="rounded bg-slate-100 p-3 text-sm">This listing does not have enough matching location or property-type information for sold comparables.</p> : null}{result.state === 'below_threshold' ? <p className="rounded bg-slate-100 p-3 text-sm">There are not enough records to show details.</p> : null}{result.state === 'available' && !result.comparables.length ? <p className="rounded bg-blue-50 p-3 text-sm">The server requires an email-verified account for sold details.</p> : null}{result.comparables.length ? <div className="grid gap-3 sm:grid-cols-2">{result.comparables.map((item) => <article key={`${item.propertyId}:${item.soldAt}`} className="rounded-xl border border-gray-300 bg-gray-100 p-4 text-gray-700"><p className="text-xs font-bold uppercase">Sold · {item.soldAtMonth}</p><h3 className="mt-1 font-black">{item.title}</h3><p className="mt-2 text-sm">Last asking price before sale: <strong>{currencyAmount(item.askingPriceBeforeSale.amount, item.askingPriceBeforeSale.currency)}</strong></p><Link to={`/properties/${item.publicReference || item.propertyId}`} className="mt-2 inline-block text-sm font-bold underline">View comparable details</Link></article>)}</div> : null}{result.nextCursor ? <button type="button" disabled={loading} onClick={() => void load(result.nextCursor)} className="rounded-lg border px-4 py-2 text-sm font-bold">Load more sold comparables</button> : null}{userEmailVerified ? null : <p className="text-xs text-secondary">An email-verified signed-in account is required for detail; the count-only state is still shown.</p>}</div> : null}</section>;
};

const CompareAlertsPanel = ({ set }: { set: ReturnType<typeof useCompare>['set'] }) => {
  const { activeProfile } = useAuth();
  const compare = useCompare();
  const [subscription, setSubscription] = useState<ComparisonAlertSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [triggers, setTriggers] = useState({ askingPriceChanged: true, availabilityChanged: true });
  useEffect(() => {
    if (activeProfile?.kind !== 'buyer') { setSubscription(null); return; }
    let active = true; setLoading(true); setError(''); setSubscription(null);
    void compareService.getAlerts().then(({ subscription: value }) => { if (active) { setSubscription(value); setTriggers(value.triggers); } })
      .catch((raw) => { if (active) setError(apiErrorMessage(raw, 'Compare alerts are unavailable for this Buyer profile.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeProfile?.id, activeProfile?.kind, set?.version]);
  const save = async (enabled: boolean) => {
    if (!subscription) return;
    setBusy(true); setError('');
    try { const result = await compareService.updateAlerts({ expectedVersion: subscription.version, enabled, ...(enabled ? { triggers } : {}) }); setSubscription(result.subscription); toast.success(enabled ? 'Compare alerts updated.' : 'Compare alerts disabled.'); }
    catch (raw) {
      if (raw instanceof ApiRequestError && raw.code === 'CONFLICT_COMPARE_ALERT_VERSION') {
        try { const latest = await compareService.getAlerts(); setSubscription(latest.subscription); setTriggers(latest.subscription.triggers); } catch { /* the original conflict message remains visible */ }
        setError('Compare alerts changed elsewhere. The latest settings have been loaded; review and save again.');
      } else if (raw instanceof ApiRequestError && raw.code === 'CONFLICT_COMPARE_VERSION') {
        await compare.refresh().catch(() => undefined);
        setError('Your Compare set changed. The latest set has been refreshed; review it before enabling these alerts.');
      } else if (raw instanceof ApiRequestError && raw.code === 'CONTENT_COMPARE_ALERT_PROPERTY_UNAVAILABLE') {
        await compare.refresh().catch(() => undefined);
        setError('One or more listings are no longer eligible for alerts. The current Compare set has been refreshed; remove or replace unavailable listings and try again.');
      } else if (raw instanceof ApiRequestError && raw.code === 'CONTENT_COMPARE_ALERT_SET_REQUIRED') {
        await compare.refresh().catch(() => undefined);
        setError('Add a listing to Compare before enabling alerts.');
      } else setError(apiErrorMessage(raw, 'Unable to update Compare alerts.'));
    } finally { setBusy(false); }
  };
  return <section className="space-y-3 rounded-2xl border bg-surface p-5"><div><h2 className="text-xl font-black">Compare alerts</h2><p className="mt-1 text-sm text-secondary">Receive a general notification when a saved listing’s asking price or availability changes. Alerts do not include the changed price and are delivered asynchronously.</p></div>{loading ? <p role="status" className="text-sm text-secondary">Loading Compare alerts…</p> : null}{error ? <p role="alert" className="rounded bg-amber-50 p-3 text-sm text-amber-950">{error}</p> : null}{subscription ? <><p className="text-xs text-secondary">{subscription.propertyIds.length} listings in the current alert set · version {subscription.version}{subscription.nextEvaluationAt ? ` · next worker check ${new Date(subscription.nextEvaluationAt).toLocaleString('en-GB')}` : ''}</p><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={triggers.askingPriceChanged} onChange={(event) => setTriggers((current) => ({ ...current, askingPriceChanged: event.target.checked }))} />Asking price changes</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={triggers.availabilityChanged} onChange={(event) => setTriggers((current) => ({ ...current, availabilityChanged: event.target.checked }))} />Availability changes</label><div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !set?.propertyIds.length || !triggers.askingPriceChanged && !triggers.availabilityChanged} onClick={() => void save(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50">{busy ? 'Saving…' : subscription.enabled ? 'Update alerts' : 'Enable alerts'}</button>{subscription.enabled ? <button type="button" disabled={busy} onClick={() => void save(false)} className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-50">Disable alerts</button> : null}<Link to="/dashboard/personalisation" className="self-center text-sm font-bold text-primary underline">Notification preferences</Link></div>{!set?.propertyIds.length ? <p className="text-xs text-secondary">Add at least one listing to Compare before enabling alerts.</p> : null}</> : null}</section>;
};

const CompareInquiry = ({ items, onClose }: { items: CompareItem[]; onClose: () => void }) => {
  const [propertyId, setPropertyId] = useState(items[0]?.id ?? '');
  return <div className="space-y-3"><label className="block text-sm font-bold">Listing<select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="mt-1 w-full rounded border bg-surface p-2">{items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><InquiryForm propertyId={propertyId} allowComparisonContextOptIn allowLeadUpdatesOptIn={false} onSubmitInquiry={async (payload) => { await inquiryService.createInquiry(payload); toast.success('Your enquiry has been sent.'); onClose(); }} /></div>;
};

export default ComparePage;
