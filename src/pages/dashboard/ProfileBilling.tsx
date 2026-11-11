import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import BuyerPortalLayout from '../../components/layout/BuyerPortalLayout';
import SellerPortalLayout from '../../components/layout/LandlordPortalLayout';
import Button from '../../components/ui/Button';
import StepUpDialog from '../../components/auth/StepUpDialog';
import ProfilePayoutSetup from '../../components/billing/ProfilePayoutSetup';
import ProfileCampaigns from '../../components/billing/ProfileCampaigns';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../lib/axios';
import { revenueFoundationService, type PaymentAuthorization, type PublicationCatalogue, type PublicationChangeQuote, type PublicationEntitlement, type PublicationPurchase, type RenewalPreference, type RevenueDocument } from '../../services/revenueFoundationService';
import { renewalMethodAvailable } from '../../services/renewalAvailability';
import { formatMoneyMinor } from '../../utils/moneyMinor';

type BillingResult = { kind: 'purchase'; purchase: PublicationPurchase } | { kind: 'preference'; preference: RenewalPreference } | { kind: 'authorization'; authorization: PaymentAuthorization; redirectUrl?: string | null } | { kind: 'invoice'; payment: { reference: string; state: string; redirectUrl: string | null } };
const pendingStates = new Set(['initializing', 'pending', 'outcome_unknown', 'review_required']);
const providerLink = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try { return new URL(url).protocol === 'https:' ? url : null; } catch { return null; }
};
const errorMessage = (error: unknown) => error instanceof ApiRequestError && error.code ? `${error.message} (${error.code})${error.requestId ? ` · Request ${error.requestId}` : ''}` : error instanceof Error ? error.message : 'The current billing state could not be loaded.';

const ProfileBilling = () => {
  const { user, activeProfile } = useAuth();
  const profileId = activeProfile?.id;
  const purchaseOperationStorageKey = profileId ? `realtiq.publicationPurchaseOperation:${profileId}` : '';
  const directDebitStorageKey = profileId ? `realtiq.directDebitOperation:${profileId}` : '';
  const permissions = Array.isArray(activeProfile?.permissions) ? activeProfile.permissions : [];
  const canManage = permissions.includes('team.manage');
  const eligibleKind = activeProfile && ['developer', 'agency', 'legal_partner', 'engineering_survey_partner', 'inspection_partner', 'valuation_partner', 'buyers_agent', 'sellers_agent'].includes(activeProfile.kind);
  const [catalogue, setCatalogue] = useState<PublicationCatalogue | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PublicationEntitlement | null>(null);
  const [purchases, setPurchases] = useState<PublicationPurchase[]>([]);
  const [purchaseCursor, setPurchaseCursor] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<RenewalPreference[]>([]);
  const [authorizations, setAuthorizations] = useState<PaymentAuthorization[]>([]);
  const [documents, setDocuments] = useState<RevenueDocument[]>([]);
  const [documentCursor, setDocumentCursor] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [changeQuote, setChangeQuote] = useState<PublicationChangeQuote | null>(null);
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [providerUrl, setProviderUrl] = useState<string | null>(null);
  const [draftMethod, setDraftMethod] = useState<RenewalPreference['method']>('manual');
  const [draftAuthorization, setDraftAuthorization] = useState('');
  const [draftAutoRenew, setDraftAutoRenew] = useState(false);
  const [saveCardAuthorization, setSaveCardAuthorization] = useState(false);
  const loadVersion = useRef(0);
  const purchaseKey = useRef<{ signature: string; key: string } | null>(null);
  const directDebitKey = useRef<string | null>(null);
  const invoiceKeys = useRef<Record<string, string>>({});
  const stepUp = useBoundStepUp<BillingResult>();

  const refresh = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setLoadingMore(false);
    setErrors([]);
    const reads = await Promise.allSettled([
      eligibleKind ? revenueFoundationService.listPublicationPlans() : Promise.resolve(null),
      eligibleKind ? revenueFoundationService.getPublicationPlan() : Promise.resolve(null),
      eligibleKind ? revenueFoundationService.listPublicationPurchases({ limit: 25 }) : Promise.resolve(null),
      eligibleKind ? revenueFoundationService.listRenewalPreferences() : Promise.resolve([]),
      eligibleKind ? revenueFoundationService.listPaymentAuthorizations() : Promise.resolve([]),
      revenueFoundationService.listRevenueDocuments({ limit: 25 }),
    ]);
    if (version !== loadVersion.current || localStorage.getItem('activeProfileId') !== profileId) return;
    const [catalogueResult, planResult, purchasesResult, preferencesResult, authorizationsResult, documentsResult] = reads;
    if (catalogueResult.status === 'fulfilled') setCatalogue(catalogueResult.value);
    if (planResult.status === 'fulfilled') setCurrentPlan(planResult.value);
    if (purchasesResult.status === 'fulfilled' && purchasesResult.value) { setPurchases(purchasesResult.value.purchases); setPurchaseCursor(purchasesResult.value.nextCursor); }
    if (preferencesResult.status === 'fulfilled') setPreferences(preferencesResult.value);
    if (authorizationsResult.status === 'fulfilled') setAuthorizations(authorizationsResult.value);
    if (documentsResult.status === 'fulfilled') { setDocuments(documentsResult.value.documents); setDocumentCursor(documentsResult.value.nextCursor); }
    setErrors(reads.filter((result): result is PromiseRejectedResult => result.status === 'rejected').map((result) => errorMessage(result.reason)));
    setLoading(false);
  }, [eligibleKind, profileId]);

  useEffect(() => {
    loadVersion.current += 1;
    setCatalogue(null); setCurrentPlan(null); setPurchases([]); setPurchaseCursor(null); setPreferences([]); setAuthorizations([]); setDocuments([]); setDocumentCursor(null);
    setSelectedPlan(''); setPeriod('monthly'); setChangeQuote(null); setNotice(''); setProviderUrl(null); setErrors([]); setSaveCardAuthorization(false);
    purchaseKey.current = null; directDebitKey.current = null; invoiceKeys.current = {};
    if (profileId) void refresh();
    return () => { loadVersion.current += 1; };
  }, [profileId, refresh]);

  const currentSelection = catalogue?.plans.find((plan) => plan.key === selectedPlan);
  const selectedTerm = currentSelection?.terms.find((term) => term.period === period);
  const existingPending = purchases.find((purchase) => pendingStates.has(purchase.state));
  const existingMandatePending = authorizations.some((authorization) => authorization.method === 'direct_debit' && ['pending_initialization', 'initializing', 'outcome_unknown', 'pending_activation'].includes(authorization.state));
  const renewalAvailability = catalogue?.renewalAvailability;
  const canSetUpCard = renewalAvailability?.unavailableMethods.some((item) => item.method === 'saved_card' && item.reasonCode === 'PAYMENT_AUTHORIZATION_REQUIRED') === true;
  const canSetUpDirectDebit = renewalAvailability?.unavailableMethods.some((item) => item.method === 'direct_debit' && item.reasonCode === 'PAYMENT_AUTHORIZATION_REQUIRED') === true;

  const resolvePurchaseKey = (signature: string): string | null => {
    const stored = purchaseOperationStorageKey ? sessionStorage.getItem(purchaseOperationStorageKey) : null;
    let prior: { signature: string; key: string } | null = null;
    if (stored) {
      try { const parsed = JSON.parse(stored) as { signature?: unknown; key?: unknown }; if (typeof parsed.signature === 'string' && typeof parsed.key === 'string') prior = { signature: parsed.signature, key: parsed.key }; }
      catch { setErrors(['A saved publication purchase attempt could not be read. Review current purchases before starting another.']); return null; }
      if (!prior) { setErrors(['A saved publication purchase attempt is incomplete. Review current purchases before starting another.']); return null; }
    }
    if (prior && prior.signature !== signature) { setErrors(['A prior publication purchase has an unresolved outcome. Reconcile it before changing the plan or billing period.']); return null; }
    if (purchaseKey.current?.signature !== signature) purchaseKey.current = prior ?? { signature, key: `publication_${crypto.randomUUID()}` };
    return purchaseKey.current.key;
  };

  const quoteUpgrade = async () => {
    if (!selectedTerm || !profileId || !canManage) return;
    const signature = `${profileId}:${selectedPlan}:${period}:${saveCardAuthorization}`;
    const operationKey = resolvePurchaseKey(signature);
    if (!operationKey) return;
    setChangeQuote(null); setNotice('');
    try {
      const quote = await revenueFoundationService.quotePublicationChange({ planKey: selectedPlan, billingPeriod: period, operationKey });
      if (localStorage.getItem('activeProfileId') === profileId) setChangeQuote(quote);
    } catch (error) { if (localStorage.getItem('activeProfileId') === profileId) setErrors([errorMessage(error)]); }
  };

  const beginPurchase = async () => {
    if (!selectedTerm || !canManage || existingPending || stepUp.busy || stepUp.challenge || !profileId) return;
    const signature = `${profileId}:${selectedPlan}:${period}:${saveCardAuthorization}`;
    const operationKey = resolvePurchaseKey(signature);
    if (!operationKey) return;
    const body = { planKey: selectedPlan, billingPeriod: period, operationKey, ...(changeQuote?.planKey === selectedPlan && changeQuote.billingPeriod === period ? { quoteId: changeQuote.id } : {}), ...(saveCardAuthorization ? { saveAuthorizationForRenewal: true } : {}) };
    await stepUp.begin({ method: 'POST', path: '/api/profiles/current/publication-plan-purchases', body, label: `Purchase ${currentSelection?.label ?? selectedPlan}`, execute: async (challengeId, exactBody) => { if (purchaseOperationStorageKey) sessionStorage.setItem(purchaseOperationStorageKey, JSON.stringify({ signature, key: exactBody.operationKey })); return { kind: 'purchase', purchase: await revenueFoundationService.purchasePublicationPlan(exactBody, challengeId) }; } });
  };

  const beginPurchaseAction = async (purchase: PublicationPurchase, action: 'cancel' | 'reconcile') => {
    if (!canManage || stepUp.busy || stepUp.challenge) return;
    const path = `/api/profiles/current/publication-plan-purchases/${encodeURIComponent(purchase.id)}/${action}`;
    await stepUp.begin({ method: 'POST', path, body: {}, label: `${action === 'cancel' ? 'Cancel' : 'Reconcile'} publication-plan purchase`, execute: async (challengeId) => ({ kind: 'purchase', purchase: action === 'cancel' ? await revenueFoundationService.cancelPublicationPurchase(purchase.id, challengeId) : await revenueFoundationService.reconcilePublicationPurchase(purchase.id, challengeId) }) });
  };

  const beginPreference = async () => {
    if (!selectedTerm || !catalogue?.category || !canManage || stepUp.busy || stepUp.challenge) return;
    if (!renewalMethodAvailable(renewalAvailability, draftMethod)) { setErrors(['The selected renewal method is not currently available. Refresh billing state and choose a method returned by the server.']); return; }
    const current = preferences.find((item) => item.kind === 'publication_plan' && item.category === catalogue.category);
    const authorization = authorizations.find((item) => item.id === draftAuthorization && item.state === 'active' && item.reusable);
    if ((draftMethod === 'saved_card' || draftMethod === 'direct_debit') && (!authorization || authorization.method !== draftMethod)) { setErrors(['Select an active reusable authorization for automatic renewal.']); return; }
    const body = { kind: 'publication_plan' as const, targetId: catalogue.category, planKey: selectedPlan, billingPeriod: period, method: draftMethod, ...(authorization ? { authorizationId: authorization.id } : {}), autoRenew: draftAutoRenew && Boolean(authorization), expectedVersion: current?.version ?? 0 };
    await stepUp.begin({ method: 'PUT', path: '/api/profiles/current/billing/renewal-preferences', body, label: 'Save renewal preference', execute: async (challengeId, exactBody) => ({ kind: 'preference', preference: await revenueFoundationService.saveRenewalPreference(exactBody, challengeId) }) });
  };

  const beginDirectDebit = async () => {
    if (!canManage || !canSetUpDirectDebit || existingMandatePending || stepUp.busy || stepUp.challenge || !window.confirm('Start a Direct Debit authorization with the payment provider? No recurring charge is enabled until the authorization becomes active and you save a renewal preference.')) return;
    directDebitKey.current ??= (directDebitStorageKey ? sessionStorage.getItem(directDebitStorageKey) : null) || `mandate_${crypto.randomUUID()}`;
    const body = { operationKey: directDebitKey.current, consent: true as const };
    await stepUp.begin({ method: 'POST', path: '/api/profiles/current/billing/payment-authorizations/direct-debit', body, label: 'Start Direct Debit authorization', execute: async (challengeId, exactBody) => { if (directDebitStorageKey) sessionStorage.setItem(directDebitStorageKey, exactBody.operationKey); return { kind: 'authorization', ...await revenueFoundationService.startDirectDebit(exactBody, challengeId) }; } });
  };

  const beginInvoicePay = async (document: RevenueDocument) => {
    if (stepUp.busy || stepUp.challenge || document.kind !== 'invoice' || document.state !== 'issued') return;
    const invoiceStorageKey = profileId ? `realtiq.invoicePaymentOperation:${profileId}:${document.id}` : '';
    invoiceKeys.current[document.id] ??= (invoiceStorageKey ? sessionStorage.getItem(invoiceStorageKey) : null) || `invoice_${crypto.randomUUID()}`;
    const body = { operationKey: invoiceKeys.current[document.id] };
    await stepUp.begin({ method: 'POST', path: `/api/revenue-documents/${encodeURIComponent(document.id)}/pay`, body, label: `Pay invoice ${document.number}`, execute: async (challengeId, exactBody) => { if (invoiceStorageKey) sessionStorage.setItem(invoiceStorageKey, exactBody.operationKey); return { kind: 'invoice', payment: await revenueFoundationService.payRevenueDocument(document.id, exactBody, challengeId) }; } });
  };

  const complete = async (code: string) => {
    const result = await stepUp.complete(code);
    if (!result.ok) { setErrors([result.error ?? 'The protected action was not confirmed. Refresh current status before another attempt.']); return false; }
    if (result.value.kind === 'purchase') {
      const purchase = result.value.purchase;
      setNotice(`Purchase status: ${purchase.state.replaceAll('_', ' ')}. The plan becomes active only when the server confirms entitlement.`);
      setProviderUrl(providerLink(purchase.redirectUrl));
      if (!pendingStates.has(purchase.state)) { purchaseKey.current = null; if (purchaseOperationStorageKey) sessionStorage.removeItem(purchaseOperationStorageKey); }
    } else if (result.value.kind === 'authorization') {
      setNotice(`Authorization status: ${result.value.authorization.state}. It cannot be used until active.`);
      setProviderUrl(providerLink(result.value.redirectUrl));
      if (result.value.authorization.state === 'active' && directDebitStorageKey) sessionStorage.removeItem(directDebitStorageKey);
    } else if (result.value.kind === 'preference') {
      setNotice(`Renewal preference status: ${result.value.preference.state}.`);
    } else {
      setNotice(`Invoice payment status: ${result.value.payment.state}. Reload the invoice after provider confirmation.`);
      setProviderUrl(providerLink(result.value.payment.redirectUrl));
    }
    await refresh();
    return true;
  };

  const loadMore = async (kind: 'purchases' | 'documents') => {
    const cursor = kind === 'purchases' ? purchaseCursor : documentCursor;
    if (!cursor || !profileId || loadingMore) return;
    const version = loadVersion.current;
    setLoadingMore(true);
    try {
      if (kind === 'purchases') {
        const page = await revenueFoundationService.listPublicationPurchases({ limit: 25, before: cursor });
        if (version === loadVersion.current && localStorage.getItem('activeProfileId') === profileId) { setPurchases((current) => [...current, ...page.purchases.filter((item) => !current.some((old) => old.id === item.id))]); setPurchaseCursor(page.nextCursor); }
      } else {
        const page = await revenueFoundationService.listRevenueDocuments({ limit: 25, before: cursor });
        if (version === loadVersion.current && localStorage.getItem('activeProfileId') === profileId) { setDocuments((current) => [...current, ...page.documents.filter((item) => !current.some((old) => old.id === item.id))]); setDocumentCursor(page.nextCursor); }
      }
    } catch (error) { if (version === loadVersion.current && localStorage.getItem('activeProfileId') === profileId) setErrors([errorMessage(error)]); }
    finally { if (version === loadVersion.current && localStorage.getItem('activeProfileId') === profileId) setLoadingMore(false); }
  };

  const content = <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    <header><h1 className="text-3xl font-black">Billing</h1><p className="mt-2 text-sm text-secondary">Prices, entitlements and payment states come from the current profile and server. A provider redirect never confirms payment.</p></header>
    <div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" disabled={loading} onClick={() => void refresh()}>Refresh billing state</Button>{loading ? <p role="status">Loading current billing state…</p> : null}</div>
    {errors.map((error, index) => <p role="alert" key={`${index}:${error}`} className="rounded-lg bg-error-container p-3 text-sm text-on-error-container">{error}</p>)}
    {notice ? <p role="status" className="rounded-lg bg-surface-container-low p-3 text-sm">{notice}</p> : null}
    {providerUrl ? <a href={providerUrl} className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">Continue at payment provider</a> : null}
    {eligibleKind ? <section className="rounded-xl border bg-white p-5" aria-labelledby="publication-billing-heading">
      <h2 id="publication-billing-heading" className="text-xl font-bold">Publication plan</h2>
      {currentPlan ? <p className="mt-2 text-sm">Publication allowed by current plan: {currentPlan.publicationAllowedByPlan ? 'Yes' : 'No'} · Active projects: {currentPlan.usage.activeProjects} · Active listings: {currentPlan.usage.activeListings} · Units: {currentPlan.usage.units}</p> : null}
      {catalogue?.state !== 'configured' ? <p role="status" className="mt-3 text-sm">Publication plans are {catalogue?.state ?? 'loading'}{catalogue?.errorCode ? ` (${catalogue.errorCode})` : ''}. No plan or price is assumed.</p> : <>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{catalogue.plans.map((plan) => <article key={plan.key} className="rounded-lg bg-surface-container-low p-4"><h3 className="font-bold">{plan.label}</h3>{plan.terms.map((term) => <p key={term.period} className="text-sm">{term.period}: {formatMoneyMinor(term.grossMinor, term.currency)} gross · {formatMoneyMinor(term.netMinor, term.currency)} net · {formatMoneyMinor(term.vatMinor, term.currency)} VAT</p>)}<p className="mt-2 text-xs">Includes {plan.entitlements.activeProjects} active projects, {plan.entitlements.activeListings} listings and {plan.entitlements.units} units. Server entitlement revision {plan.policyRevision}.</p></article>)}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Plan<select className="mt-1 block w-full rounded-lg border p-2" value={selectedPlan} onChange={(event) => { setSelectedPlan(event.target.value); setChangeQuote(null); }}><option value="">Choose a plan</option>{catalogue.plans.map((plan) => <option key={plan.key} value={plan.key}>{plan.label}</option>)}</select></label><label className="text-sm font-bold">Billing period<select className="mt-1 block w-full rounded-lg border p-2" value={period} onChange={(event) => { setPeriod(event.target.value as 'monthly' | 'annual'); setChangeQuote(null); }}>{currentSelection?.terms.map((term) => <option key={term.period} value={term.period}>{term.period} · {formatMoneyMinor(term.grossMinor, term.currency)}</option>)}</select></label></div>
        {selectedTerm ? <p className="mt-3 text-sm">Selected server term: {formatMoneyMinor(selectedTerm.grossMinor, selectedTerm.currency)} gross. Final purchase terms are locked by the backend.</p> : null}
        {canSetUpCard ? <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={saveCardAuthorization} onChange={(event) => setSaveCardAuthorization(event.target.checked)} />Save the payment authorization for future renewals during this purchase</label> : null}
        {existingPending ? <p role="status" className="mt-3 text-sm text-amber-900">An existing purchase is {existingPending.state.replaceAll('_', ' ')}. Review or reconcile it before starting another purchase.</p> : null}
        <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={!canManage || !selectedTerm || Boolean(existingPending)} onClick={() => void quoteUpgrade()}>Quote immediate upgrade</Button><Button type="button" disabled={!canManage || !selectedTerm || Boolean(existingPending) || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginPurchase()}>Purchase with authenticator</Button></div>
        {changeQuote ? <p role="status" className="mt-3 text-sm">Upgrade quote: {formatMoneyMinor(changeQuote.grossDueMinor, changeQuote.currency)} gross due through {new Date(changeQuote.periodEndsAt).toLocaleDateString('en-GB')}. This quote does not charge or activate the plan.</p> : null}
        {!canManage ? <p className="mt-2 text-sm text-secondary">Current profile does not grant billing management. The server checks authority on every action.</p> : null}
      </>}
      <h3 className="mt-6 font-bold">Purchases</h3>{purchases.length ? <ul className="mt-2 space-y-2">{purchases.map((purchase) => <li key={purchase.id} className="rounded-lg bg-surface-container-low p-3 text-sm"><strong>{purchase.plan.label}</strong> · {purchase.state.replaceAll('_', ' ')} · {formatMoneyMinor(purchase.plan.grossMinor ?? purchase.plan.amountMinor, purchase.plan.currency)} · {purchase.reference}<div className="mt-2 flex gap-2">{providerLink(purchase.redirectUrl) ? <a className="underline" href={providerLink(purchase.redirectUrl)!}>Continue payment</a> : null}<Button type="button" variant="secondary" disabled={!canManage || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginPurchaseAction(purchase, 'reconcile')}>Reconcile</Button>{pendingStates.has(purchase.state) ? <Button type="button" variant="ghost" disabled={!canManage || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginPurchaseAction(purchase, 'cancel')}>Request cancellation</Button> : null}</div></li>)}</ul> : <p className="mt-2 text-sm text-secondary">No publication purchases returned.</p>}{purchaseCursor ? <Button type="button" variant="secondary" className="mt-3" disabled={loadingMore} onClick={() => void loadMore('purchases')}>Load more purchases</Button> : null}
    </section> : null}
    {eligibleKind ? <section className="rounded-xl border bg-white p-5" aria-labelledby="renewal-heading"><h2 id="renewal-heading" className="text-xl font-bold">Renewal preferences</h2><p className="mt-1 text-sm text-secondary">Only an active reusable authorization can enable automatic renewal. A transfer invoice does not auto-charge.</p>
      {renewalAvailability ? <p role="status" className="mt-2 text-sm">Method availability: {renewalAvailability.state.replaceAll('_', ' ')}{renewalAvailability.errorCode ? ` (${renewalAvailability.errorCode})` : ''}.</p> : <p role="status" className="mt-2 text-sm">Renewal method availability has not been returned. Refresh before saving a preference.</p>}
      {renewalAvailability?.unavailableMethods.map((item) => <p key={item.method} className="mt-1 text-sm text-secondary">{item.method.replaceAll('_', ' ')} unavailable: {item.reasonCode === 'PAYMENT_AUTHORIZATION_REQUIRED' ? 'Set up an active authorization first.' : item.reasonCode}</p>)}
      {preferences.map((preference) => <article key={preference.id} className="mt-3 rounded-lg bg-surface-container-low p-3 text-sm"><strong>{preference.kind.replaceAll('_', ' ')}</strong> · {preference.method.replaceAll('_', ' ')} · {preference.state} · version {preference.version}{preference.suspensionCode ? ` · ${preference.suspensionCode}` : ''}{preference.lastAttempt ? <p>Last attempt: {preference.lastAttempt.state} · {formatMoneyMinor(preference.lastAttempt.amountMinor, preference.lastAttempt.currency)}{preference.lastAttempt.errorCode ? ` · ${preference.lastAttempt.errorCode}` : ''}</p> : null}<Button type="button" variant="ghost" disabled={!canManage || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void stepUp.begin({ method: 'POST', path: `/api/profiles/current/billing/renewal-preferences/${encodeURIComponent(preference.id)}/disable`, body: {}, label: 'Disable renewal preference', execute: async (challengeId) => ({ kind: 'preference', preference: await revenueFoundationService.disableRenewalPreference(preference.id, challengeId) }) })}>Disable with authenticator</Button></article>)}
      {catalogue?.state === 'configured' && selectedTerm && renewalAvailability ? <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Renewal method<select className="mt-1 block w-full rounded-lg border p-2" value={draftMethod} onChange={(event) => { setDraftMethod(event.target.value as RenewalPreference['method']); setDraftAuthorization(''); setDraftAutoRenew(false); }}>{renewalAvailability.manual.available ? <option value="manual">Manual</option> : null}{renewalAvailability.methods.map((item) => <option key={item.method} value={item.method}>{item.method.replaceAll('_', ' ')}</option>)}{!renewalMethodAvailable(renewalAvailability, draftMethod) ? <option value={draftMethod} disabled>{draftMethod.replaceAll('_', ' ')} (unavailable)</option> : null}</select></label>{draftMethod === 'saved_card' || draftMethod === 'direct_debit' ? <label className="text-sm font-bold">Active authorization<select className="mt-1 block w-full rounded-lg border p-2" value={draftAuthorization} onChange={(event) => setDraftAuthorization(event.target.value)}><option value="">Choose authorization</option>{authorizations.filter((item) => item.method === draftMethod && item.state === 'active' && item.reusable).map((item) => <option key={item.id} value={item.id}>{item.method} · {item.id}</option>)}</select></label> : null}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draftAutoRenew} disabled={!draftAuthorization || (draftMethod !== 'saved_card' && draftMethod !== 'direct_debit')} onChange={(event) => setDraftAutoRenew(event.target.checked)} />Automatic renewal</label><Button type="button" disabled={!canManage || !renewalMethodAvailable(renewalAvailability, draftMethod) || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginPreference()}>Save preference with authenticator</Button></div> : null}
      <h3 className="mt-6 font-bold">Payment authorizations</h3>{authorizations.map((item) => <div key={item.id} className="mt-2 rounded-lg bg-surface-container-low p-3 text-sm">{item.method.replaceAll('_', ' ')} · {item.state} · {item.reusable ? 'Reusable' : 'Not reusable'}<Button type="button" variant="ghost" className="ml-3" disabled={!canManage || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void stepUp.begin({ method: 'POST', path: `/api/profiles/current/billing/payment-authorizations/${encodeURIComponent(item.id)}/revoke`, body: {}, label: 'Revoke payment authorization', execute: async (challengeId) => ({ kind: 'authorization', authorization: await revenueFoundationService.revokePaymentAuthorization(item.id, challengeId) }) })}>Revoke</Button></div>)}{existingMandatePending ? <p role="status" className="mt-2 text-sm">A Direct Debit authorization is still pending. Refresh its status before another setup.</p> : null}{canSetUpDirectDebit ? <Button type="button" variant="secondary" className="mt-3" disabled={!canManage || existingMandatePending || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginDirectDebit()}>Set up Direct Debit with authenticator</Button> : null}
    </section> : null}
    <section className="rounded-xl border bg-white p-5" aria-labelledby="documents-heading"><h2 id="documents-heading" className="text-xl font-bold">REALTIQ invoices, receipts and credit notes</h2><p className="mt-1 text-sm text-secondary">Credit notes are accounting records, not a spendable balance. Payment is confirmed only after the server updates the invoice.</p>{documents.length ? <ul className="mt-3 space-y-2">{documents.map((document) => <li key={document.id} className="rounded-lg bg-surface-container-low p-3 text-sm"><strong>{document.kind.replaceAll('_', ' ')} {document.number}</strong> · {document.state} · {formatMoneyMinor(document.grossMinor, document.currency)} · issued {new Date(document.issuedAt).toLocaleDateString('en-GB')}{document.kind === 'invoice' && document.state === 'issued' ? <Button type="button" variant="secondary" className="ml-3" disabled={stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginInvoicePay(document)}>Pay with authenticator</Button> : null}</li>)}</ul> : <p className="mt-3 text-sm text-secondary">No revenue documents returned for this profile.</p>}{documentCursor ? <Button type="button" variant="secondary" className="mt-3" disabled={loadingMore} onClick={() => void loadMore('documents')}>Load more documents</Button> : null}</section>
    {activeProfile && ['owner', 'agency', 'developer', 'legal_partner', 'engineering_survey_partner', 'inspection_partner', 'valuation_partner', 'buyers_agent', 'sellers_agent'].includes(activeProfile.kind) ? <ProfilePayoutSetup key={activeProfile.id} /> : null}
    {activeProfile && Array.isArray(activeProfile.permissions) && activeProfile.permissions.includes('listing.boost') ? <ProfileCampaigns key={activeProfile.id} /> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
  </div>;
  const layout: ReactNode = user?.role === 'owner' ? <SellerPortalLayout active="billing" title="Billing">{content}</SellerPortalLayout> : <BuyerPortalLayout pageTitle="Billing" pageSubtitle="Your current profile's invoices and payment settings">{content}</BuyerPortalLayout>;
  return layout;
};

export default ProfileBilling;
