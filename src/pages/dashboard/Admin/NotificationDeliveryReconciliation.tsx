import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import Button from '../../../components/ui/Button';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { adminNotificationDeliveryService, type AdminNotificationDelivery, type NotificationDeliveryReconcileInput, type NotificationDeliveryState } from '../../../services/adminNotificationDeliveryService';

const states: NotificationDeliveryState[] = ['outcome_unknown', 'activation_pending', 'failed', 'retry'];

const NotificationDeliveryReconciliation = () => {
  const [deliveries, setDeliveries] = useState<AdminNotificationDelivery[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationDeliveryState | ''>('outcome_unknown');
  const [selected, setSelected] = useState<AdminNotificationDelivery | null>(null);
  const selectedId = useRef<string | null>(null);
  const [outcome, setOutcome] = useState<'accepted' | 'not_accepted'>('accepted');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [providerMessageId, setProviderMessageId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const stepUp = useBoundStepUp<AdminNotificationDelivery>();

  const load = useCallback(async (before?: string) => {
    setLoading(true);
    setError('');
    try {
      const page = await adminNotificationDeliveryService.list(filter || undefined, before);
      setDeliveries((current) => before ? [...current, ...page.deliveries] : page.deliveries);
      setCursor(page.nextCursor);
      if (selectedId.current && !before) {
        const refreshed = page.deliveries.find((item) => item.id === selectedId.current);
        if (refreshed) setSelected(refreshed);
        else { selectedId.current = null; setSelected(null); }
      }
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : 'Unable to load notification delivery records.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const beginReconcile = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || selected.state !== 'outcome_unknown' || !evidenceReference.trim() || (outcome === 'accepted' && !providerMessageId.trim()) || stepUp.busy || stepUp.challenge) return;
    const payload: NotificationDeliveryReconcileInput = {
      outcome,
      evidenceReference: evidenceReference.trim(),
      expectedUpdatedAt: selected.updatedAt,
      ...(outcome === 'accepted' ? { providerMessageId: providerMessageId.trim() } : {}),
    };
    await stepUp.begin({
      method: 'POST',
      path: `/api/admin/notification-deliveries/${encodeURIComponent(selected.id)}/reconcile`,
      body: payload,
      label: `Reconcile notification delivery ${selected.id}`,
      execute: (challengeId, exactBody) => adminNotificationDeliveryService.reconcile(selected.id, exactBody, challengeId),
    });
  };

  const finishReconcile = async (code: string) => {
    setSubmitting(true);
    try {
      const result = await stepUp.complete(code);
      if (!result.ok) { setError(result.error ?? 'Reconciliation failed. Refresh the delivery before reviewing it again.'); return false; }
      setSelected(result.value);
      selectedId.current = result.value.id;
      setDeliveries((current) => current.map((item) => item.id === result.value.id ? result.value : item));
      setEvidenceReference('');
      setProviderMessageId('');
      await load();
      return true;
    } finally {
      setSubmitting(false);
    }
  };

  return <AdminLayout><main className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-secondary">Technical operations</p><h1 className="mt-2 text-3xl font-extrabold text-primary">Notification delivery reconciliation</h1><p className="mt-2 max-w-3xl text-sm text-secondary">Review safe delivery metadata. Reconciliation is a version-bound staff attestation based on an evidence reference; it does not contact the provider or prove receipt by itself. Internal Audit can read but cannot reconcile.</p></header>
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <div className="rounded-2xl border border-outline-variant/10 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><label className="text-xs font-bold">Delivery state<select value={filter} onChange={(event) => setFilter(event.target.value as NotificationDeliveryState | '')} className="mt-1 block rounded-lg border p-2 text-sm font-normal"><option value="">All supported states</option>{states.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label><Button type="button" variant="secondary" disabled={loading} onClick={() => void load()}>Refresh</Button></div>
        {loading ? <LoadingState label="Loading notification deliveries…" /> : null}
        <div className="mt-4 space-y-2">{deliveries.map((delivery) => <button type="button" key={delivery.id} onClick={() => { selectedId.current = delivery.id; setSelected(delivery); }} className={`w-full rounded-lg border p-3 text-left ${selected?.id === delivery.id ? 'border-primary bg-primary/5' : 'border-outline-variant/20'}`}><span className="flex justify-between gap-3"><strong>{delivery.channel} · {delivery.state.replaceAll('_', ' ')}</strong><span className="text-xs text-secondary">{delivery.attempts} attempts</span></span><span className="mt-1 block text-xs text-secondary">{delivery.id} · Updated {new Date(delivery.updatedAt).toLocaleString()}</span>{delivery.errorCode ? <span className="mt-1 block text-xs text-error">{delivery.errorCode}</span> : null}</button>)}{!loading && !deliveries.length ? <p className="rounded-lg border border-dashed p-4 text-sm text-secondary">No delivery records match this state.</p> : null}</div>
        {cursor ? <Button type="button" variant="secondary" className="mt-4" disabled={loading} onClick={() => void load(cursor)}>Load more</Button> : null}
      </div>
      <div className="rounded-2xl border border-outline-variant/10 bg-white p-5">{selected ? <><h2 className="text-lg font-bold">Delivery detail</h2><dl className="mt-3 space-y-2 text-sm">{Object.entries({ id: selected.id, channel: selected.channel, state: selected.state, attempts: selected.attempts, dueAt: selected.dueAt ?? 'Not scheduled', acceptedAt: selected.acceptedAt ?? 'Not accepted', errorCode: selected.errorCode ?? 'None', receiptStatus: selected.receiptStatus ?? 'Not available', receiptAt: selected.receiptAt ?? 'Not available', updatedAt: selected.updatedAt }).map(([key, value]) => <div key={key} className="flex justify-between gap-4 border-b pb-2"><dt className="text-secondary">{key}</dt><dd className="break-all text-right font-semibold">{value}</dd></div>)}</dl>
        {selected.state === 'outcome_unknown' ? <form onSubmit={(event) => void beginReconcile(event)} className="mt-4 space-y-3 border-t pt-4"><h3 className="font-bold">Reconcile unknown outcome</h3><p className="text-xs text-secondary">Use the provider investigation reference that supports this attestation. The last-updated timestamp is sent to detect stale review.</p><label className="block text-xs font-bold">Evidence reference<input required value={evidenceReference} onChange={(event) => setEvidenceReference(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label><label className="block text-xs font-bold">Outcome<select value={outcome} onChange={(event) => setOutcome(event.target.value as 'accepted' | 'not_accepted')} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal"><option value="accepted">Provider accepted</option><option value="not_accepted">Provider did not accept</option></select></label>{outcome === 'accepted' ? <label className="block text-xs font-bold">Provider message ID<input required value={providerMessageId} onChange={(event) => setProviderMessageId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label> : null}<Button type="submit" disabled={!evidenceReference.trim() || (outcome === 'accepted' && !providerMessageId.trim()) || submitting || stepUp.busy || Boolean(stepUp.challenge)}>Reconcile with authenticator</Button>{stepUp.error ? <p role="alert" className="text-sm text-error">{stepUp.error}</p> : null}</form> : <p className="mt-4 text-sm text-secondary">This delivery is not in the unknown-outcome state, so reconciliation is unavailable. Refresh if another operator may have changed it.</p>}</> : <p className="text-sm text-secondary">Select a delivery to review its safe server projection.</p>}</div>
    </section>
    <StepUpDialog challenge={stepUp.challenge} busy={submitting || stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={finishReconcile} />
  </main></AdminLayout>;
};

export default NotificationDeliveryReconciliation;
