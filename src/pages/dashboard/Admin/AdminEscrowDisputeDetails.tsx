import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import StepUpDialog from '../../../components/auth/StepUpDialog';
import AdminLayout from '../../../components/layout/AdminLayout';
import { formatDateTime } from '../../../components/escrow/escrowConfig';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useAsync } from '../../../hooks/useAsync';
import { useBoundStepUp } from '../../../hooks/useBoundStepUp';
import { escrowService } from '../../../services/escrowService';

const AdminEscrowDisputeDetails = () => {
  const { disputeId = '' } = useParams();
  const { data, loading, error, execute } = useAsync(
    () => escrowService.getAdminDispute(disputeId), Boolean(disputeId), disputeId,
  );
  const stepUp = useBoundStepUp<Awaited<ReturnType<typeof escrowService.resolveAdminDispute>>>();
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  if (loading) return <AdminLayout><main className="p-8"><LoadingState label="Loading dispute review..." /></main></AdminLayout>;
  if (error || !data) return <AdminLayout><main className="p-8"><ErrorState message={error ?? 'Dispute not found.'} onRetry={() => void execute()} /></main></AdminLayout>;

  const { dispute, milestones, financialState, availableActions } = data;
  const actions = [
    { action: 'reopen' as const, label: 'Reopen escrow', available: availableActions.reopen },
    { action: 'refund_buyer' as const, label: 'Refund buyer', available: availableActions.refundBuyer },
    { action: 'release_seller' as const, label: 'Release seller', available: availableActions.releaseSeller },
    { action: 'cancel_escrow' as const, label: 'Cancel escrow', available: availableActions.cancelEscrow },
  ] as const;

  const beginDecision = async (action: typeof actions[number]['action'], label: string) => {
    const decisionReason = reason.trim();
    if (!decisionReason || stepUp.busy || stepUp.challenge) return;
    setNotice(null);
    const body = { action, reason: decisionReason };
    const started = await stepUp.begin({
      method: 'PATCH',
      path: `/api/admin/escrow-disputes/${encodeURIComponent(disputeId)}/resolve`,
      body,
      label: `${label} for dispute ${dispute.id}`,
      execute: (challengeId, exactBody) => escrowService.resolveAdminDispute(disputeId, exactBody, challengeId),
    });
    if (!started) setNotice(stepUp.getError() ?? 'Unable to start the secure dispute decision.');
  };

  const submitStepUp = async (code: string): Promise<boolean> => {
    const result = await stepUp.complete(code);
    if (!result.ok) {
      setNotice(result.error ?? 'The finance decision was not completed. Review the current dispute state before trying again.');
      if (result.error?.includes('CONFLICT_')) await execute();
      return false;
    }
    setNotice(result.value.status === 202
      ? 'The provider operation is pending. The refreshed dispute state will show reconciliation progress.'
      : 'The server returned a decision result. Review the refreshed dispute and financial states below.');
    toast.info(result.value.status === 202 ? 'Finance operation is pending provider reconciliation.' : 'Finance decision submitted; current state refreshed.');
    setReason('');
    await execute();
    return true;
  };

  return <AdminLayout>
    <main className="min-h-screen space-y-6 p-4 sm:p-8 lg:p-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><Link to="/dashboard/admin/escrow-disputes" className="text-sm font-bold text-primary hover:underline">← Escrow disputes</Link><p className="mt-4 text-xs font-bold uppercase tracking-widest text-secondary">Dispute review</p><h1 className="mt-2 text-3xl font-extrabold">Dispute {dispute.id}</h1><p className="mt-2 text-sm text-secondary">{dispute.reason}</p></div>
        <button type="button" className="rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary" onClick={() => void execute()}>Refresh status</button>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 sm:p-7">
          <h2 className="text-xl font-bold">Current dispute</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="font-bold text-secondary">Status</dt><dd className="capitalize">{dispute.status.replaceAll('_', ' ')}</dd></div>
            <div><dt className="font-bold text-secondary">Pre-dispute status</dt><dd className="capitalize">{dispute.preDisputeStatus.replaceAll('_', ' ')}</dd></div>
            <div><dt className="font-bold text-secondary">Opened</dt><dd>{formatDateTime(dispute.openedAt)}</dd></div>
            <div><dt className="font-bold text-secondary">Resolved</dt><dd>{dispute.resolvedAt ? formatDateTime(dispute.resolvedAt) : 'Pending'}</dd></div>
            <div><dt className="font-bold text-secondary">Resolution</dt><dd className="capitalize">{dispute.resolution?.replaceAll('_', ' ') ?? 'None'}</dd></div>
          </dl>
          {dispute.description ? <p className="mt-4 rounded-lg bg-surface-container-low p-4 text-sm">{dispute.description}</p> : null}
        </section>

        <section className="rounded-xl bg-white p-5 sm:p-7">
          <h2 className="text-xl font-bold">Financial and milestone state</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="font-bold text-secondary">Payment</dt><dd className="capitalize">{financialState.paymentStatus ?? 'Unknown'}</dd></div>
            <div><dt className="font-bold text-secondary">Refund</dt><dd className="capitalize">{financialState.refund?.status ?? 'None'}</dd></div>
            <div><dt className="font-bold text-secondary">Seller payout</dt><dd className="capitalize">{financialState.sellerPayout?.status ?? 'None'}</dd></div>
            <div><dt className="font-bold text-secondary">Milestones</dt><dd>{milestones.satisfied.length} satisfied, {milestones.outstanding.length} outstanding, {milestones.all.length} total</dd></div>
          </dl>
          <p className="mt-5 text-sm text-secondary">Provider operations can remain pending. Refresh this detail before relying on a payout or refund state.</p>
        </section>
      </div>

      <section className="rounded-xl bg-white p-5 sm:p-7">
        <h2 className="text-xl font-bold">Server-available actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{actions.map(({ action, label, available }) => <div key={action} className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4 text-sm"><strong>{label}</strong><p className="mt-1 text-secondary">{available ? 'Available for an authorized server-side recheck' : 'Unavailable in the current state'}</p></div>)}</div>
        <div className="mt-5 max-w-2xl space-y-3">
          <label htmlFor="escrow-decision-reason" className="block text-sm font-bold">Decision reason</label>
          <textarea id="escrow-decision-reason" value={reason} onChange={(event) => setReason(event.target.value)} disabled={Boolean(stepUp.challenge) || stepUp.busy} rows={3} required className="w-full rounded-lg border border-outline-variant/30 p-3 text-sm disabled:bg-surface-container-low" placeholder="Enter the reason required for this finance decision." />
          <div className="flex flex-wrap gap-2">
            {actions.filter((item) => item.available).map(({ action, label }) => <button key={action} type="button" disabled={!reason.trim() || stepUp.busy || Boolean(stepUp.challenge)} onClick={() => void beginDecision(action, label)} className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-50">{stepUp.busy ? 'Preparing secure decision...' : label}</button>)}
          </div>
        </div>
        {notice || stepUp.error ? <p role="status" className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{notice ?? stepUp.error}</p> : null}
      </section>
      <StepUpDialog challenge={stepUp.challenge} busy={stepUp.busy} error={stepUp.error} onCancel={stepUp.cancel} onSubmit={submitStepUp} />
    </main>
  </AdminLayout>;
};

export default AdminEscrowDisputeDetails;
