import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import StepUpDialog from '../auth/StepUpDialog';
import Button from '../ui/Button';
import { promotionCampaignService, type PromotionCampaign, type PromotionEntry, type PromotionFundingResult } from '../../services/promotionCampaignService';
import { propertyService } from '../../services/propertyService';
import type { Property } from '../../types';
import type { EligibleCampaignPlacements } from '../../services/promotionCampaignService';
import { formatMoneyMinor } from '../../utils/moneyMinor';

type CampaignMutation = { kind: 'funding' | 'create'; result: PromotionFundingResult } | { kind: 'end'; result: Awaited<ReturnType<typeof promotionCampaignService.end>> };
const providerLink = (value: string | null | undefined) => value && /^https:\/\//i.test(value) ? value : null;
const toMinor = (value: string): number | null => {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
};
const propertyId = (property: Property): string | null => {
  const id = property._id || property.id;
  return id && /^[0-9a-f]{24}$/i.test(id) ? id : null;
};

const ProfileCampaigns = () => {
  const { activeProfile } = useAuth();
  const profileId = activeProfile?.id;
  const operationStorageKey = profileId ? `realtiq.campaignOperation:${profileId}` : '';
  const canManage = Array.isArray(activeProfile?.permissions) && activeProfile.permissions.includes('listing.boost');
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState<PromotionCampaign | null>(null);
  const [entries, setEntries] = useState<PromotionEntry[]>([]);
  const [entryCursor, setEntryCursor] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [disposition, setDisposition] = useState<'refund' | 'transfer'>('refund');
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const [ownedProperties, setOwnedProperties] = useState<Property[]>([]);
  const [propertiesPage, setPropertiesPage] = useState(0);
  const [propertiesTotal, setPropertiesTotal] = useState(0);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesError, setPropertiesError] = useState('');
  const [createPropertyId, setCreatePropertyId] = useState('');
  const [lookup, setLookup] = useState<EligibleCampaignPlacements | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupRetry, setLookupRetry] = useState(0);
  const [placementId, setPlacementId] = useState('');
  const [billingEvent, setBillingEvent] = useState<'click' | 'enquiry' | ''>('');
  const [currency, setCurrency] = useState<'NGN' | 'USD' | ''>('');
  const [bid, setBid] = useState('');
  const [initialBudget, setInitialBudget] = useState('');
  const requestVersion = useRef(0);
  const propertyRequestVersion = useRef(0);
  const lookupVersion = useRef(0);
  const operation = useRef<{ fingerprint: string; key: string } | null>(null);
  const mutationSubmitted = useRef(false);
  const stepUp = useBoundStepUp<CampaignMutation>();

  const resolveOperation = (fingerprint: string): string | null => {
    const stored = operationStorageKey ? sessionStorage.getItem(operationStorageKey) : null;
    let prior: { fingerprint: string; key: string; reference?: string } | null = null;
    if (stored) {
      try { const parsed = JSON.parse(stored) as { fingerprint?: unknown; key?: unknown; reference?: unknown }; if (typeof parsed.fingerprint === 'string' && typeof parsed.key === 'string') prior = { fingerprint: parsed.fingerprint, key: parsed.key, ...(typeof parsed.reference === 'string' ? { reference: parsed.reference } : {}) }; }
      catch { setError('A previous campaign operation could not be read. Review campaign status before another funding request.'); return null; }
      if (!prior) { setError('A previous campaign operation is incomplete. Review campaign status before another funding request.'); return null; }
    }
    if (prior && prior.fingerprint !== fingerprint) { setError('A previous campaign operation is unresolved. Review its funding or refund status before changing the action.'); return null; }
    if (operation.current?.fingerprint !== fingerprint) operation.current = prior ?? { fingerprint, key: `campaign_${crypto.randomUUID()}` };
    return operation.current.key;
  };

  const refresh = useCallback(async () => {
    if (!profileId) return;
    const version = ++requestVersion.current;
    setLoading(true); setBusy(false); setError('');
    try {
      const result = await promotionCampaignService.list({ limit: 25 });
      if (version !== requestVersion.current || localStorage.getItem('activeProfileId') !== profileId) return;
      setCampaigns(result.campaigns); setCursor(result.nextCursor);
      if (selectedId) {
        const [detail, ledger] = await Promise.all([promotionCampaignService.get(selectedId), promotionCampaignService.ledger(selectedId, { limit: 25 })]);
        if (version !== requestVersion.current || localStorage.getItem('activeProfileId') !== profileId) return;
        setSelected(detail.campaign); setEntries(ledger.entries); setEntryCursor(ledger.nextCursor);
        const saved = operationStorageKey ? sessionStorage.getItem(operationStorageKey) : null;
        if (saved) {
          try { const prior = JSON.parse(saved) as { reference?: string }; if (prior.reference && ledger.entries.some((entry) => entry.payment?.reference === prior.reference && ['paid', 'failed', 'cancelled'].includes(entry.payment.state))) { sessionStorage.removeItem(operationStorageKey); operation.current = null; setOutcomeUnknown(false); } }
          catch { /* Keep the existing operation locked until the user can inspect it. */ }
        }
      }
    } catch (raw) { if (version === requestVersion.current) setError(raw instanceof Error ? raw.message : 'Unable to load campaigns.'); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [operationStorageKey, profileId, selectedId]);

  useEffect(() => {
    const version = requestVersion.current;
    queueMicrotask(() => { if (requestVersion.current === version) void refresh(); });
    return () => { requestVersion.current += 1; propertyRequestVersion.current += 1; lookupVersion.current += 1; stepUp.cancel(); };
    // This component is keyed to the active profile by its parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const loadProperties = async (page: number) => {
    if (!profileId || propertiesLoading) return;
    const version = ++propertyRequestVersion.current;
    setPropertiesLoading(true); setPropertiesError('');
    try {
      const result = await propertyService.getMyProperties(page, 100);
      if (version !== propertyRequestVersion.current || localStorage.getItem('activeProfileId') !== profileId) return;
      setOwnedProperties((current) => page === 1 ? result.properties : [...current, ...result.properties.filter((item) => !current.some((old) => propertyId(old) === propertyId(item)))]);
      setPropertiesPage(page); setPropertiesTotal(result.total);
    } catch (raw) { if (version === propertyRequestVersion.current) setPropertiesError(raw instanceof Error ? raw.message : 'Your listings could not be loaded.'); }
    finally { if (version === propertyRequestVersion.current) setPropertiesLoading(false); }
  };

  useEffect(() => {
    if (profileId) void loadProperties(1);
    // A profile change remounts this component; only the new profile's listings are read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  useEffect(() => {
    const version = ++lookupVersion.current;
    setLookup(null); setLookupLoading(false); setLookupError(''); setPlacementId(''); setBillingEvent(''); setCurrency(''); setBid(''); setInitialBudget('');
    if (!createPropertyId || !profileId) return;
    setLookupLoading(true);
    void promotionCampaignService.eligiblePlacements(createPropertyId)
      .then((result) => { if (version === lookupVersion.current && localStorage.getItem('activeProfileId') === profileId) setLookup(result); })
      .catch((raw) => { if (version === lookupVersion.current) setLookupError(raw instanceof Error ? raw.message : 'Eligible placements could not be loaded.'); })
      .finally(() => { if (version === lookupVersion.current) setLookupLoading(false); });
    return () => { lookupVersion.current += 1; };
  }, [createPropertyId, profileId, lookupRetry]);

  const open = async (id: string) => {
    if (!profileId) return;
    const version = ++requestVersion.current;
    setSelectedId(id); setSelected(null); setEntries([]); setEntryCursor(null); setBusy(false); setError('');
    try { const [detail, ledger] = await Promise.all([promotionCampaignService.get(id), promotionCampaignService.ledger(id, { limit: 25 })]); if (version === requestVersion.current && localStorage.getItem('activeProfileId') === profileId) { setSelected(detail.campaign); setEntries(ledger.entries); setEntryCursor(ledger.nextCursor); } }
    catch (raw) { if (version === requestVersion.current) setError(raw instanceof Error ? raw.message : 'Unable to load campaign detail.'); }
  };

  const loadMore = async (kind: 'campaigns' | 'entries') => {
    if (!profileId || busy) return;
    const version = requestVersion.current;
    setBusy(true); setError('');
    try {
      if (kind === 'campaigns' && cursor) { const page = await promotionCampaignService.list({ limit: 25, after: cursor }); if (version === requestVersion.current && localStorage.getItem('activeProfileId') === profileId) { setCampaigns((current) => [...current, ...page.campaigns.filter((item) => !current.some((old) => old.id === item.id))]); setCursor(page.nextCursor); } }
      if (kind === 'entries' && entryCursor && selectedId) { const page = await promotionCampaignService.ledger(selectedId, { before: entryCursor, limit: 25 }); if (version === requestVersion.current && localStorage.getItem('activeProfileId') === profileId) { setEntries((current) => [...current, ...page.entries.filter((item) => !current.some((old) => old.id === item.id))]); setEntryCursor(page.nextCursor); } }
    } catch (raw) { if (version === requestVersion.current) setError(raw instanceof Error ? raw.message : 'Unable to load more campaign records.'); }
    finally { if (version === requestVersion.current) setBusy(false); }
  };

  const beginCreate = async () => {
    if (!canManage || !profileId || outcomeUnknown || stepUp.busy || stepUp.challenge || lookup?.state !== 'ready' || lookup.providerAvailability.state !== 'available') return;
    const rule = lookup.currencyRules.find((item) => item.currency === currency && item.state === 'available');
    const bidMinor = toMinor(bid);
    const initialBudgetMinor = toMinor(initialBudget);
    if (!createPropertyId || !lookup.placements.some((item) => item.placementId === placementId) || !lookup.billingEvents?.includes(billingEvent as 'click' | 'enquiry') || !rule || !bidMinor || bidMinor < rule.minimumBidMinor || !initialBudgetMinor || initialBudgetMinor < (lookup.initialBudgetMinor?.minimum ?? 1) || initialBudgetMinor > (lookup.initialBudgetMinor?.maximum ?? Number.MAX_SAFE_INTEGER)) {
      setError('Choose a current eligible placement, billing event and currency, then enter a bid and budget within the returned limits.'); return;
    }
    if (!window.confirm(`Create a Sponsored campaign for ${lookup.property?.title ?? 'this listing'} with an initial budget of ${formatMoneyMinor(initialBudgetMinor, currency)}? Funding is not confirmed until the provider and server confirm it.`)) return;
    const fingerprint = JSON.stringify({ action: 'create', profileId, propertyId: createPropertyId, placementId, billingEvent, currency, bidMinor, initialBudgetMinor });
    const operationKey = resolveOperation(fingerprint);
    if (!operationKey) return;
    const body = { propertyId: createPropertyId, placementId, billingEvent: billingEvent as 'click' | 'enquiry', currency: currency as 'NGN' | 'USD', bidMinor, initialBudgetMinor, operationKey };
    mutationSubmitted.current = false;
    await stepUp.begin({ method: 'POST', path: '/api/profiles/current/promotion-campaigns', body, label: 'Create Sponsored campaign', execute: async (challengeId, exactBody) => {
      mutationSubmitted.current = true;
      if (operationStorageKey) sessionStorage.setItem(operationStorageKey, JSON.stringify({ fingerprint, key: exactBody.operationKey }));
      return { kind: 'create', result: await promotionCampaignService.create(exactBody, challengeId) };
    } });
  };

  const beginTopUp = async () => {
    if (!selected || !canManage || outcomeUnknown || stepUp.busy || stepUp.challenge) return;
    const amount = Number(topUpAmount);
    if (!/^[1-9]\d*$/.test(topUpAmount) || !Number.isSafeInteger(amount * 100)) { setError('Enter a positive whole amount in the campaign currency.'); return; }
    const fingerprint = `top-up:${selected.id}:${amount}`;
    const operationKey = resolveOperation(fingerprint);
    if (!operationKey) return;
    const body = { budgetMinor: amount * 100, operationKey };
    mutationSubmitted.current = false;
    await stepUp.begin({ method: 'POST', path: `/api/profiles/current/promotion-campaigns/${encodeURIComponent(selected.id)}/top-ups`, body, label: 'Add campaign budget', execute: async (challengeId, exactBody) => { mutationSubmitted.current = true; if (operationStorageKey) sessionStorage.setItem(operationStorageKey, JSON.stringify({ fingerprint, key: exactBody.operationKey })); return { kind: 'funding', result: await promotionCampaignService.topUp(selected.id, exactBody, challengeId) }; } });
  };

  const beginEnd = async () => {
    if (!selected || !canManage || outcomeUnknown || stepUp.busy || stepUp.challenge) return;
    if (disposition === 'transfer' && !campaigns.some((item) => item.id === targetId && item.id !== selected.id && item.currency === selected.currency && item.profileId === selected.profileId)) { setError('Choose another current campaign in this profile and currency.'); return; }
    if (!window.confirm(disposition === 'refund' ? 'Request the server-calculated refund of this campaign’s unspent budget?' : 'Transfer the unspent budget to the selected campaign?')) return;
    const fingerprint = `end:${selected.id}:${selected.version}:${disposition}:${targetId}`;
    const operationKey = resolveOperation(fingerprint);
    if (!operationKey) return;
    const body = { disposition, ...(disposition === 'transfer' ? { targetCampaignId: targetId } : {}), expectedVersion: selected.version, operationKey };
    mutationSubmitted.current = false;
    await stepUp.begin({ method: 'POST', path: `/api/profiles/current/promotion-campaigns/${encodeURIComponent(selected.id)}/end`, body, label: disposition === 'refund' ? 'Request campaign budget refund' : 'Transfer campaign budget', execute: async (challengeId, exactBody) => { mutationSubmitted.current = true; if (operationStorageKey) sessionStorage.setItem(operationStorageKey, JSON.stringify({ fingerprint, key: exactBody.operationKey })); return { kind: 'end', result: await promotionCampaignService.end(selected.id, exactBody, challengeId) }; } });
  };

  const complete = async (code: string) => {
    const result = await stepUp.complete(code);
    if (!result.ok) { setError(result.error ?? 'The campaign action was not confirmed.'); if (mutationSubmitted.current) setOutcomeUnknown(true); return false; }
    setOutcomeUnknown(false);
    setTopUpAmount('');
    if (result.value.kind === 'funding' || result.value.kind === 'create') { const payment = result.value.result.payment; setPaymentUrl(providerLink(payment.redirectUrl)); setNotice(`Campaign ${result.value.result.campaign.state}. Funding ${payment.state}. Reference: ${payment.reference}. A redirect does not confirm funding.`); if (operationStorageKey && operation.current) sessionStorage.setItem(operationStorageKey, JSON.stringify({ ...operation.current, reference: payment.reference })); if (['paid', 'failed', 'cancelled'].includes(payment.state)) { operation.current = null; if (operationStorageKey) sessionStorage.removeItem(operationStorageKey); } }
    else { setNotice(`Campaign state: ${result.value.result.campaign.state}. ${result.value.result.requiresIndependentApproval ? 'A Finance decision is pending.' : 'Refresh to inspect the final refund or transfer state.'}`); operation.current = null; if (operationStorageKey) sessionStorage.removeItem(operationStorageKey); }
    await refresh();
    if (result.value.kind === 'create') await open(result.value.result.campaign.id);
    return true;
  };

  return <section className="rounded-xl border bg-white p-5" aria-label="Promotion campaign budgets">
    <h2 className="text-xl font-bold">Promotion campaign budgets</h2><p className="mt-1 text-sm text-secondary">Balances belong to each campaign. They are not an account wallet or available credit for other purchases.</p>
    <div className="mt-3 flex gap-2"><Button type="button" variant="secondary" disabled={loading} onClick={() => void refresh()}>Refresh campaigns</Button>{loading ? <span role="status">Loading…</span> : null}</div>
    {error ? <p role="alert" className="mt-3 text-sm text-error">{error}</p> : null}{notice ? <p role="status" className="mt-3 text-sm">{notice}</p> : null}{paymentUrl ? <a className="mt-2 inline-block font-bold underline" href={paymentUrl}>Continue at payment provider</a> : null}
    {outcomeUnknown ? <p role="alert" className="mt-3 text-sm">An action's outcome is unresolved. Refresh this campaign before another mutation; do not create a new charge or refund.</p> : null}
    {canManage ? <div className="mt-5 rounded-lg border p-4"><h3 className="font-bold">Create Sponsored campaign</h3><p className="mt-1 text-sm text-secondary">Select one of your listings. Eligible placements and bid limits come from the server.</p>
      <div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-sm font-bold">Your listing<select className="mt-1 block w-full max-w-md rounded-lg border p-2" value={createPropertyId} onChange={(event) => setCreatePropertyId(event.target.value)}><option value="">Choose a listing</option>{ownedProperties.map((property) => { const id = propertyId(property); return id ? <option key={id} value={id}>{property.title} · {property.publicReference ?? id}</option> : null; })}</select></label>{ownedProperties.length < propertiesTotal && propertiesPage < 10000 ? <Button type="button" variant="secondary" disabled={propertiesLoading} onClick={() => void loadProperties(propertiesPage + 1)}>Load more listings</Button> : null}<Button type="button" variant="secondary" disabled={propertiesLoading} onClick={() => void loadProperties(1)}>Refresh listings</Button></div>
      {propertiesLoading ? <p role="status" className="mt-2 text-sm">Loading your listings…</p> : null}{propertiesError ? <p role="alert" className="mt-2 text-sm text-error">{propertiesError}</p> : null}
      {lookupLoading ? <p role="status" className="mt-2 text-sm">Checking eligible placements…</p> : null}{lookupError ? <p role="alert" className="mt-2 text-sm text-error">{lookupError} <Button type="button" variant="secondary" onClick={() => setLookupRetry((current) => current + 1)}>Retry lookup</Button></p> : null}
      {lookup?.state !== 'ready' && lookup ? <p role="status" className="mt-2 text-sm">Campaign creation is {lookup.state.replaceAll('_', ' ')}{lookup.reasonCode ? ` (${lookup.reasonCode})` : ''}. Review the current policy or provider setup.</p> : null}
      {lookup?.state === 'ready' && !lookup.placements.length ? <p role="status" className="mt-2 text-sm">No placement is currently available for this listing.</p> : null}
      {lookup?.state === 'ready' && lookup.placements.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Placement<select className="mt-1 block w-full rounded-lg border p-2" value={placementId} onChange={(event) => setPlacementId(event.target.value)}><option value="">Choose placement</option>{lookup.placements.map((item) => <option key={item.placementId} value={item.placementId}>{item.label}</option>)}</select></label><label className="text-sm font-bold">Billing event<select className="mt-1 block w-full rounded-lg border p-2" value={billingEvent} onChange={(event) => setBillingEvent(event.target.value as 'click' | 'enquiry')}><option value="">Choose event</option>{lookup.billingEvents?.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="text-sm font-bold">Currency<select className="mt-1 block w-full rounded-lg border p-2" value={currency} onChange={(event) => { setCurrency(event.target.value as 'NGN' | 'USD'); setBid(''); setInitialBudget(''); }}><option value="">Choose currency</option>{lookup.currencyRules.map((item) => <option key={item.currency} value={item.currency} disabled={item.state !== 'available'}>{item.currency}{item.state !== 'available' ? ` · ${item.reasonCode ?? 'unavailable'}` : ''}</option>)}</select></label><label className="text-sm font-bold">Bid per event ({currency || 'currency'})<input className="mt-1 block w-full rounded-lg border p-2" type="text" inputMode="decimal" value={bid} onChange={(event) => setBid(event.target.value)} />{currency ? <span className="block font-normal text-secondary">Minimum {formatMoneyMinor(lookup.currencyRules.find((item) => item.currency === currency)?.minimumBidMinor, currency)}</span> : null}</label><label className="text-sm font-bold">Initial budget ({currency || 'currency'})<input className="mt-1 block w-full rounded-lg border p-2" type="text" inputMode="decimal" value={initialBudget} onChange={(event) => setInitialBudget(event.target.value)} /></label><div className="flex items-end"><Button type="button" disabled={outcomeUnknown || lookup.providerAvailability.state !== 'available' || !placementId || !billingEvent || !currency || !bid || !initialBudget || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginCreate()}>Create with authenticator</Button></div>{lookup.providerAvailability.state !== 'available' ? <p className="text-sm sm:col-span-2">Funding provider unavailable: {lookup.providerAvailability.reasonCode ?? 'configuration required'}.</p> : null}</div> : null}
    </div> : null}
    {campaigns.length ? <ul className="mt-4 space-y-2">{campaigns.map((item) => <li key={item.id} className="rounded-lg bg-surface-container-low p-3 text-sm"><button type="button" className="font-bold underline" onClick={() => void open(item.id)}>Campaign for property {item.propertyId}</button> · {item.state.replaceAll('_', ' ')} · balance {formatMoneyMinor(item.balanceMinor, item.currency)}{item.pauseCode ? ` · ${item.pauseCode}` : ''}</li>)}</ul> : !loading ? <p className="mt-3 text-sm text-secondary">No campaigns returned for this profile.</p> : null}
    {cursor ? <Button type="button" variant="secondary" className="mt-3" disabled={busy} onClick={() => void loadMore('campaigns')}>Load more campaigns</Button> : null}
    {selected ? <div className="mt-5 rounded-lg border p-4"><h3 className="font-bold">Campaign detail</h3><p className="mt-1 text-sm">{selected.state.replaceAll('_', ' ')} · bid {formatMoneyMinor(selected.bidMinor, selected.currency)} per {selected.billingEvent} · funded {formatMoneyMinor(selected.totalFundedMinor, selected.currency)} · spent {formatMoneyMinor(selected.totalSpentMinor, selected.currency)} · unspent {formatMoneyMinor(selected.balanceMinor, selected.currency)}</p>
      {entries.length ? <ul className="mt-3 space-y-1 text-sm">{entries.map((entry) => <li key={entry.id}>{entry.kind} · {entry.state} · {formatMoneyMinor(entry.amountMinor, entry.currency)} · document {entry.documentsState ?? 'not returned'} · recognition {entry.recognitionState ?? 'not returned'}{entry.payment ? ` · payment ${entry.payment.reference}: ${entry.payment.state}` : ''}</li>)}</ul> : <p className="mt-3 text-sm text-secondary">No ledger entries returned.</p>}{entryCursor ? <Button type="button" variant="secondary" className="mt-2" disabled={busy} onClick={() => void loadMore('entries')}>Load more entries</Button> : null}
      {canManage && ['active', 'paused'].includes(selected.state) ? <div className="mt-4 space-y-3"><div className="flex flex-wrap items-end gap-2"><label className="text-sm font-bold">Top-up amount ({selected.currency}, whole units)<input className="mt-1 block rounded-lg border p-2" type="number" min="1" step="1" value={topUpAmount} onChange={(event) => setTopUpAmount(event.target.value)} /></label><Button type="button" disabled={outcomeUnknown || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginTopUp()}>Top up with authenticator</Button></div><div className="flex flex-wrap items-end gap-2"><label className="text-sm font-bold">End campaign<select className="mt-1 block rounded-lg border p-2" value={disposition} onChange={(event) => setDisposition(event.target.value as 'refund' | 'transfer')}><option value="refund">Request refund of unspent budget</option><option value="transfer">Transfer to another campaign</option></select></label>{disposition === 'transfer' ? <label className="text-sm font-bold">Target campaign<select className="mt-1 block rounded-lg border p-2" value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">Choose campaign</option>{campaigns.filter((item) => item.id !== selected.id && item.profileId === selected.profileId && item.currency === selected.currency).map((item) => <option key={item.id} value={item.id}>{item.propertyId} · {item.state}</option>)}</select></label> : null}<Button type="button" variant="secondary" disabled={outcomeUnknown || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginEnd()}>Continue with authenticator</Button></div></div> : null}
    </div> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
  </section>;
};

export default ProfileCampaigns;
