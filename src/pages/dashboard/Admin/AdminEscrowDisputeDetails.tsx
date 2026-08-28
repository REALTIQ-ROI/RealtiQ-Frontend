import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import AdminLayout from '../../../components/layout/AdminLayout';
import EscrowStatusBadge from '../../../components/escrow/EscrowStatusBadge';
import { formatDateTime, formatEscrowMoney, RULE_LABELS } from '../../../components/escrow/escrowConfig';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { escrowErrorDetails, escrowService } from '../../../services/escrowService';
import type { EscrowDisputeAction, EscrowRule } from '../../../types/escrow';
import { escrowBuyer, escrowPayment, escrowProperty, escrowSeller, isRuleSatisfied, populated } from '../../../types/escrow';

const actionCopy: Record<EscrowDisputeAction, { title: string; button: string; consequence: string }> = {
  reopen: {
    title: 'Reopen Escrow',
    button: 'Reopen Escrow',
    consequence: 'Restores the preserved pre-dispute status without resetting milestones or payment history.',
  },
  refund_buyer: {
    title: 'Refund Buyer',
    button: 'Refund Buyer',
    consequence: 'Starts a Paystack refund to the original successful transaction. Completion requires confirmation from Paystack.',
  },
  release_seller: {
    title: 'Release Funds to Seller/Landlord',
    button: 'Release Funds to Seller/Landlord',
    consequence: 'Starts the seller payout only when RealTIQ eligibility, milestone, and payout account requirements are satisfied.',
  },
  cancel_escrow: {
    title: 'Cancel Escrow',
    button: 'Cancel Escrow',
    consequence: 'A paid escrow remains cancellation-pending until the buyer refund is confirmed.',
  },
};

const processingStatuses = new Set([
  'refund_processing',
  'release_processing',
  'cancellation_pending_refund',
]);

const AdminEscrowDisputeDetails = () => {
  const { disputeId = '' } = useParams();
  const { data, loading, error, execute } = useAsync(
    () => escrowService.getAdminDispute(disputeId),
    Boolean(disputeId),
  );
  const [pendingAction, setPendingAction] = useState<EscrowDisputeAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [missingRules, setMissingRules] = useState<Array<Partial<EscrowRule>>>([]);
  const [reconciliation, setReconciliation] = useState(false);
  const escrow = data?.escrow;
  const property = escrow ? escrowProperty(escrow) : null;
  const buyer = escrow ? escrowBuyer(escrow) : null;
  const seller = escrow ? escrowSeller(escrow) : null;
  const payment = escrow ? escrowPayment(escrow) : null;
  const financialProcessing = Boolean(escrow && processingStatuses.has(escrow.status));

  useEffect(() => {
    if (!financialProcessing) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void execute({ silent: true });
    };
    const timer = window.setInterval(refresh, 12_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [execute, financialProcessing]);

  const groupedRules = useMemo(() => {
    const all = data?.milestones.all?.length ? data.milestones.all : escrow?.rules ?? [];
    return {
      all,
      satisfied: data?.milestones.satisfied ?? all.filter(isRuleSatisfied),
      outstanding: data?.milestones.outstanding ?? all.filter((rule) => rule.required && !isRuleSatisfied(rule)),
    };
  }, [data?.milestones, escrow?.rules]);

  const resolve = async (action: EscrowDisputeAction) => {
    if (!data || !escrow || pendingAction || reconciliation) return;
    const copy = actionCopy[action];
    const prompt = await Swal.fire<string>({
      title: copy.title,
      text: `${property?.title ?? 'Property'} · ${formatEscrowMoney(escrow.amount, escrow.currency ?? property?.currency)}. ${copy.consequence}`,
      input: 'textarea',
      inputLabel: 'Administrator resolution reason (required)',
      inputPlaceholder: 'Explain the reviewed decision for the audit record.',
      showCancelButton: true,
      confirmButtonText: copy.button,
      confirmButtonColor: action === 'reopen' ? '#173d32' : '#b42318',
      inputValidator: (value) => !value.trim() ? 'A resolution reason is required.' : undefined,
    });
    if (!prompt.isConfirmed || !prompt.value?.trim()) return;
    setPendingAction(action);
    setActionError(null);
    setMissingRules([]);
    setNotice(null);
    try {
      const result = await escrowService.resolveAdminDispute(data.dispute._id, {
        action,
        reason: prompt.value.trim(),
      });
      const response = result.data;
      setReconciliation(Boolean(response.reconciliationRequired));
      if (response.reconciliationRequired) {
        setNotice('Provider confirmation is pending. Do not retry this financial action until RealtiQ receives confirmation.');
      } else if (result.status === 202 || response.pending) {
        setNotice(
          action === 'refund_buyer'
            ? 'Buyer refund processing has started. Completion is awaiting confirmation from Paystack.'
            : action === 'release_seller'
              ? 'Seller payout processing has started. Property ownership is unchanged until release is confirmed.'
              : 'Cancellation is pending confirmation of the buyer refund.',
        );
      } else {
        setNotice(action === 'reopen' ? 'Escrow reopened using its preserved pre-dispute state.' : 'Resolution submitted and confirmed by RealTIQ.');
      }
      toast.success('Dispute resolution submitted.');
      await execute();
    } catch (raw) {
      const requestError = escrowErrorDetails(raw);
      setActionError(requestError.message);
      if (Array.isArray(requestError.missingRules)) {
        setMissingRules(requestError.missingRules as Array<Partial<EscrowRule>>);
      }
      if (requestError.requiresSellerAccount) {
        setActionError(`${requestError.message} The seller must configure their payout account from landlord settings; administrators cannot enter it for them.`);
      }
      if (requestError.status === 409) await execute();
    } finally {
      setPendingAction(null);
    }
  };

  if (loading) return <AdminLayout><main className="p-8"><LoadingState label="Loading dispute review..." /></main></AdminLayout>;
  if (error || !data || !escrow) return <AdminLayout><main className="p-8"><ErrorState message={error ?? 'Dispute not found.'} onRetry={() => void execute()} /></main></AdminLayout>;

  const releaseDisabledReason = groupedRules.outstanding.length
    ? `${groupedRules.outstanding.length} required milestone(s) remain outstanding.`
    : escrow.sellerPayoutStatus === 'processing'
      ? 'Seller payout is already processing.'
      : 'Seller release is not available in the current escrow state.';

  const actions: Array<{ action: EscrowDisputeAction; enabled: boolean; disabledReason: string }> = [
    { action: 'reopen', enabled: data.availableActions.reopen, disabledReason: 'Reopening is not available in the current dispute state.' },
    { action: 'refund_buyer', enabled: data.availableActions.refundBuyer, disabledReason: escrow.refundStatus === 'processing' ? 'Buyer refund is already processing.' : 'A buyer refund is not available in the current state.' },
    { action: 'release_seller', enabled: data.availableActions.releaseSeller, disabledReason: releaseDisabledReason },
    { action: 'cancel_escrow', enabled: data.availableActions.cancelEscrow, disabledReason: financialProcessing ? 'A financial resolution is already processing.' : 'Cancellation is not available in the current state.' },
  ];

  return (
    <AdminLayout>
      <main className="min-h-screen space-y-6 p-4 sm:p-8 lg:p-10">
        <header>
          <Link to="/dashboard/admin/escrow-disputes" className="text-sm font-bold text-primary hover:underline">← Escrow disputes</Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-widest text-secondary">Dispute review</p><h1 className="mt-2 text-3xl font-extrabold">{property?.title ?? 'Property escrow'}</h1><p className="mt-2 text-sm text-secondary">{data.dispute.reason}</p></div>
            <EscrowStatusBadge status={escrow.status} />
          </div>
        </header>

        {notice ? <p role="status" className="rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-900">{notice}</p> : null}
        {actionError ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900">{actionError}</p> : null}
        {reconciliation || financialProcessing ? <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">Provider confirmation is pending. Do not retry this financial action until RealtiQ receives confirmation.</p> : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <section className="rounded-xl bg-white p-5 sm:p-7">
              <h2 className="text-xl font-bold">Transaction</h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="font-bold text-secondary">Property</dt><dd>{property?.publicReference ? <Link className="font-bold text-primary hover:underline" to={`/properties/${property.publicReference}`}>{property.title}</Link> : property?.title ?? 'Property'}</dd></div>
                <div><dt className="font-bold text-secondary">Escrow amount</dt><dd className="font-black">{formatEscrowMoney(escrow.amount, escrow.currency ?? property?.currency)}</dd></div>
                <div><dt className="font-bold text-secondary">Buyer</dt><dd>{buyer?.name ?? 'Buyer'} · {buyer?.email ?? 'Email unavailable'}</dd></div>
                <div><dt className="font-bold text-secondary">Seller</dt><dd>{seller?.name ?? 'Seller'} · {seller?.email ?? 'Email unavailable'}</dd></div>
                <div><dt className="font-bold text-secondary">Payment state</dt><dd className="capitalize">{data.financialState.paymentStatus ?? payment?.status ?? 'unknown'}</dd></div>
                <div><dt className="font-bold text-secondary">Payment reference</dt><dd className="break-all">{payment?.reference ?? escrow.paymentReference ?? 'Not recorded'}</dd></div>
                <div><dt className="font-bold text-secondary">Refund status</dt><dd className="capitalize">{escrow.refundStatus?.replaceAll('_', ' ') ?? 'none'}</dd></div>
                <div><dt className="font-bold text-secondary">Seller payout</dt><dd className="capitalize">{escrow.sellerPayoutStatus?.replaceAll('_', ' ') ?? 'none'}</dd></div>
              </dl>
            </section>

            <section className="rounded-xl bg-white p-5 sm:p-7">
              <h2 className="text-xl font-bold">Dispute</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="font-bold">Status</dt><dd className="capitalize">{data.dispute.status.replaceAll('_', ' ')}</dd></div>
                <div><dt className="font-bold">Opened</dt><dd>{formatDateTime(data.dispute.openedAt)}</dd></div>
                <div><dt className="font-bold">Opened by</dt><dd>{populated(data.dispute.raisedBy)?.name ?? 'Participant'}</dd></div>
                <div><dt className="font-bold">Pre-dispute status</dt><dd className="capitalize">{data.dispute.preDisputeStatus.replaceAll('_', ' ')}</dd></div>
              </dl>
              {data.dispute.description ? <p className="mt-4 rounded-lg bg-surface-container-low p-4 text-sm">{data.dispute.description}</p> : null}
              {data.dispute.evidence?.length ? <ul className="mt-4 space-y-2 text-sm">{data.dispute.evidence.map((item, index) => <li key={`evidence-${index}`} className="rounded-lg border p-3">Evidence: {typeof item.label === 'string' ? item.label : 'Referenced record'}{typeof item.documentId === 'string' ? ` · ${item.documentId}` : ''}</li>)}</ul> : null}
            </section>

            <section className="rounded-xl bg-white p-5 sm:p-7">
              <h2 className="text-xl font-bold">Milestones</h2>
              <p className="mt-1 text-sm text-secondary">{groupedRules.satisfied.length} satisfied · {groupedRules.outstanding.length} outstanding</p>
              <div className="mt-4 space-y-3">{groupedRules.all.map((rule) => <article key={rule._id} className="rounded-lg border p-4 text-sm"><div className="flex justify-between gap-3"><strong>{RULE_LABELS[rule.type]}</strong><span className="font-bold">{isRuleSatisfied(rule) ? 'Satisfied' : 'Outstanding'}</span></div><p className="mt-1 text-secondary">{rule.description}</p>{rule.amount !== undefined ? <p className="mt-2 font-black">{formatEscrowMoney(rule.amount, escrow.currency)}</p> : null}</article>)}</div>
            </section>

            <section className="rounded-xl bg-white p-5 sm:p-7">
              <h2 className="text-xl font-bold">Dispute history</h2>
              <div className="mt-4 space-y-3">{[data.dispute, ...(data.history ?? []).filter((item) => item._id !== data.dispute._id)].map((item) => <article key={item._id} className="rounded-lg bg-surface-container-low p-4 text-sm"><div className="flex justify-between gap-3"><strong>{item.reason}</strong><span className="capitalize">{item.status.replaceAll('_', ' ')}</span></div><p className="mt-2 text-xs text-secondary">{formatDateTime(item.openedAt)}{item.resolvedAt ? ` · Resolved ${formatDateTime(item.resolvedAt)}` : ''}</p>{item.resolutionReason ? <p className="mt-2">{item.resolutionReason}</p> : null}</article>)}</div>
            </section>

            <section className="rounded-xl bg-white p-5 sm:p-7">
              <h2 className="text-xl font-bold">Escrow audit timeline</h2>
              <ol className="mt-4 space-y-3">{(data.logs ?? []).map((log, index) => <li key={log._id ?? `${log.createdAt}-${index}`} className="border-l-2 border-primary pl-4 text-sm"><strong className="capitalize">{log.action.replaceAll('_', ' ')}</strong><p className="text-xs text-secondary">{formatDateTime(log.createdAt)}</p>{log.note ? <p className="mt-1">{log.note}</p> : null}</li>)}</ol>
            </section>
          </div>

          <aside className="h-fit space-y-4 xl:sticky xl:top-24">
            <h2 className="text-xl font-bold">Administrator resolution</h2>
            {actions.map(({ action, enabled, disabledReason }) => {
              const copy = actionCopy[action];
              const retryRelease = action === 'release_seller' && escrow.sellerPayoutStatus === 'failed';
              return (
                <article key={action} className="rounded-xl border border-outline-variant/20 bg-white p-5">
                  <h3 className="font-bold">{retryRelease ? 'Retry Seller Release' : copy.title}</h3>
                  <p className="mt-2 text-sm text-secondary">{copy.consequence}</p>
                  {!enabled ? <p className="mt-3 text-xs font-semibold text-amber-800">{disabledReason}</p> : null}
                  {action === 'release_seller' && groupedRules.outstanding.length ? <ul className="mt-3 list-disc pl-5 text-xs text-secondary">{groupedRules.outstanding.map((rule) => <li key={rule._id}>{rule.description}</li>)}</ul> : null}
                  <button type="button" disabled={!enabled || Boolean(pendingAction) || reconciliation || financialProcessing} onClick={() => void resolve(action)} className={`mt-4 w-full rounded-lg px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-40 ${action === 'reopen' ? 'bg-primary text-on-primary' : 'bg-red-700 text-white'}`}>
                    {pendingAction === action ? 'Submitting...' : retryRelease ? 'Retry Seller Release' : copy.button}
                  </button>
                </article>
              );
            })}
            {missingRules.length ? <section role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900"><strong>Required milestones are incomplete:</strong><ul className="mt-2 list-disc pl-5">{missingRules.map((rule, index) => <li key={rule._id ?? index}>{rule.description ?? rule.type ?? 'Required milestone'}</li>)}</ul></section> : null}
          </aside>
        </div>
      </main>
    </AdminLayout>
  );
};

export default AdminEscrowDisputeDetails;
