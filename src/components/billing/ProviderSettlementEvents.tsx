import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBoundStepUp } from '../../hooks/useBoundStepUp';
import { ApiRequestError } from '../../lib/axios';
import { financeRevenueService, type ProviderSettlementEvent, type ProviderSettlementReconciliation, type RevenueRange } from '../../services/financeRevenueService';
import { formatMoneyMinor } from '../../utils/moneyMinor';
import StepUpDialog from '../auth/StepUpDialog';
import Button from '../ui/Button';

const message = (raw: unknown) => raw instanceof ApiRequestError && raw.code ? `${raw.message} (${raw.code})` : raw instanceof Error ? raw.message : 'Settlement events could not be loaded.';

const ProviderSettlementEvents = ({ range, canManage }: { range: RevenueRange; canManage: boolean }) => {
  const { activeProfile } = useAuth();
  const profileId = activeProfile?.id;
  const [events, setEvents] = useState<ProviderSettlementEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mustRefresh, setMustRefresh] = useState(false);
  const version = useRef(0);
  const submitted = useRef(false);
  const stepUp = useBoundStepUp<ProviderSettlementReconciliation>();

  const load = useCallback(async (after?: string) => {
    if (!profileId) return;
    const request = ++version.current;
    setLoading(true); setError('');
    try {
      const page = await financeRevenueService.getProviderSettlementEvents({ ...range, limit: 50, ...(after ? { after } : {}) });
      if (request !== version.current || localStorage.getItem('activeProfileId') !== profileId) return;
      setEvents((current) => after ? [...current, ...page.settlements.filter((item) => !current.some((old) => old.id === item.id))] : page.settlements);
      setCursor(page.nextCursor); setMustRefresh(false);
    } catch (raw) { if (request === version.current) setError(message(raw)); }
    finally { if (request === version.current) setLoading(false); }
  }, [profileId, range]);

  useEffect(() => {
    const current = version.current;
    queueMicrotask(() => { if (current === version.current) void load(); });
    return () => { version.current += 1; stepUp.cancel(); };
    // Parent keys this panel by the selected staff profile and report range.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, range.from, range.to]);

  const beginReconcile = async (event: ProviderSettlementEvent) => {
    if (!canManage || !event.reconcilable || mustRefresh || loading || stepUp.busy || stepUp.challenge) return;
    submitted.current = false;
    await stepUp.begin({ method: 'POST', path: `/api/admin/revenue/provider-settlements/${encodeURIComponent(event.id)}/reconcile`, body: {}, label: `Reconcile settlement ${event.settlementReference}`, execute: (challengeId) => { submitted.current = true; return financeRevenueService.reconcileProviderSettlementEvent(event.id, challengeId); } });
  };

  const complete = async (code: string) => {
    const result = await stepUp.complete(code);
    if (!result.ok) {
      if (submitted.current) { setMustRefresh(true); await load(); }
      setError(result.error ?? 'The settlement check was not confirmed. Refresh before another attempt.');
      return false;
    }
    setNotice(`Merchant reconciliation ${result.value.state}. ${result.value.discrepancyCount} discrepancy records. Beneficiary settlement remains ${result.value.beneficiarySettlement}.`);
    setMustRefresh(true);
    await load();
    return true;
  };

  return <section className="rounded-xl border bg-white p-5" aria-labelledby="settlement-events-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="settlement-events-heading" className="text-xl font-bold">Provider settlement events</h2><Button type="button" variant="secondary" disabled={loading} onClick={() => void load()}>Refresh events</Button></div>
    <p className="mt-1 text-sm text-secondary">These are merchant webhook records. A verified merchant match does not confirm settlement to split beneficiaries.</p>
    {loading ? <p role="status" className="mt-2 text-sm">Loading settlement events…</p> : null}{error ? <p role="alert" className="mt-2 text-sm text-error">{error}</p> : null}{notice ? <p role="status" className="mt-2 text-sm">{notice}</p> : null}
    {mustRefresh ? <p role="alert" className="mt-2 text-sm">Reconciliation may have reached the provider. Refresh this event list before another attempt.</p> : null}
    {events.length ? <ul className="mt-3 space-y-3">{events.map((event) => <li key={event.id} className="rounded-lg bg-surface-container-low p-3 text-sm"><strong>{event.settlementReference}</strong> · {event.state.replaceAll('_', ' ')} · received {new Date(event.receivedAt).toLocaleString('en-GB')}<p className="mt-1">{event.eventType} · attempts {event.attempts}{event.reconciliationCode ? ` · ${event.reconciliationCode}` : ''}</p>{event.details.reconciliation ? <p className="mt-1">Matched {event.details.reconciliation.matchedInternalPayments} of {event.details.reconciliation.providerTransactionCount} provider transactions · {event.details.reconciliation.discrepancyCount} discrepancies{event.details.currency ? ` · gross ${formatMoneyMinor(event.details.reconciliation.providerGrossMinor, event.details.currency)}` : ''}</p> : null}{event.details.reconciliation?.discrepancies.length ? <ul className="mt-1 list-inside list-disc">{event.details.reconciliation.discrepancies.map((item, index) => <li key={`${item.code}:${index}`}>{item.paymentReference ? `${item.paymentReference}: ` : ''}{item.code}</li>)}</ul> : null}{canManage && event.reconcilable ? <Button type="button" variant="secondary" className="mt-2" disabled={mustRefresh || loading || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginReconcile(event)}>Reconcile with authenticator</Button> : null}{!event.reconcilable ? <p className="mt-1 text-secondary">This event has no usable settlement reference for reconciliation.</p> : null}</li>)}</ul> : !loading && !error ? <p className="mt-3 text-sm text-secondary">No settlement events were returned for this period.</p> : null}
    {cursor ? <Button type="button" variant="secondary" className="mt-3" disabled={loading} onClick={() => void load(cursor)}>Load more events</Button> : null}
    <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={complete} />
  </section>;
};

export default ProviderSettlementEvents;
